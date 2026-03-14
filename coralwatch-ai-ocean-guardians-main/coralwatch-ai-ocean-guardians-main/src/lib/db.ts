/**
 * Supabase DB helpers — reef and snapshot CRUD + PostGIS geo-queries.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import type { Threat } from './threat-engine';

// ── Types ──────────────────────────────────────────────────────────────────
export interface Reef {
    reef_id: string;
    reef_name: string;
    location: unknown;  // PostGIS geography
    created_at: string;
    lat?: number;
    lon?: number;
    // Joined from latest snapshot:
    latest_health_score?: number | null;
    latest_bleach_stage?: string | null;
    latest_uploaded_at?: string | null;
    snapshot_count?: number;
}

export interface ReefSnapshot {
    id: string;
    reef_id: string;
    captured_at: string | null;
    uploaded_at: string;
    health_score: number;
    bleach_stage: string;
    bleach_confidence: number;
    sst_celsius: number | null;
    ocean_ph: number | null;
    uv_index: number | null;
    dhw: number | null;
    threats: Threat[] | null;
    image_url: string | null;
    lat: number | null;
    lon: number | null;
}

export interface SaveSnapshotInput {
    lat: number;
    lon: number;
    health_score: number;
    bleach_stage: string;
    bleach_confidence: number;
    sst_celsius?: number | null;
    ocean_ph?: number | null;
    uv_index?: number | null;
    dhw?: number | null;
    threats?: Threat[];
    image_url?: string | null;
}

// ── Find nearest reef within 2 km (PostGIS) ───────────────────────────────
export async function findNearestReef(lat: number, lon: number): Promise<Reef | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.rpc('find_nearest_reef', {
        p_lat: lat,
        p_lon: lon,
        p_radius_m: 2000,
    });
    if (error || !data || data.length === 0) return null;
    return data[0] as Reef;
}

// ── Create a new reef zone ─────────────────────────────────────────────────
export async function createReef(name: string, lat: number, lon: number): Promise<Reef | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
        .from('reefs')
        .insert({
            reef_name: name,
            location: `SRID=4326;POINT(${lon} ${lat})`,
        })
        .select()
        .single();
    if (error) {
        console.error('createReef error:', error.message);
        return null;
    }
    return data as Reef;
}

// ── Save a snapshot (full pipeline result) ─────────────────────────────────
export async function saveSnapshot(
    input: SaveSnapshotInput
): Promise<ReefSnapshot | null> {
    if (!isSupabaseConfigured) return null;

    // 1. Find or create reef for these coordinates
    let reef = await findNearestReef(input.lat, input.lon);
    if (!reef) {
        reef = await createReef(
            `Reef at ${input.lat.toFixed(3)}, ${input.lon.toFixed(3)}`,
            input.lat,
            input.lon
        );
    }
    if (!reef) return null;

    // 2. Insert snapshot
    const { data, error } = await supabase
        .from('reef_snapshots')
        .insert({
            reef_id: reef.reef_id,
            captured_at: new Date().toISOString(),
            health_score: input.health_score,
            bleach_stage: input.bleach_stage,
            bleach_confidence: input.bleach_confidence,
            sst_celsius: input.sst_celsius ?? null,
            ocean_ph: input.ocean_ph ?? null,
            uv_index: input.uv_index ?? null,
            dhw: input.dhw ?? null,
            threats: input.threats ?? [],
            image_url: input.image_url ?? null,
            lat: input.lat,
            lon: input.lon,
        })
        .select()
        .single();

    if (error) {
        console.error('saveSnapshot error:', error.message);
        return null;
    }
    return data as ReefSnapshot;
}

// ── Get reef history ───────────────────────────────────────────────────────
export async function getReefHistory(reefId: string): Promise<ReefSnapshot[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
        .from('reef_snapshots')
        .select('*')
        .eq('reef_id', reefId)
        .order('uploaded_at', { ascending: true });
    if (error) return [];
    return (data ?? []) as ReefSnapshot[];
}

// ── Get all reefs with their latest snapshot ───────────────────────────────
export async function getAllReefs(): Promise<Reef[]> {
    if (!isSupabaseConfigured) return [];
    // Supabase doesn't support DISTINCT ON directly, so we use a view approach:
    const { data, error } = await supabase
        .from('reefs')
        .select(`
      reef_id, reef_name, created_at,
      reef_snapshots!inner(
        health_score, bleach_stage, uploaded_at, lat, lon
      )
    `)
        .order('uploaded_at', { referencedTable: 'reef_snapshots', ascending: false });

    if (error || !data) return [];

    // De-dupe: one entry per reef, pick latest snapshot
    const seen = new Set<string>();
    const reefs: Reef[] = [];
    for (const row of data as any[]) {
        if (seen.has(row.reef_id)) continue;
        seen.add(row.reef_id);
        const snap = row.reef_snapshots?.[0];
        reefs.push({
            reef_id: row.reef_id,
            reef_name: row.reef_name,
            location: null,
            created_at: row.created_at,
            lat: snap?.lat,
            lon: snap?.lon,
            latest_health_score: snap?.health_score,
            latest_bleach_stage: snap?.bleach_stage,
            latest_uploaded_at: snap?.uploaded_at,
        });
    }
    return reefs;
}

// ── Get a single reef by ID ────────────────────────────────────────────────
export async function getReefById(reefId: string): Promise<Reef | null> {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase
        .from('reefs')
        .select('*')
        .eq('reef_id', reefId)
        .single();
    if (error) return null;
    return data as Reef;
}

// ── Debris Event persistence ───────────────────────────────────────────────
export interface DebrisEventInput {
    lat: number;
    lon: number;
    total_debris: number;
    by_class: Record<string, number>;
    avg_confidence: number;
    image_url?: string | null;
}

/**
 * Save a debris detection event to the `debris_events` table.
 * The table must exist in Supabase — see the SQL comment below.
 *
 * CREATE TABLE debris_events (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   lat double precision NOT NULL,
 *   lon double precision NOT NULL,
 *   total_debris integer NOT NULL,
 *   by_class jsonb NOT NULL DEFAULT '{}',
 *   avg_confidence double precision,
 *   image_url text,
 *   detected_at timestamptz DEFAULT now()
 * );
 */
export async function saveDebrisEvent(input: DebrisEventInput): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const { error } = await supabase
        .from('debris_events')
        .insert({
            lat: input.lat,
            lon: input.lon,
            total_debris: input.total_debris,
            by_class: input.by_class,
            avg_confidence: input.avg_confidence,
            image_url: input.image_url ?? null,
        });
    if (error) {
        console.error('saveDebrisEvent error:', error.message);
        return false;
    }
    return true;
}
