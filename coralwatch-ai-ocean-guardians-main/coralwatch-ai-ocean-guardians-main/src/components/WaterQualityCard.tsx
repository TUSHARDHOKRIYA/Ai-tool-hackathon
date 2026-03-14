import { THRESHOLDS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface MetricConfig {
    label: string;
    icon: string;
    unit: string;
    value: number | null;
    status: 'healthy' | 'watch' | 'stress' | 'critical';
    statusLabel: string;
    desc: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sstStatus(v: number | null) {
    const T = THRESHOLDS.sst;
    if (v === null) return { status: 'watch' as const, label: 'No Data' };
    if (v >= T.critical) return { status: 'critical' as const, label: 'CRITICAL' };
    if (v >= T.severe) return { status: 'critical' as const, label: 'SEVERE' };
    if (v >= T.bleach) return { status: 'stress' as const, label: 'STRESS' };
    if (v >= T.watch) return { status: 'watch' as const, label: 'WATCH' };
    return { status: 'healthy' as const, label: 'NORMAL' };
}

function phStatus(v: number | null) {
    const T = THRESHOLDS.ph;
    if (v === null) return { status: 'watch' as const, label: 'No Data' };
    if (v <= T.critical) return { status: 'critical' as const, label: 'CRITICAL' };
    if (v <= T.stress) return { status: 'stress' as const, label: 'STRESS' };
    if (v <= T.watch) return { status: 'watch' as const, label: 'WATCH' };
    return { status: 'healthy' as const, label: 'NORMAL' };
}

function uvStatus(v: number | null) {
    const T = THRESHOLDS.uv;
    if (v === null) return { status: 'watch' as const, label: 'No Data' };
    if (v >= T.extreme) return { status: 'critical' as const, label: 'EXTREME' };
    if (v >= T.high) return { status: 'stress' as const, label: 'HIGH' };
    if (v >= T.moderate) return { status: 'watch' as const, label: 'MODERATE' };
    return { status: 'healthy' as const, label: 'LOW' };
}

function dhwStatus(v: number | null) {
    const T = THRESHOLDS.dhw;
    if (v === null) return { status: 'watch' as const, label: 'No Data' };
    if (v >= T.severe) return { status: 'critical' as const, label: 'SEVERE' };
    if (v >= T.alert) return { status: 'stress' as const, label: 'ALERT' };
    if (v > T.watch) return { status: 'watch' as const, label: 'WATCH' };
    return { status: 'healthy' as const, label: 'NONE' };
}

const STATUS_STYLES = {
    healthy: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    watch: 'bg-yellow-400/10  border-yellow-400/30  text-yellow-700  dark:text-yellow-400',
    stress: 'bg-orange-500/10  border-orange-400/30  text-orange-700  dark:text-orange-400',
    critical: 'bg-red-500/10     border-red-400/30     text-red-700     dark:text-red-400',
};

const STATUS_DOT = {
    healthy: 'bg-emerald-500',
    watch: 'bg-yellow-400',
    stress: 'bg-orange-500',
    critical: 'bg-red-500',
};

// ── Single Metric Card ────────────────────────────────────────────────────────

function MetricCard({ metric }: { metric: MetricConfig }) {
    const style = STATUS_STYLES[metric.status];
    const dot = STATUS_DOT[metric.status];

    return (
        <div className={cn('rounded-xl border p-4 flex flex-col gap-2', style)}>
            <div className="flex items-center justify-between">
                <span className="text-base">{metric.icon}</span>
                <div className="flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', dot)} />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                        {metric.statusLabel}
                    </span>
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold opacity-70">{metric.label}</p>
                <p className="text-2xl font-bold">
                    {metric.value !== null ? metric.value : '—'}
                    <span className="text-sm font-normal opacity-70 ml-1">{metric.unit}</span>
                </p>
            </div>

            <p className="text-[11px] leading-relaxed opacity-70">{metric.desc}</p>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface WaterQualityCardProps {
    sst: number | null;
    ph: number | null;
    uv: number | null;
    dhw: number | null;
}

export function WaterQualityCard({ sst, ph, uv, dhw }: WaterQualityCardProps) {
    const sstS = sstStatus(sst);
    const phS = phStatus(ph);
    const uvS = uvStatus(uv);
    const dhwS = dhwStatus(dhw);

    const metrics: MetricConfig[] = [
        {
            label: 'Sea Surface Temp',
            icon: '🌡️',
            unit: '°C',
            value: sst,
            status: sstS.status,
            statusLabel: sstS.label,
            desc: sst !== null
                ? sst >= THRESHOLDS.sst.bleach
                    ? `${(sst - THRESHOLDS.sst.bleach).toFixed(1)}° above bleaching threshold`
                    : `${(THRESHOLDS.sst.bleach - sst).toFixed(1)}° below bleaching threshold`
                : 'No SST data available',
        },
        {
            label: 'Ocean pH',
            icon: '⚗️',
            unit: '',
            value: ph,
            status: phS.status,
            statusLabel: phS.label,
            desc: ph !== null
                ? ph < THRESHOLDS.ph.stress
                    ? 'Below safe threshold — carbonate stress'
                    : ph < THRESHOLDS.ph.watch
                        ? 'Approaching stress zone, monitor trend'
                        : 'Within healthy range'
                : 'No pH data available',
        },
        {
            label: 'UV Index',
            icon: '☀️',
            unit: '',
            value: uv,
            status: uvS.status,
            statusLabel: uvS.label,
            desc: uv !== null
                ? uv >= THRESHOLDS.uv.extreme
                    ? 'Extreme UV — compounds thermal damage ~30%'
                    : uv >= THRESHOLDS.uv.high
                        ? 'High UV — monitor alongside temperature'
                        : 'Within acceptable range'
                : 'OpenUV key not configured',
        },
        {
            label: 'Degree Heating Weeks',
            icon: '📊',
            unit: '°C-wk',
            value: dhw,
            status: dhwS.status,
            statusLabel: dhwS.label,
            desc: dhw !== null
                ? dhw >= THRESHOLDS.dhw.severe
                    ? 'Mass bleaching / mortality risk (≥8 DHW)'
                    : dhw >= THRESHOLDS.dhw.alert
                        ? 'Bleaching likely (≥4 DHW, NOAA standard)'
                        : dhw > 0
                            ? 'Heat stress accumulating — watch daily'
                            : 'No heat stress accumulation'
                : 'No DHW data available',
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => <MetricCard key={m.label} metric={m} />)}
        </div>
    );
}
