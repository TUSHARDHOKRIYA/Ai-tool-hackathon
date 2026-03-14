-- Seed data for Reef Dashboard V3
BEGIN;

-- Common UUIDs for consistency between reefs and snapshots
DO $$
DECLARE
    gtr1_id uuid := gen_random_uuid();
    fknms_id uuid := gen_random_uuid();
    palau_id uuid := gen_random_uuid();
    maldive_id uuid := gen_random_uuid();
    belize_id uuid := gen_random_uuid();
    hawaii_id uuid := gen_random_uuid();
BEGIN
    -- 1. Insert 6 sample reefs spanning different locations and health statuses
    INSERT INTO reefs (reef_id, reef_name, location) VALUES
    (gtr1_id, 'Great Barrier Reef - Agincourt (Node Alpha)', ST_SetSRID(ST_MakePoint(145.83, -15.98), 4326)),
    (fknms_id, 'Florida Keys NMS - Sombrero Reef', ST_SetSRID(ST_MakePoint(-81.11, 24.63), 4326)),
    (palau_id, 'Palau Rock Islands - Ulong Channel', ST_SetSRID(ST_MakePoint(134.28, 7.28), 4326)),
    (maldive_id, 'Maldives North Male Atoll', ST_SetSRID(ST_MakePoint(73.50, 4.30), 4326)),
    (belize_id, 'Belize Barrier Reef - Lighthouse Atoll', ST_SetSRID(ST_MakePoint(-87.55, 17.26), 4326)),
    (hawaii_id, 'Hawaii - Kaneohe Bay Research Station', ST_SetSRID(ST_MakePoint(-157.78, 21.43), 4326));

    -- 2. Insert Snapshots for varying health levels to trigger different dashboard indicators
    
    -- GTR - Healthy (Control site)
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (gtr1_id, 88, 'Healthy', 0.12, 28.1, 8.21, 5, 0, '[]', 'Dr. Ayana Elizabeth', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/healthy_coral_1.jpg');

    -- Palau - Healthy but high UV
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (palau_id, 76, 'Healthy', 0.24, 28.5, 8.15, 9, 1, '[{"type":"UV","severity":"LOW","message":"UV 9 \u2014 elevated but not critical standalone"}]', 'Palau Int. Coral Reef Center', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/healthy_coral_2.jpg');

    -- Maldives - Early Thermal Stress
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (maldive_id, 60, 'Early Thermal Stress', 0.40, 29.2, 8.10, 7, 3, '[{"type":"THERMAL","severity":"WATCH","message":"SST 29.2C \u2014 stress window, monitor daily"}]', 'Maldive Marine Inst.', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/stressed_coral_1.jpg');

    -- Florida Keys - Partial Bleaching / Moderate Threat
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (fknms_id, 45, 'Partial Bleaching', 0.65, 29.9, 7.95, 8, 5, '[{"type":"THERMAL","severity":"MEDIUM","message":"SST 29.9C at bleach threshold, DHW accumulating"}]', 'NOAA FKNMS', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/bleached_coral_1.jpg');

    -- Belize - Severe Bleaching (Compound Stress)
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (belize_id, 22, 'Severe Bleaching', 0.85, 30.6, 7.85, 10, 6, '[{"type":"THERMAL","severity":"HIGH","message":"SST 30.6C sustained \u2014 mass bleaching likely"}, {"type":"UV_AMPLIFICATION","severity":"HIGH","message":"UV 10 + SST 30.6C \u2014 UV amplifying thermal damage"}]', 'Belize Audubon Society', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/bleached_coral_2.jpg');

    -- Hawaii - Critical Mortality Risk
    INSERT INTO reef_snapshots (reef_id, health_score, bleach_stage, bleach_confidence, sst_celsius, ocean_ph, uv_index, dhw, threats, uploaded_by, image_url)
    VALUES (hawaii_id, 8, 'Critical / Mortality Risk', 0.95, 31.8, 7.70, 11, 9, '[{"type":"THERMAL","severity":"CRITICAL","message":"SST 31.8C + DHW 9 \u2014 mass mortality risk"}, {"type":"ACIDIFICATION","severity":"CRITICAL","message":"pH 7.70 \u2014 carbonate dissolution active"}]', 'Univ of Hawaii', 'https://res.cloudinary.com/dpk81zftt/image/upload/v1711204000/dead_coral_1.jpg');

END $$;
COMMIT;
