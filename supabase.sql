-- ============================================================
-- Reef Intelligence Platform — Full Supabase Schema
-- Paste this into the SQL Editor in your Supabase Dashboard
-- ============================================================

-- 1. Enable PostGIS extension (for geographic queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Reefs table
CREATE TABLE IF NOT EXISTS reefs (
  reef_id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reef_name text NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Reef Snapshots table (one row per upload/analysis)
CREATE TABLE IF NOT EXISTS reef_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reef_id uuid REFERENCES reefs(reef_id) ON DELETE CASCADE NOT NULL,
  captured_at timestamptz,
  uploaded_at timestamptz DEFAULT now(),
  health_score integer NOT NULL,
  bleach_stage text,
  bleach_confidence double precision,
  sst_celsius double precision,
  ocean_ph double precision,
  uv_index double precision,
  dhw double precision,
  threats jsonb DEFAULT '[]',
  image_url text,
  lat double precision,
  lon double precision
);

-- 4. Debris Events table (for marine debris detection)
CREATE TABLE IF NOT EXISTS debris_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  total_debris integer NOT NULL,
  by_class jsonb NOT NULL DEFAULT '{}',
  avg_confidence double precision,
  image_url text,
  detected_at timestamptz DEFAULT now()
);

-- 5. PostGIS function: find nearest reef within a radius
-- Drop first to avoid return-type conflicts if it already exists
DROP FUNCTION IF EXISTS find_nearest_reef(double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION find_nearest_reef(
  p_lat double precision,
  p_lon double precision,
  p_radius_m double precision DEFAULT 2000
)
RETURNS SETOF reefs
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM reefs
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_radius_m
  )
  ORDER BY location <-> ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
  LIMIT 1;
$$;

-- 6. Row Level Security (allow all for anon key — tighten for production)
ALTER TABLE reefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reef_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE debris_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on reefs') THEN
    CREATE POLICY "Allow all on reefs" ON reefs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on reef_snapshots') THEN
    CREATE POLICY "Allow all on reef_snapshots" ON reef_snapshots FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on debris_events') THEN
    CREATE POLICY "Allow all on debris_events" ON debris_events FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
