import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildApplePass } from "@/lib/wallet/apple";
import { appleConfig } from "@/lib/wallet/config";
import { getPassData, getVoidedPass, markWalletPlatform } from "@/lib/wallet/data";

// Apple Wallet web service (developer.apple.com: "Wallet Passes > Updating a pass").
//   POST   v1/devices/{device}/registrations/{passType}/{serial}   register for updates
//   GET    v1/devices/{device}/registrations/{passType}             which passes changed
//   DELETE v1/devices/{device}/registrations/{passType}/{serial}   unregister
//   GET    v1/passes/{passType}/{serial}                            latest pass
//   POST   v1/log                                                   device error logs

type Ctx = { params: Promise<{ path: string[] }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks "Authorization: ApplePass <token>" against the pass's token. */
async function authorized(request: NextRequest, serial: string) {
  if (!UUID.test(serial)) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^ApplePass\s+/i, "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data } = await admin.from("customers").select("apple_auth_token").eq("pass_serial", serial).maybeSingle();
  if (data) return data.apple_auth_token === token;
  const { data: voided } = await admin.from("voided_passes").select("apple_auth_token").eq("serial", serial).maybeSingle();
  return Boolean(voided && voided.apple_auth_token === token);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const path = (await params).path;
  const cfg = appleConfig();

  if (path[0] === "log") {
    const body = await request.json().catch(() => ({}));
    console.warn("Apple Wallet log", JSON.stringify(body).slice(0, 2000));
    return new NextResponse(null, { status: 200 });
  }

  // devices/{device}/registrations/{passType}/{serial}
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 5) {
    const [, device, , passType, serial] = path;
    if (!cfg || passType !== cfg.passTypeId) return new NextResponse(null, { status: 404 });
    if (!(await authorized(request, serial))) return new NextResponse(null, { status: 401 });
    const { pushToken } = (await request.json().catch(() => ({}))) as { pushToken?: string };
    if (!pushToken) return new NextResponse(null, { status: 400 });

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("apple_registrations")
      .select("device_library_id")
      .match({ device_library_id: device, pass_type_id: passType, serial_number: serial })
      .maybeSingle();
    const { error } = await admin
      .from("apple_registrations")
      .upsert({ device_library_id: device, pass_type_id: passType, serial_number: serial, push_token: pushToken });
    if (error) return new NextResponse(null, { status: 500 });
    await markWalletPlatform(serial, "apple");
    return new NextResponse(null, { status: existing ? 200 : 201 });
  }
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const path = (await params).path;
  const cfg = appleConfig();
  if (!cfg) return new NextResponse(null, { status: 404 });

  // devices/{device}/registrations/{passType}?passesUpdatedSince=tag
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 4) {
    const [, device, , passType] = path;
    if (passType !== cfg.passTypeId) return new NextResponse(null, { status: 404 });
    // Our tag is a UTC timestamp; a "+" offset can arrive as a space if it wasn't URL-encoded.
    const since = request.nextUrl.searchParams.get("passesUpdatedSince")?.replace(" ", "+");
    const admin = createAdminClient();
    const { data: regs } = await admin
      .from("apple_registrations")
      .select("serial_number")
      .match({ device_library_id: device, pass_type_id: passType });
    const serials = (regs ?? []).map((r) => r.serial_number as string);
    if (serials.length === 0) return new NextResponse(null, { status: 204 });

    const sinceOk = since && !Number.isNaN(Date.parse(since));
    let query = admin.from("customers").select("pass_serial, pass_updated_at").in("pass_serial", serials);
    if (sinceOk) query = query.gt("pass_updated_at", since);
    let voidedQuery = admin.from("voided_passes").select("serial, voided_at").in("serial", serials);
    if (sinceOk) voidedQuery = voidedQuery.gt("voided_at", since);
    const [{ data: live }, { data: voided }] = await Promise.all([query, voidedQuery]);
    const changed = [
      ...(live ?? []),
      ...(voided ?? []).map((v) => ({ pass_serial: v.serial, pass_updated_at: v.voided_at })),
    ];
    if (!changed?.length) return new NextResponse(null, { status: 204 });
    // Microsecond UTC timestamp with "Z" (no "+"), so the tag survives being put in a URL.
    const lastUpdated = changed
      .map((c) => (c.pass_updated_at as string).replace(/\+00(:00)?$/, "Z"))
      .sort()
      .at(-1)!;
    return NextResponse.json({ serialNumbers: changed.map((c) => c.pass_serial), lastUpdated });
  }

  // passes/{passType}/{serial}
  if (path[0] === "passes" && path.length === 3) {
    const [, passType, serial] = path;
    if (passType !== cfg.passTypeId) return new NextResponse(null, { status: 404 });
    if (!(await authorized(request, serial))) return new NextResponse(null, { status: 401 });
    const data = (await getPassData(serial)) ?? (await getVoidedPass(serial));
    if (!data) return new NextResponse(null, { status: 404 });

    const modified = new Date(data.updated_at);
    const ifModifiedSince = request.headers.get("if-modified-since");
    // HTTP dates have 1-second precision; compare at that resolution.
    if (ifModifiedSince && Math.floor(modified.getTime() / 1000) <= Math.floor(Date.parse(ifModifiedSince) / 1000)) {
      return new NextResponse(null, { status: 304 });
    }
    const pkpass = await buildApplePass(data, { voided: "voided" in data });
    return new NextResponse(new Uint8Array(pkpass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Last-Modified": modified.toUTCString(),
        "Cache-Control": "no-store",
      },
    });
  }
  return new NextResponse(null, { status: 404 });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const path = (await params).path;
  const cfg = appleConfig();
  if (path[0] === "devices" && path[2] === "registrations" && path.length === 5) {
    const [, device, , passType, serial] = path;
    if (!cfg || passType !== cfg.passTypeId) return new NextResponse(null, { status: 404 });
    if (!(await authorized(request, serial))) return new NextResponse(null, { status: 401 });
    await createAdminClient()
      .from("apple_registrations")
      .delete()
      .match({ device_library_id: device, pass_type_id: passType, serial_number: serial });
    return new NextResponse(null, { status: 200 });
  }
  return new NextResponse(null, { status: 404 });
}
