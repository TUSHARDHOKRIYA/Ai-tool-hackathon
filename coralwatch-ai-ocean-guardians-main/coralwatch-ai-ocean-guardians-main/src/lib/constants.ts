// ================================================================
// Single source of truth for ALL thresholds — v3 Reef Platform
// ================================================================

export const THRESHOLDS = {
    sst: {
        baseline: 28.0,  // healthy max for most coral species
        watch: 28.5,  // begin monitoring
        stress: 29.0,  // thermal stress begins
        bleach: 29.5,  // NOAA standard bleaching threshold
        severe: 30.5,  // mass bleaching likely
        critical: 31.5,  // mortality risk
    },
    ph: {
        healthy: 8.3,
        watch: 8.1,
        stress: 7.9,
        critical: 7.75,
    },
    uv: { low: 3, moderate: 6, high: 8, extreme: 11 },
    dhw: {
        watch: 0,  // begin heat stress accumulation
        alert: 4,  // bleaching likely (NOAA standard)
        severe: 8,  // mass bleaching / mortality
    },
    health_score: {
        healthy: 75,
        watch: 55,
        stressed: 40,
        bleached: 25,
        critical: 10,
    },
    decline_rate: { mild: 10, moderate: 20, rapid: 30 },
    days_no_data: { stale: 30, blind: 60 },
} as const;

// Severity stage → color mapping
export const STAGE_CONFIG = {
    'Healthy': {
        color: '#22c55e',    // green-500
        bgColor: 'bg-green-500',
        textColor: 'text-green-600',
        badge: '🟢',
        mapColor: '#22c55e',
    },
    'Early Thermal Stress': {
        color: '#eab308',    // yellow-500
        bgColor: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        badge: '🟡',
        mapColor: '#eab308',
    },
    'Partial Bleaching': {
        color: '#f97316',    // orange-500
        bgColor: 'bg-orange-500',
        textColor: 'text-orange-600',
        badge: '🟠',
        mapColor: '#f97316',
    },
    'Severe Bleaching': {
        color: '#ef4444',    // red-500
        bgColor: 'bg-red-500',
        textColor: 'text-red-600',
        badge: '🔴',
        mapColor: '#ef4444',
    },
    'Critical / Mortality Risk': {
        color: '#1f2937',    // gray-800 (black)
        bgColor: 'bg-gray-800',
        textColor: 'text-gray-900',
        badge: '⚫',
        mapColor: '#1f2937',
    },
} as const;

export type BleachStage = keyof typeof STAGE_CONFIG;

export const SEVERITY_ORDER: Record<string, number> = {
    CRITICAL: 0, HIGH: 1, MEDIUM: 2, WATCH: 3, LOW: 4, INFO: 5,
};

// Map health score (0–100) to map circle color
export function scoreToColor(score: number): string {
    if (score >= 75) return '#22c55e';  // green
    if (score >= 55) return '#eab308';  // yellow
    if (score >= 30) return '#f97316';  // orange
    if (score >= 10) return '#ef4444';  // red
    return '#1f2937';                    // black
}
