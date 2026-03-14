import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import { ReefHeatmap } from '@/components/ReefHeatmap';

import { SeverityBadge } from '@/components/SeverityBadge';
import { getAllReefs, type Reef } from '@/lib/db';
import type { BleachStage } from '@/lib/constants';
import { isSupabaseConfigured } from '@/lib/supabase';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Map, Database, LineChart, Activity } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-50 font-sans">
            <Header />

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 space-y-6">

                {/* Formal Header block */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-slate-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reef Intelligence Dashboard</h1>
                        <p className="text-slate-500 mt-1">Advanced telemetry and analysis platform for marine environments.</p>
                    </div>
                </div>

                {/* Summary banner - Data Readout Style */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b">
                            <CardTitle className="text-sm font-medium text-slate-600">Total Monitored Sites</CardTitle>
                            <Database className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-slate-900">{reefs.length}</div>
                            <p className="text-xs text-slate-500 mt-1">Active acoustic/visual telemetry feeds</p>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b">
                            <CardTitle className="text-sm font-medium text-slate-600">Elevated Stress Levels</CardTitle>
                            <Activity className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-orange-600">{atRisk}</div>
                            <p className="text-xs text-slate-500 mt-1">Sites requiring early intervention</p>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b">
                            <CardTitle className="text-sm font-medium text-slate-600">Critical Bleaching Alerts</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-red-600">{critical}</div>
                            <p className="text-xs text-slate-500 mt-1">Immediate evaluation recommended</p>
                        </CardContent>
                    </Card>
                </div>

                {!isSupabaseConfigured && (
                    <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>System Warning:</strong> Primary database connectivity offline. Data persistence is disabled.
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="map" className="flex flex-col lg:flex-row gap-6">
                    {/* Vertical Tabs for Sidebar look */}
                    <div className="lg:w-64 shrink-0">
                        <TabsList className="flex flex-col h-auto w-full bg-transparent space-y-2 p-0">
                            <TabsTrigger
                                value="map"
                                className="w-full justify-start gap-3 py-3 px-4 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 transition-all rounded-md"
                            >
                                <Map className="h-4 w-4" /> Geographic Topography
                            </TabsTrigger>
                            <TabsTrigger
                                value="list"
                                className="w-full justify-start gap-3 py-3 px-4 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 transition-all rounded-md"
                            >
                                <Database className="h-4 w-4" /> Site Directory
                            </TabsTrigger>
                            <TabsTrigger
                                value="analysis"
                                className="w-full justify-start gap-3 py-3 px-4 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-slate-200 transition-all rounded-md"
                            >
                                <LineChart className="h-4 w-4" /> Predictive Analytics
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Heatmap tab */}
                        <TabsContent value="map" className="m-0 mt-0 border rounded-lg overflow-hidden shadow-sm bg-white">
                            <div className="p-4 border-b bg-slate-50">
                                <h3 className="font-semibold text-slate-800">Geospatial Distribution</h3>
                                <p className="text-sm text-slate-500">Live monitoring of global reef network.</p>
                            </div>
                            <ReefHeatmap height="600px" />
                        </TabsContent>

                        {/* Reef list tab */}
                        <TabsContent value="list" className="m-0 mt-0">
                            <Card className="border shadow-sm">
                                <CardHeader className="bg-slate-50 border-b">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Surveyed Coordinates Database</CardTitle>
                                    </div>
                                    <p className="text-sm text-slate-500">Comprehensive index of all recorded analytical sites.</p>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {loading ? (
                                        <div className="flex justify-center py-16 text-muted-foreground text-sm">
                                            Synchronizing records…
                                        </div>
                                    ) : reefs.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <Database className="mx-auto h-12 w-12 mb-3 opacity-20" />
                                            <p>Database empty. Awaiting telemetry input.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y border-t-0">
                                            {reefs.map((reef) => (
                                                <Link
                                                    key={reef.reef_id}
                                                    to={`/reef/${reef.reef_id}`}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900 truncate">{reef.reef_name}</p>
                                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 border-l-2 pl-2 border-slate-300">
                                                            <span>Lat: {reef.lat?.toFixed(4)}°</span>
                                                            <span className="mx-1">•</span>
                                                            <span>Lon: {reef.lon?.toFixed(4)}°</span>
                                                            <span className="mx-1">•</span>
                                                            <span>
                                                                {reef.latest_uploaded_at
                                                                    ? `Last telemetric update: ${format(new Date(reef.latest_uploaded_at), 'yyyy-MM-dd HH:mm')}`
                                                                    : 'No timeseries data'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        {reef.latest_health_score != null && (
                                                            <SeverityBadge
                                                                healthScore={reef.latest_health_score}
                                                                stage={(reef.latest_bleach_stage ?? 'Healthy') as BleachStage}
                                                                size="sm"
                                                            />
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Analysis tab */}
                        <TabsContent value="analysis" className="m-0 mt-0">
                            <AnalysisPanel />
                        </TabsContent>
                    </div>
                </Tabs>
            </main>
        </div>
    );
}
