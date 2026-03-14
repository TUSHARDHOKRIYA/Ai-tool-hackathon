/**
 * Ocean data APIs — all free, no key needed except OpenUV.
 * Every function has a graceful fallback returning null on failure.
 */

export interface OceanData {
    sst: number | null;      // Sea Surface Temp °C
    ph: number | null;       // Ocean pH
    uv: number | null;       // UV Index
    dhw: number | null;      // Degree Heating Weeks
}

// ── 1. Sea Surface Temperature — NOAA ERDDAP (no key) ──────────────────────
export async function fetchSST(lat: number, lon: number): Promise<number | null> {
    try {
        const url =
            `https://coastwatch.pfeg.noaa.gov/erddap/griddap/erdHadSST.json` +
            `?sst[(last)][(${lat.toFixed(4)})][(${lon.toFixed(4)})]`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const rows = data?.table?.rows;
        if (!rows || rows.length === 0) return null;
        const val = rows[0][3];
        return typeof val === 'number' ? Math.round(val * 100) / 100 : null;
    } catch {
        return null;
    }
}

// ── 2. UV Index — OpenUV API (free tier, 50 calls/day) ─────────────────────
export async function fetchUV(lat: number, lon: number): Promise<number | null> {
    const key = import.meta.env.VITE_OPENUV_KEY;
    if (!key) return null;
    try {
        const res = await fetch(
            `https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`,
            {
                headers: { 'x-access-token': key },
                signal: AbortSignal.timeout(8000),
            }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.result?.uv ?? null;
    } catch {
        return null;
    }
}

// ── 3. Ocean pH — hardcoded global average ──────────────────────────────────
// The original NOAA ERDDAP dataset (noaa_esrl_5a7a_7844_5b74) is no longer
// available (404). We return the global ocean surface average pH of 8.05.
// This is clearly labeled in the UI so researchers know it is not site-specific.
export async function fetchPH(_lat: number, _lon: number): Promise<number | null> {
    return 8.05;
}

// ── 4. Degree Heating Weeks — NOAA Coral Reef Watch (no key) ───────────────
export async function fetchDHW(lat: number, lon: number): Promise<number | null> {
    try {
        // NOAA CRW DHW 5km product
        const url =
            `https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW_5km.json` +
            `?CRW_DHW[(last)][(${lat.toFixed(3)})][(${lon.toFixed(3)})]`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json();
        const rows = data?.table?.rows;
        if (!rows || rows.length === 0) return null;
        const val = rows[0]?.[rows[0].length - 1];
        return typeof val === 'number' ? Math.round(val * 10) / 10 : null;
    } catch {
        return null;
    }
}

// ── 5. Fetch all ocean data in parallel ────────────────────────────────────
export async function fetchAllOceanData(lat: number, lon: number): Promise<OceanData> {
    const [sst, ph, uv, dhw] = await Promise.all([
        fetchSST(lat, lon),
        fetchPH(lat, lon),
        fetchUV(lat, lon),
        fetchDHW(lat, lon),
    ]);
    return { sst, ph, uv, dhw };
}
