import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { SeverityBadge } from '@/components/SeverityBadge';
import { ThreatBadges } from '@/components/ThreatBadges';
import { WaterQualityCard } from '@/components/WaterQualityCard';
import { ReefTimeline } from '@/components/ReefTimeline';
import { getReefHistory, getReefById, type ReefSnapshot, type Reef } from '@/lib/db';
import { calculateRecoveryRate } from '@/lib/recovery';
import type { BleachStage } from '@/lib/constants';
import type { Threat } from '@/lib/threat-engine';
import { format } from 'date-fns';

// ── NOAA Bleaching Alert Level derived from DHW ─────────────────────────────
function getBleachAlertLevel(dhw: number | null): { level: number; label: string; color: string; bg: string } {
    if (dhw == null || dhw < 0) return { level: 0, label: 'No Stress', color: 'text-green-600', bg: 'bg-green-500/15 border-green-500/30' };
    if (dhw < 4) return { level: 1, label: 'Bleaching Watch', color: 'text-yellow-600', bg: 'bg-yellow-500/15 border-yellow-500/30' };
    if (dhw < 8) return { level: 2, label: 'Bleaching Warning', color: 'text-orange-600', bg: 'bg-orange-500/15 border-orange-500/30' };
    if (dhw < 12) return { level: 3, label: 'Alert Level 1', color: 'text-red-600', bg: 'bg-red-500/15 border-red-500/30' };
    return { level: 4, label: 'Alert Level 2', color: 'text-gray-900 dark:text-gray-100', bg: 'bg-gray-800/15 border-gray-800/30' };
}

interface ReefDetailPanelProps {
    reefId: string;
}

export function ReefDetailPanel({ reefId }: ReefDetailPanelProps) {
    const [reef, setReef] = useState<Reef | null>(null);
    const [history, setHistory] = useState<ReefSnapshot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([getReefById(reefId), getReefHistory(reefId)]).then(([r, h]) => {
            setReef(r);
            setHistory(h);
            setLoading(false);
        });
    }, [reefId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (!reef) {
        return (
            <div className="rounded-xl border p-8 text-center text-muted-foreground">
                Reef not found. It may have been removed.
            </div>
        );
    }

    const latest = history[history.length - 1] ?? null;
    const threats: Threat[] = (latest?.threats as Threat[]) ?? [];
    const bleachAlert = getBleachAlertLevel(latest?.dhw ?? null);
    const recovery = calculateRecoveryRate(history);

    // Before/after: worst score image vs most recent image
    const snapshotsWithImages = history.filter(s => s.image_url);
    let worstSnapshot: ReefSnapshot | null = null;
    if (snapshotsWithImages.length >= 2) {
        worstSnapshot = snapshotsWithImages.reduce((w, s) => s.health_score < w.health_score ? s : w, snapshotsWithImages[0]);
        // Don't show comparison if worst = latest
        if (worstSnapshot && worstSnapshot.uploaded_at === latest?.uploaded_at) {
            worstSnapshot = null;
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="border-2 border-emerald-500/30">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl">{reef.reef_name}</CardTitle>
                            {latest?.lat != null && latest.lon != null && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {latest.lat.toFixed(4)}, {latest.lon.toFixed(4)}
                                </p>
                            )}
                            {latest?.uploaded_at && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3" />
                                    Last updated {format(new Date(latest.uploaded_at), 'MMM d, yyyy · HH:mm')}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {latest && (
                                <SeverityBadge
                                    healthScore={latest.health_score}
                                    stage={(latest.bleach_stage ?? 'Healthy') as BleachStage}
                                    size="lg"
                                />
                            )}
                            {/* NOAA Bleaching Alert Level */}
                            <Badge variant="outline" className={`${bleachAlert.bg} ${bleachAlert.color} font-semibold text-xs px-2 py-0.5`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                NOAA Alert: {bleachAlert.label} (Lv {bleachAlert.level})
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-500">{history.length}</p>
                            <p className="text-xs text-muted-foreground">Surveys</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold">{latest?.health_score ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">Health Score</p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                            <p className="text-2xl font-bold text-red-500">{threats.filter(t => t.severity === 'CRITICAL' || t.severity === 'HIGH').length}</p>
                            <p className="text-xs text-muted-foreground">Active Threats</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recovery Rate */}
            {recovery.recoveryRate != null && (
                <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/20 rounded-full shrink-0">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-emerald-600">
                                Recovery: +{recovery.recoveryRate} pts/week
                            </p>
                            <p className="text-xs text-muted-foreground">
                                From nadir of {recovery.nadirScore} → {recovery.currentScore} over {recovery.weeksElapsed} weeks
                                {recovery.nadirDate && ` (since ${format(new Date(recovery.nadirDate), 'MMM d, yyyy')})`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Threats */}
            <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Active Threats
                </h3>
                <ThreatBadges threats={threats} />
            </div>

            <Separator />

            {/* Water Quality */}
            {latest && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        Water Quality
                    </h3>
                    <WaterQualityCard
                        sst={latest.sst_celsius}
                        ph={latest.ocean_ph}
                        uv={latest.uv_index}
                        dhw={latest.dhw}
                    />
                </div>
            )}

            <Separator />

            {/* Timeline */}
            <div className="space-y-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Health Timeline ({history.length} surveys)
                </h3>
                <ReefTimeline history={history} />
            </div>

            {/* Before / After Image Comparison */}
            {worstSnapshot && latest?.image_url && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            Before / After Comparison
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-xs">
                                        Worst — Score {worstSnapshot.health_score}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                        {format(new Date(worstSnapshot.uploaded_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <img
                                    src={worstSnapshot.image_url!}
                                    alt="Worst health snapshot"
                                    className="w-full h-48 object-cover rounded-xl border-2 border-red-500/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                                        Latest — Score {latest.health_score}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">
                                        {format(new Date(latest.uploaded_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <img
                                    src={latest.image_url}
                                    alt="Latest reef survey"
                                    className="w-full h-48 object-cover rounded-xl border-2 border-emerald-500/30"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Latest image (only shown if no comparison) */}
            {!worstSnapshot && latest?.image_url && (
                <>
                    <Separator />
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                            Latest Image
                        </h3>
                        <img
                            src={latest.image_url}
                            alt="Latest reef survey"
                            className="w-full max-h-64 object-cover rounded-xl border"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
