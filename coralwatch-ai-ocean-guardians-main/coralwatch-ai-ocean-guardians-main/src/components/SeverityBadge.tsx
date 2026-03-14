import { STAGE_CONFIG, type BleachStage } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SeverityBadgeProps {
    healthScore: number;
    stage: BleachStage | string;
    size?: 'sm' | 'md' | 'lg';
    showScore?: boolean;
}

export function SeverityBadge({
    healthScore,
    stage,
    size = 'md',
    showScore = true,
}: SeverityBadgeProps) {
    const cfg = STAGE_CONFIG[stage as BleachStage] ?? STAGE_CONFIG['Partial Bleaching'];

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5 gap-1',
        md: 'text-sm px-3 py-1 gap-1.5',
        lg: 'text-base px-4 py-1.5 gap-2',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full font-semibold text-white shadow-sm',
                cfg.bgColor,
                sizeClasses[size]
            )}
        >
            <span>{cfg.badge}</span>
            {showScore && <span>{healthScore}</span>}
            <span className="font-normal opacity-90 truncate">{stage}</span>
        </div>
    );
}

// Compact score ring for map tooltips
export function ScoreRing({ score }: { score: number }) {
    const cfg = Object.values(STAGE_CONFIG).find((_, i) => {
        const stages = Object.keys(STAGE_CONFIG) as BleachStage[];
        const s = stages[i];
        if (s === 'Healthy' && score >= 75) return true;
        if (s === 'Early Thermal Stress' && score >= 55 && score < 75) return true;
        if (s === 'Partial Bleaching' && score >= 30 && score < 55) return true;
        if (s === 'Severe Bleaching' && score >= 10 && score < 30) return true;
        if (s === 'Critical / Mortality Risk' && score < 10) return true;
        return false;
    }) ?? STAGE_CONFIG['Healthy'];

    return (
        <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
            style={{ backgroundColor: cfg.color }}
        >
            {score}
        </div>
    );
}
