import type { Threat } from '@/lib/threat-engine';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    CRITICAL: { bg: 'bg-red-600/15', text: 'text-red-700 dark:text-red-400', border: 'border-red-600/40', icon: '🔴' },
    HIGH: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-300', border: 'border-red-400/40', icon: '🟠' },
    MEDIUM: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-400/40', icon: '🟡' },
    WATCH: { bg: 'bg-yellow-400/10', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-400/40', icon: '⚡' },
    LOW: { bg: 'bg-blue-400/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-400/40', icon: 'ℹ️' },
    INFO: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', icon: '📋' },
};

const TYPE_LABELS: Record<string, string> = {
    THERMAL: '🌡️ Thermal Stress',
    ACIDIFICATION: '⚗️ Acidification',
    RAPID_DECLINE: '📉 Rapid Decline',
    COMPOUND: '⚠️ Compound Stress',
    UV_AMPLIFICATION: '☀️ UV Amplification',
    UV: '☀️ UV Radiation',
    NO_DATA: '📸 No Recent Data',
};

interface ThreatBadgesProps {
    threats: Threat[];
    compact?: boolean;
}

export function ThreatBadges({ threats, compact = false }: ThreatBadgesProps) {
    if (threats.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <span className="text-emerald-500">✅</span>
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                    No active threats detected
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {threats.map((t, i) => {
                const style = SEVERITY_STYLES[t.severity] ?? SEVERITY_STYLES.INFO;
                return (
                    <div
                        key={i}
                        className={cn(
                            'rounded-lg border px-3 py-2',
                            style.bg,
                            style.border
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <span className="text-sm mt-0.5">{style.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className={cn('text-xs font-bold uppercase tracking-wide', style.text)}>
                                    {t.severity} — {TYPE_LABELS[t.type] ?? t.type}
                                </div>
                                {!compact && (
                                    <div className={cn('text-xs mt-0.5 leading-relaxed', style.text, 'opacity-80')}>
                                        {t.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
