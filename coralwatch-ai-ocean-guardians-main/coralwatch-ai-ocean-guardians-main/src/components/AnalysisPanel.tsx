import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Loader2, BarChart2, CheckCircle2 } from 'lucide-react';
import { findNearestReef, getAllReefs, type Reef } from '@/lib/db';
import { ReefDetailPanel } from '@/components/ReefDetailPanel';
import { ReefHeatmap } from '@/components/ReefHeatmap';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AnalysisPanel() {
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundReef, setFoundReef] = useState<Reef | null>(null);
    const [searchAttempted, setSearchAttempted] = useState(false);

    // Overall Stats
    const [statsLoading, setStatsLoading] = useState(true);
    const [allReefs, setAllReefs] = useState<Reef[]>([]);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setStatsLoading(false);
            return;
        }

        getAllReefs().then((reefs) => {
            setAllReefs(reefs);
            setStatsLoading(false);
        });
    }, []);

    const handleSearch = async (latitude?: number, longitude?: number) => {
        const searchLat = latitude ?? parseFloat(lat);
        const searchLon = longitude ?? parseFloat(lon);

        if (isNaN(searchLat) || isNaN(searchLon)) return;

        setSearching(true);
        setSearchAttempted(true);
        setFoundReef(null);

        try {
            const reef = await findNearestReef(searchLat, searchLon);
            setFoundReef(reef);
        } catch (e) {
            console.error(e);
        } finally {
            setSearching(false);
        }
    };

    // Callback when user clicks a reef on the embedded heatmap
    const handleReefClick = useCallback((reef: Reef) => {
        if (reef.lat != null && reef.lon != null) {
            setLat(reef.lat.toFixed(4));
            setLon(reef.lon.toFixed(4));
            // Directly set the found reef (no need to re-query)
            setFoundReef(reef);
            setSearchAttempted(true);
        }
    }, []);

    // Calculate database insights
    const avgHealth = allReefs.length > 0
        ? Math.round(allReefs.reduce((acc, r) => acc + (r.latest_health_score ?? 0), 0) / allReefs.length)
        : 0;

    const healthyCount = allReefs.filter(r => (r.latest_health_score ?? 0) >= 80).length;
    const criticalCount = allReefs.filter(r => (r.latest_health_score ?? 100) < 25).length;

    return (
        <div className="space-y-6">
            {/* Database Overall Insights */}
            <Card className="border-2 lg:col-span-3">
                <CardHeader className="pb-3 flex flex-row items-center gap-2">
                    <BarChart2 className="h-5 w-5 text-blue-500" />
                    <div>
                        <CardTitle className="text-base text-blue-500">Overall Database Insights</CardTitle>
                        <CardDescription>Aggregate statistics across all monitored reef sites.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {statsLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        </div>
                    ) : allReefs.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="rounded-lg bg-blue-500/10 p-3 text-center border border-blue-500/20">
                                <p className="text-2xl font-bold text-blue-500">{allReefs.length}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total Reef Sites</p>
                            </div>
                            <div className="rounded-lg bg-emerald-500/10 p-3 text-center border border-emerald-500/20">
                                <p className="text-2xl font-bold text-emerald-500">{avgHealth}</p>
                                <p className="text-xs text-muted-foreground mt-1">Avg Health Score</p>
                            </div>
                            <div className="rounded-lg bg-green-500/10 p-3 text-center border border-green-500/20">
                                <p className="text-2xl font-bold text-green-500">{healthyCount}</p>
                                <p className="text-xs text-muted-foreground mt-1">Healthy Sites</p>
                            </div>
                            <div className="rounded-lg bg-red-500/10 p-3 text-center border border-red-500/20">
                                <p className="text-2xl font-bold text-red-500">{criticalCount}</p>
                                <p className="text-xs text-muted-foreground mt-1">Critical Sites</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground py-4">
                            No reef data available yet to display insights.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Interactive Heatmap — click a reef to search */}
            <Card className="border-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-500" /> Click a Reef on the Map to Inspect
                    </CardTitle>
                    <CardDescription>Click any reef circle on the heatmap below, or manually enter coordinates.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden rounded-b-xl">
                    <ReefHeatmap height="350px" onReefClick={handleReefClick} />
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Search Sidebar */}
                <div className="space-y-4 lg:col-span-1">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Search className="h-4 w-4 text-primary" /> Search by Coordinates
                            </CardTitle>
                            <CardDescription>
                                Enter latitude and longitude to find the nearest reef or click a reef on the map above.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Latitude</div>
                                <Input
                                    placeholder="e.g. -16.82"
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    type="number"
                                    step="0.0001"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-sm font-medium">Longitude</div>
                                <Input
                                    placeholder="e.g. 145.98"
                                    value={lon}
                                    onChange={(e) => setLon(e.target.value)}
                                    type="number"
                                    step="0.0001"
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => handleSearch()}
                                disabled={searching || !lat || !lon}
                            >
                                {searching ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching Database...</>
                                ) : (
                                    <><MapPin className="mr-2 h-4 w-4" /> Extract Details</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {searchAttempted && !searching && !foundReef ? (
                        <Card className="border-2 border-dashed h-full min-h-[300px] flex items-center justify-center">
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p>No reef found within 2km of these coordinates.</p>
                                <p className="text-xs mt-1">Upload a photo at this location in the Bulk Upload tab to log it.</p>
                            </CardContent>
                        </Card>
                    ) : foundReef ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <Card className="border-2 border-primary/50 bg-primary/5">
                                <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/20 rounded-full">
                                            <CheckCircle2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{foundReef.reef_name}</p>
                                            <p className="text-xs text-muted-foreground">Nearest matching reef found</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <ReefDetailPanel reefId={foundReef.reef_id} />
                        </div>
                    ) : (
                        <Card className="border-2 border-dashed border-muted-foreground/20 h-full min-h-[300px] flex items-center justify-center bg-muted/20">
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Click a reef on the map or enter coordinates to extract records.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
