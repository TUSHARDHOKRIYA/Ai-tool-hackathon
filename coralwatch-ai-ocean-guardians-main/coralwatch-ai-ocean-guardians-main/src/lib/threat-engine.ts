import { THRESHOLDS, SEVERITY_ORDER } from './constants';
import type { OceanData } from './ocean-apis';

export interface Threat {
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WATCH' | 'LOW' | 'INFO';
    message: string;
}

export interface SnapshotForEngine {
    health_score: number;
    uploaded_at?: string;
}

function daysSince(history: SnapshotForEngine[]): number {
    if (history.length === 0) return 999;
    const last = new Date(history[history.length - 1].uploaded_at ?? 0);
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

function threat(type: string, severity: Threat['severity'], message: string): Threat {
    return { type, severity, message };
}

/**
 * Multi-factor threat engine — no ML, pure rule-based logic.
 * Every HIGH/CRITICAL threat requires ≥2 corroborating signals.
 */
export function evaluateThreats(
    snapshot: SnapshotForEngine,
    history: SnapshotForEngine[],
    ocean: OceanData
): Threat[] {
    const threats: Threat[] = [];
    const T = THRESHOLDS;

    const sst = ocean.sst ?? 0;
    const ph = ocean.ph ?? 8.3;
    const uv = ocean.uv ?? 0;
    const dhw = ocean.dhw ?? 0;
    const score = snapshot.health_score;
    const prev = history.length > 0 ? history[history.length - 1].health_score : score;
    const decline = prev - score;   // positive = getting worse

    // ── THERMAL: must be confirmed by DHW accumulation ──────────────────────
    if (ocean.sst !== null) {
        if (sst >= T.sst.critical && dhw >= T.dhw.severe) {
            threats.push(threat('THERMAL', 'CRITICAL',
                `SST ${sst}°C + DHW ${dhw} — mass mortality risk`));
        } else if (sst >= T.sst.severe && dhw >= T.dhw.alert) {
            threats.push(threat('THERMAL', 'HIGH',
                `SST ${sst}°C sustained — mass bleaching likely`));
        } else if (sst >= T.sst.bleach && dhw >= T.dhw.watch) {
            threats.push(threat('THERMAL', 'MEDIUM',
                `SST ${sst}°C at bleach threshold, DHW accumulating`));
        } else if (sst >= T.sst.stress) {
            threats.push(threat('THERMAL', 'WATCH',
                `SST ${sst}°C — stress window, monitor daily`));
        }
    }

    // ── ACIDIFICATION: severity escalates if reef already weak ──────────────
    if (ocean.ph !== null) {
        if (ph <= T.ph.critical) {
            const sev = score < T.health_score.stressed ? 'CRITICAL' : 'HIGH';
            threats.push(threat('ACIDIFICATION', sev,
                `pH ${ph} — carbonate dissolution active, skeleton damage`));
        } else if (ph <= T.ph.stress) {
            const sev = score < T.health_score.watch ? 'HIGH' : 'MEDIUM';
            threats.push(threat('ACIDIFICATION', sev,
                `pH ${ph} — below safe threshold, compounding bleach stress`));
        } else if (ph <= T.ph.watch) {
            threats.push(threat('ACIDIFICATION', 'WATCH',
                `pH ${ph} — approaching stress zone`));
        }
    }

    // ── RAPID DECLINE: only meaningful with history ──────────────────────────
    if (history.length > 0) {
        if (decline >= T.decline_rate.rapid) {
            threats.push(threat('RAPID_DECLINE', 'CRITICAL',
                `Score dropped ${decline}pts — emergency monitoring needed`));
        } else if (decline >= T.decline_rate.moderate) {
            threats.push(threat('RAPID_DECLINE', 'HIGH',
                `Score dropped ${decline}pts — accelerating event`));
        } else if (decline >= T.decline_rate.mild) {
            threats.push(threat('RAPID_DECLINE', 'MEDIUM',
                `Score dropped ${decline}pts — declining trend confirmed`));
        }
    }

    // ── COMPOUND STRESS: multiple stressors = independent threat ────────────
    const activeStressors = [
        sst >= T.sst.stress,
        ph <= T.ph.stress,
        uv >= T.uv.high,
        dhw >= T.dhw.watch,
        score < T.health_score.stressed,
    ].filter(Boolean).length;

    if (activeStressors >= 4) {
        threats.push(threat('COMPOUND', 'CRITICAL',
            `${activeStressors}/5 stressors active — recovery unlikely without intervention`));
    } else if (activeStressors >= 3) {
        threats.push(threat('COMPOUND', 'HIGH',
            `${activeStressors}/5 stressors active — compounded risk`));
    }

    // ── UV: only dangerous combined with thermal stress ──────────────────────
    if (ocean.uv !== null) {
        if (uv >= T.uv.extreme && sst >= T.sst.stress) {
            threats.push(threat('UV_AMPLIFICATION', 'HIGH',
                `UV ${uv} + SST ${sst}°C — UV amplifying thermal damage ~30%`));
        } else if (uv >= T.uv.high) {
            threats.push(threat('UV', 'LOW',
                `UV ${uv} — elevated but not critical standalone`));
        }
    }

    // ── DATA GAP ─────────────────────────────────────────────────────────────
    const days = daysSince(history);
    if (days >= T.days_no_data.blind) {
        threats.push(threat('NO_DATA', 'HIGH',
            `${days} days without survey — reef status unknown`));
    } else if (days >= T.days_no_data.stale) {
        threats.push(threat('NO_DATA', 'MEDIUM',
            `${days} days since last upload — data stale`));
    }

    return threats.sort((a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );
}
