// Sample data for the /demo page: a fictional 4-bay golf simulator venue.
// Everything is generated from a fixed seed, so server and client always agree
// and the demo looks the same on every load. The shapes below are meant to map
// one-to-one onto future database tables (customers, bookings, campaigns).

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string; // "(555) 201-4417"
  joinedOn: string; // ISO date
  smsOptIn: boolean;
};

export type Booking = {
  id: string;
  customerId: string | null; // null = walk-in / non-member booking
  date: string; // ISO date
  startHour: number; // 24h clock, e.g. 18 = 6pm
  hours: number;
  bay: number; // 1–4
  amount: number; // dollars actually paid
  rewardRedeemed: boolean; // a free bay hour was applied
};

export type Campaign = {
  id: string;
  name: string;
  sentOn: string;
  sentTo: number;
  returned: number;
  bookingsRevenue: number;
};

export const venue = {
  name: "Fairway Lounge",
  bays: 4,
  openHour: 10, // first bookable slot
  closeHour: 23, // venue closes; last slot starts at 22
  visitsPerReward: 5,
  rewardLabel: "free bay hour",
};

// The "today" the demo is anchored to. Fixed so the data never drifts.
export const REFERENCE_DATE = "2026-10-20";
const WINDOW_DAYS = 182; // ~6 months of history

// ---------- seeded helpers ----------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261020);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DAY_MS = 86_400_000;
const refTime = Date.parse(`${REFERENCE_DATE}T00:00:00Z`);

