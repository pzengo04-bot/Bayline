// Gives an email platform-admin access (creates the login if needed). Usage: npm run make-admin -- you@example.com
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

async function findUser(address) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address);
    if (hit || data.users.length < 200) return hit;
  }
}

let user = await findUser(email);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  user = data.user;
  console.log(`Created login for ${email}`);
}
const { error } = await admin.from("platform_admins").upsert({ user_id: user.id });
if (error) throw error;
console.log(`${email} is now a platform admin. Log in at /login.`);
