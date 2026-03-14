/**
 * Recovery Rate Calculator
 * Finds the bleaching nadir (lowest health score) in a reef's history
 * and calculates the rate of health-score improvement per week from
 * that point to the latest snapshot.
 */
import type { ReefSnapshot } from './db';

export interface RecoveryResult {
    /** Health-score points gained per week since the nadir. null if no recovery detected. */
    recoveryRate: number | null;
    /** Date of the lowest-score snapshot */
    nadirDate: string | null;
    /** Health score at the nadir */
    nadirScore: number | null;
    /** Current (latest) health score */
    currentScore: number | null;
    /** Weeks elapsed since the nadir */
    weeksElapsed: number | null;
}

export function calculateRecoveryRate(history: ReefSnapshot[]): RecoveryResult {
    const empty: RecoveryResult = {
        recoveryRate: null, nadirDate: null, nadirScore: null,
        currentScore: null, weeksElapsed: null,
    };

    if (history.length < 2) return empty;

    // Find the nadir (lowest score snapshot)
    let nadirIdx = 0;
    for (let i = 1; i < history.length; i++) {
        if (history[i].health_score < history[nadirIdx].health_score) {
            nadirIdx = i;
        }
    }

    // Recovery only makes sense if there are snapshots AFTER the nadir
    if (nadirIdx >= history.length - 1) return empty;

    const nadir = history[nadirIdx];
    const latest = history[history.length - 1];

    const nadirDate = new Date(nadir.uploaded_at);
    const latestDate = new Date(latest.uploaded_at);
    const msElapsed = latestDate.getTime() - nadirDate.getTime();
    const weeksElapsed = msElapsed / (1000 * 60 * 60 * 24 * 7);

    if (weeksElapsed <= 0) return empty;

    const scoreDiff = latest.health_score - nadir.health_score;

    // Only report positive recovery (improvement)
    if (scoreDiff <= 0) return empty;

    const recoveryRate = Math.round((scoreDiff / weeksElapsed) * 10) / 10;

    return {
        recoveryRate,
        nadirDate: nadir.uploaded_at,
        nadirScore: nadir.health_score,
        currentScore: latest.health_score,
        weeksElapsed: Math.round(weeksElapsed * 10) / 10,
    };
}