/** ISO date for N days before the reference date. */
export function daysAgo(n: number) {
  return new Date(refTime - n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days between an ISO date and the reference date. */
export function daysSince(iso: string) {
  return Math.round((refTime - Date.parse(`${iso}T00:00:00Z`)) / DAY_MS);
}

/** 0 = Monday … 6 = Sunday */
export function dayOfWeek(iso: string) {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

// ---------- demand curve ----------

// Share of bays booked, by day of week (Mon–Sun) and hour (10:00–22:00).
// Busy weekday evenings and weekends, near-empty weekday afternoons.
const H = (...v: number[]) => v;
//                 10    11    12    13    14    15    16    17    18    19    20    21    22
const DEMAND = [
  /* Mon */ H(0.12, 0.15, 0.28, 0.24, 0.10, 0.09, 0.14, 0.45, 0.82, 0.88, 0.80, 0.55, 0.30),
  /* Tue */ H(0.10, 0.14, 0.26, 0.20, 0.05, 0.04, 0.06, 0.48, 0.86, 0.92, 0.85, 0.60, 0.32),
  /* Wed */ H(0.12, 0.15, 0.27, 0.22, 0.08, 0.07, 0.11, 0.50, 0.88, 0.93, 0.86, 0.62, 0.35),
  /* Thu */ H(0.14, 0.17, 0.30, 0.25, 0.11, 0.10, 0.16, 0.58, 0.92, 0.96, 0.90, 0.70, 0.42),
  /* Fri */ H(0.18, 0.22, 0.35, 0.30, 0.20, 0.22, 0.34, 0.75, 0.96, 0.98, 0.95, 0.85, 0.65),
  /* Sat */ H(0.55, 0.78, 0.88, 0.92, 0.94, 0.92, 0.90, 0.88, 0.94, 0.96, 0.90, 0.75, 0.55),
  /* Sun */ H(0.62, 0.82, 0.90, 0.92, 0.88, 0.84, 0.75, 0.62, 0.55, 0.45, 0.34, 0.20, 0.10),
];

/** Hourly bay rate. Weekday daytime is cheapest; bay 4 is the premium lounge bay. */
export function hourlyRate(dow: number, hour: number, bay: number) {
  const weekend = dow >= 5 || (dow === 4 && hour >= 16);
  const base = weekend ? 90 : hour >= 16 ? 75 : 45;
  return base + (bay === 4 ? 30 : 0);
}

// ---------- names ----------

const FIRST = [
  "James", "Olivia", "Daniel", "Sophia", "Chris", "Emma", "Ryan", "Ava", "Kevin", "Mia",
  "Jason", "Isabella", "Brian", "Grace", "Tyler", "Chloe", "Matt", "Lily", "Eric", "Zoe",
  "Steve", "Hannah", "Josh", "Natalie", "Andrew", "Rachel", "Derek", "Megan", "Tony", "Lauren",
  "Marcus", "Priya", "Luis", "Aisha", "Ben", "Kim", "Sam", "Nina", "Greg", "Tess",
  "Omar", "Jenna", "Raj", "Carmen", "Alex", "Dana", "Jordan", "Erin", "Nate", "Maya",
] as const;
const LAST = [
  "Carter", "Nguyen", "Patel", "Brooks", "Garcia", "Kim", "Murphy", "Rossi", "Bennett", "Chen",
  "Hughes", "Lopez", "Foster", "Shah", "Price", "Ward", "Okafor", "Bell", "Diaz", "Russo",
  "Kelly", "Park", "Sullivan", "Reed", "Morales", "Grant", "Fischer", "Hayes", "Silva", "Cole",
] as const;

// ---------- generation ----------

const customers: Customer[] = [];
const bookings: Booking[] = [];

// "date|hour" -> bays already taken in that slot
const occupancy = new Map<string, number[]>();
const bayTaken = (date: string, hour: number) => {
  const key = `${date}|${hour}`;
  if (!occupancy.has(key)) occupancy.set(key, []);
  return occupancy.get(key)!;
};

/** Hour weights for a member's visit on a given day, following the demand curve. */
function pickHour(dow: number) {
  const row = DEMAND[dow];
  const total = row.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < row.length; i++) {
    r -= row[i];
    if (r <= 0) return venue.openHour + i;
  }
  return venue.closeHour - 1;
}

function freeBay(date: string, start: number, hours: number) {
  const bays = [1, 2, 3, 4].sort(() => rand() - 0.5);
  return bays.find((b) =>
    Array.from({ length: hours }, (_, i) => start + i).every(
      (h) => h < venue.closeHour && !bayTaken(date, h).includes(b),
    ),
  );
}

let bookingSeq = 0;
function addBooking(customerId: string | null, date: string, start: number, hours: number, bay: number, redeem: boolean) {
  const dow = dayOfWeek(date);
  let amount = 0;
  for (let h = start; h < start + hours; h++) {
    bayTaken(date, h).push(bay);
    amount += hourlyRate(dow, h, bay);
  }
  if (redeem) amount -= hourlyRate(dow, start, bay); // free bay hour
  bookings.push({
    id: `b${++bookingSeq}`,
    customerId,
    date,
    startHour: start,
    hours,
    bay,
    amount,
    rewardRedeemed: redeem,
  });
}

/** Place a member visit on or near the given day; returns false if the day is full. */
function placeVisit(customerId: string, offset: number, visitNumber: number) {
  const date = daysAgo(offset);
  const dow = dayOfWeek(date);
  for (let attempt = 0; attempt < 12; attempt++) {
    const hours = rand() < 0.6 ? 1 : rand() < 0.88 ? 2 : 3;
    const start = Math.min(pickHour(dow), venue.closeHour - hours);
    const bay = freeBay(date, start, hours);
    if (bay) {
      addBooking(customerId, date, start, hours, bay, visitNumber % venue.visitsPerReward === 0);
      return true;
    }
  }
  return false;
}

function makeCustomer(i: number, overrides: Partial<Customer> = {}): Customer {
  const id = `c${String(i + 1).padStart(3, "0")}`;
  const c: Customer = {
    id,
    firstName: FIRST[(i * 7) % FIRST.length],
    lastName: LAST[(i * 11 + Math.floor(i / FIRST.length)) % LAST.length],
    phone: `(555) ${randInt(201, 989)}-${String(randInt(1000, 9999))}`,
    joinedOn: daysAgo(randInt(0, 1) ? randInt(WINDOW_DAYS, 540) : randInt(30, WINDOW_DAYS)),
    smsOptIn: rand() < 0.82,
    ...overrides,
  };
  customers.push(c);
  return c;
}

/** Walk forward from `startOffset` toward `endOffset` every ~cadence days, placing visits. */
function visitOnCadence(c: Customer, startOffset: number, endOffset: number, cadence: number) {
  let n = 0;
  for (let off = startOffset; off >= endOffset; off -= Math.max(2, cadence + randInt(-2, 3))) {
    if (placeVisit(c.id, off, n + 1)) n++;
  }
  return n;
}

// Mike is the scripted customer for the phone check-in demo: 12 past visits,
// so today's check-in makes it "3 of 5 visits".
const mike = makeCustomer(0, {
  firstName: "Mike",
  lastName: "Reynolds",
  phone: "(555) 201-4417",
  joinedOn: daysAgo(170),
  smsOptIn: false,
});
for (let k = 0, off = 166; k < 12; k++, off -= 14) placeVisit(mike.id, off, k + 1);

// 29 more active regulars: come every 4–11 days, seen in the last two weeks.
for (let i = 1; i < 30; i++) {
  const c = makeCustomer(i);
  const start = Math.min(WINDOW_DAYS, daysSince(c.joinedOn));
  const visits = visitOnCadence(c, start, randInt(3, 10), randInt(4, 11));
  placeVisit(c.id, randInt(1, 6), visits + 1); // make sure they're recently active
}

// 20 regulars who've gone quiet: used to come weekly-ish, stopped 3–10 weeks ago.
// 18 of them opted in to texts.
for (let i = 30; i < 50; i++) {
  const c = makeCustomer(i, { smsOptIn: i < 48 });
  const start = Math.min(WINDOW_DAYS, Math.max(110, daysSince(c.joinedOn)));
  visitOnCadence(c, start, randInt(22, 70), randInt(5, 10));
}

// 100 occasional customers: 1–5 visits scattered across the window.
for (let i = 50; i < 150; i++) {
  const c = makeCustomer(i);
  const span = Math.min(WINDOW_DAYS, daysSince(c.joinedOn));
  const count = rand() < 0.3 ? 1 : randInt(2, 5);
  const offsets = Array.from({ length: count }, () => randInt(1, Math.max(1, span))).sort((a, b) => b - a);
  offsets.forEach((off, k) => placeVisit(c.id, off, k + 1));
}

// Walk-in and non-member bookings fill the bays up to the demand curve.
for (let off = WINDOW_DAYS; off >= 1; off--) {
  const date = daysAgo(off);
  const dow = dayOfWeek(date);
  for (let h = venue.openHour; h < venue.closeHour; h++) {
    const target = DEMAND[dow][h - venue.openHour];
    let desired = 0;
    for (let b = 0; b < venue.bays; b++) if (rand() < target) desired++;
    let missing = desired - bayTaken(date, h).length;
    while (missing-- > 0) {
      const bay = freeBay(date, h, 1);
      if (bay) addBooking(null, date, h, 1, bay, false);
    }
  }
}

bookings.sort((a, b) => (a.date === b.date ? a.startHour - b.startHour : a.date < b.date ? -1 : 1));

export const campaigns: Campaign[] = [
  {
    id: "cmp1",
    name: "Win-back offer",
    sentOn: "2026-09-14",
    sentTo: 22,
    returned: 14,
    bookingsRevenue: 1120,
  },
];

export const demoCustomers: readonly Customer[] = customers;
export const demoBookings: readonly Booking[] = bookings;
export const SAMPLE_PHONE = mike.phone;
