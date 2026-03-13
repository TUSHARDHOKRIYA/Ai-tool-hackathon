import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { ReefHeatmap } from '@/components/ReefHeatmap';
import { BulkUploadPanel } from '@/components/BulkUploadPanel';
import { SeverityBadge } from '@/components/SeverityBadge';
import { getAllReefs, type Reef } from '@/lib/db';
import type { BleachStage } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Map, Upload, Waves, LineChart } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AnalysisPanel } from '@/components/AnalysisPanel';

export default function ReefDashboard() {
    const [reefs, setReefs] = useState<Reef[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAllReefs().then((data) => {
            setReefs(data);
            setLoading(false);
        });
    }, []);

    const atRisk = reefs.filter(
        (r) => (r.latest_health_score ?? 100) < 55
    ).length;
    const critical = reefs.filter(
        (r) => (r.latest_health_score ?? 100) < 25
    ).length;

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8 space-y-8">
                {/* Summary banner */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border-2 border-emerald-500/30">
                        <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold text-emerald-500">{reefs.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Reefs Monitored</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-orange-400/30">
                        <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold text-orange-500">{atRisk}</p>
                            <p className="text-xs text-muted-foreground mt-1">At Risk</p>
                        </CardContent>
                    </Card>
                    <Card className="border-2 border-red-500/30">
                        <CardContent className="pt-4 text-center">
                            <p className="text-3xl font-bold text-red-500">{critical}</p>
                            <p className="text-xs text-muted-foreground mt-1">Critical</p>
                        </CardContent>
                    </Card>
                </div>

                {!isSupabaseConfigured && (
                    <Alert className="border-yellow-400/40 bg-yellow-400/10">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                            Supabase not configured — add <code>VITE_SUPABASE_URL</code> and{' '}
                            <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> to enable
                            data persistence.
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="map">
                    <TabsList className="mb-4">
                        <TabsTrigger value="map" className="gap-2">
                            <Map className="h-4 w-4" /> Heatmap
                        </TabsTrigger>
                        <TabsTrigger value="list" className="gap-2">
                            <Waves className="h-4 w-4" /> Reef List
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="gap-2">
                            <Upload className="h-4 w-4" /> Bulk Upload
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="gap-2">
                            <LineChart className="h-4 w-4" /> Data Analysis
                        </TabsTrigger>
                    </TabsList>

                    {/* Heatmap tab */}
                    <TabsContent value="map">
                        <ReefHeatmap height="520px" />
                    </TabsContent>

                    {/* Reef list tab */}
                    <TabsContent value="list">
                        {loading ? (
                            <div className="flex justify-center py-16 text-muted-foreground text-sm">
                                Loading reefs…
                            </div>
                        ) : reefs.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-12 text-center text-muted-foreground">
                                <Waves className="mx-auto h-12 w-12 mb-3 opacity-30" />
                                <p>No reefs yet — upload coral images with GPS to start tracking.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {reefs.map((reef) => (
                                    <Link
                                        key={reef.reef_id}
                                        to={`/reef/${reef.reef_id}`}
                                        className="flex items-center justify-between rounded-xl border bg-card p-4 hover:border-emerald-500/40 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate">{reef.reef_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {reef.latest_uploaded_at
                                                    ? `Last survey: ${format(new Date(reef.latest_uploaded_at), 'MMM d, yyyy')}`
                                                    : 'No surveys yet'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {reef.latest_health_score != null && (
                                                <SeverityBadge
                                                    healthScore={reef.latest_health_score}
                                                    stage={(reef.latest_bleach_stage ?? 'Healthy') as BleachStage}
                                                    size="sm"
                                                />
                                            )}
                                            <Badge variant="secondary" className="text-xs">→</Badge>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Bulk upload tab */}
                    <TabsContent value="upload">
                        <BulkUploadPanel />
                    </TabsContent>

                    {/* Analysis tab */}
                    <TabsContent value="analysis">
                        <AnalysisPanel />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
