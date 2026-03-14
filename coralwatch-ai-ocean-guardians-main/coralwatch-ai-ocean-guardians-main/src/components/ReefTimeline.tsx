import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import type { ReefSnapshot } from '@/lib/db';
import { THRESHOLDS } from '@/lib/constants';

interface ReefTimelineProps {
    history: ReefSnapshot[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background/95 p-3 shadow-lg text-sm backdrop-blur">
            <p className="font-semibold mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.name} style={{ color: p.color }} className="text-xs">
                    {p.name}: <strong>{p.value ?? '—'}</strong>
                    {p.name === 'Health Score' ? '' : p.name === 'SST' ? '°C' : ' DHW'}
                </p>
            ))}
        </div>
    );
};

export function ReefTimeline({ history }: ReefTimelineProps) {
    if (history.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 text-sm text-muted-foreground">
                No history data yet — upload more images of this reef to build a timeline
            </div>
        );
    }

    const data = history.map((s) => ({
        date: format(new Date(s.uploaded_at), 'MMM d'),
        'Health Score': s.health_score,
        SST: s.sst_celsius ?? undefined,
        DHW: s.dhw ?? undefined,
    }));

    return (
        <div className="space-y-2">
            <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data} margin={{ top: 8, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                    />
                    {/* Left Y: Health Score 0–100 */}
                    <YAxis
                        yAxisId="score"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        label={{ value: 'Health Score', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10 }}
                    />
                    {/* Right Y: SST °C */}
                    <YAxis
                        yAxisId="sst"
                        orientation="right"
                        domain={[26, 34]}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        label={{ value: 'SST °C', angle: 90, position: 'insideRight', offset: 10, fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />

                    {/* Bleaching threshold reference line */}
                    <ReferenceLine
                        yAxisId="sst"
                        y={THRESHOLDS.sst.bleach}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{ value: 'Bleach threshold', position: 'right', fontSize: 9, fill: '#ef4444' }}
                    />
                    {/* Healthy score reference line */}
                    <ReferenceLine
                        yAxisId="score"
                        y={THRESHOLDS.health_score.healthy}
                        stroke="#22c55e"
                        strokeDasharray="4 4"
                        label={{ value: 'Healthy', position: 'left', fontSize: 9, fill: '#22c55e' }}
                    />

                    {/* DHW shaded area */}
                    <Area
                        yAxisId="score"
                        dataKey="DHW"
                        fill="#fbbf24"
                        fillOpacity={0.15}
                        stroke="#fbbf24"
                        strokeWidth={1.5}
                        dot={false}
                        name="DHW"
                    />

                    {/* Health Score line */}
                    <Line
                        yAxisId="score"
                        type="monotone"
                        dataKey="Health Score"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#22c55e' }}
                        activeDot={{ r: 6 }}
                    />

                    {/* SST line */}
                    <Line
                        yAxisId="sst"
                        type="monotone"
                        dataKey="SST"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f97316' }}
                        strokeDasharray="0"
                        name="SST"
                    />
                </ComposedChart>
            </ResponsiveContainer>

            <p className="text-[10px] text-center text-muted-foreground">
                🟢 Health Score (left axis) · 🟠 SST °C (right axis) · 🟡 DHW shaded area
            </p>
        </div>
    );
}
