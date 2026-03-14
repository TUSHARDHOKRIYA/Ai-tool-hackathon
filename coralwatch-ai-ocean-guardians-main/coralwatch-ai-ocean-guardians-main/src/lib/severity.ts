import { STAGE_CONFIG, type BleachStage } from './constants';

export interface SeverityResult {
    health_score: number;   // 0–100
    bleach_stage: BleachStage;
    color: string;
    badge: string;
}

/**
 * Convert ResNet bleach_confidence probability → health score + stage.
 * No retraining needed — the confidence IS the severity.
 *
 * bleach_conf: probability that the coral is bleached (0.0–1.0)
 * is_bleached: whether ResNet predicted "bleached_corals"
 */
export function getSeverity(bleach_conf: number, is_bleached: boolean): SeverityResult {
    let score: number;
    let stage: BleachStage;

    if (!is_bleached) {
        // Healthy coral — high confidence = very healthy
        const health_conf = 1.0 - bleach_conf;
        score = Math.round(55 + health_conf * 45);   // 55–100
        stage = 'Healthy';
    } else if (bleach_conf <= 0.30) {
        score = Math.round(85 - bleach_conf * 100);
        stage = 'Healthy';
    } else if (bleach_conf <= 0.54) {
        score = Math.round(84 - (bleach_conf - 0.31) * 130);   // 84 → 55
        stage = 'Early Thermal Stress';
    } else if (bleach_conf <= 0.74) {
        score = Math.round(54 - (bleach_conf - 0.55) * 120);   // 54 → 30
        stage = 'Partial Bleaching';
    } else if (bleach_conf <= 0.89) {
        score = Math.round(29 - (bleach_conf - 0.75) * 130);   // 29 → 10
        stage = 'Severe Bleaching';
    } else {
        score = Math.max(0, Math.round((1.0 - bleach_conf) * 90));  // 0–9
        stage = 'Critical / Mortality Risk';
    }

    score = Math.max(0, Math.min(100, score));
    const cfg = STAGE_CONFIG[stage];

    return {
        health_score: score,
        bleach_stage: stage,
        color: cfg.color,
        badge: cfg.badge,
    };
}
