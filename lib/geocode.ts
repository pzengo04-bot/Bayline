import "server-only";

export type LatLng = { latitude: number; longitude: number };

/**
 * A US street address to latitude/longitude with the US Census geocoder (free, no key). Null when
 * the address isn't found or the service is down; the address itself is still saved.
 */
export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.search = new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" }).toString();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { addressMatches?: { coordinates: { x: number; y: number } }[] } };
    const c = json.result?.addressMatches?.[0]?.coordinates;
    return c ? { latitude: Math.round(c.y * 1e6) / 1e6, longitude: Math.round(c.x * 1e6) / 1e6 } : null;
  } catch {
    return null;
  }
}
