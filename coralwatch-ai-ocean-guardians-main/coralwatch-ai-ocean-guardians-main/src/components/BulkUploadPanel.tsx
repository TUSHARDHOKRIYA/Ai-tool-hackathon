import { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { extractGPS } from '@/lib/exif';
import { getSeverity } from '@/lib/severity';
import { fetchAllOceanData } from '@/lib/ocean-apis';
import { evaluateThreats } from '@/lib/threat-engine';
import { saveSnapshot } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { SeverityBadge } from '@/components/SeverityBadge';
import type { BleachStage } from '@/lib/constants';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DownloadCloud } from 'lucide-react';

const SPACE2_URL = import.meta.env.VITE_SPACE2_URL ??
    'https://your-user-coral-pipeline.hf.space';

interface UploadJob {
    id: string;
    file: File;
    step: 'queued' | 'gps' | 'manual-gps' | 'detecting' | 'classifying' | 'saving' | 'done' | 'error';
    gps: { lat: number; lon: number } | null;
    health_score?: number;
    stage?: string;
    error?: string;
    reef_id?: string;
    annotated_image?: string;
}

function stepLabel(step: UploadJob['step']): string {
    const labels: Record<UploadJob['step'], string> = {
        queued: 'Queued',
        gps: 'Extracting GPS…',
        'manual-gps': 'Needs manual GPS',
        detecting: 'YOLO detecting…',
        classifying: 'ResNet classifying…',
        saving: 'Saving to DB…',
        done: 'Done',
        error: 'Error',
    };
    return labels[step];
}

function stepPct(step: UploadJob['step']): number {
    const pcts: Record<UploadJob['step'], number> = {
        queued: 5,
        gps: 20,
        'manual-gps': 20,
        detecting: 40,
        classifying: 65,
        saving: 85,
        done: 100,
        error: 100,
    };
    return pcts[step];
}

export function BulkUploadPanel() {
    const [jobs, setJobs] = useState<UploadJob[]>([]);
    const [running, setRunning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const updateJob = useCallback((id: string, patch: Partial<UploadJob>) => {
        setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
    }, []);

    const processFile = async (job: UploadJob) => {
        try {
            // Step 1: Extract GPS
            updateJob(job.id, { step: 'gps' });
            const gps = await extractGPS(job.file);
            updateJob(job.id, { gps });

            if (!gps) {
                updateJob(job.id, { step: 'manual-gps', error: 'No GPS — enter coordinates manually' });
                return;
            }

            await processFromDetection(job.id, job.file, gps);
        } catch (e: any) {
            updateJob(job.id, { step: 'error', error: e.message ?? 'Unknown error' });
        }
    };

    // Pipeline from detection step onwards (shared by auto-GPS and manual-GPS)
    const processFromDetection = async (jobId: string, file: File, gps: { lat: number; lon: number }) => {
        try {
            updateJob(jobId, { step: 'detecting', gps });
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(`${SPACE2_URL}/analyze`, { method: 'POST', body: form });

            if (!res.ok) {
                throw new Error(`Pipeline error: ${res.status}`);
            }
            const pipelineResult = await res.json();

            updateJob(jobId, { step: 'classifying', annotated_image: pipelineResult.annotated_image });

            const avgScore: number = pipelineResult.summary?.avg_health_score
                ?? pipelineResult.summary?.healthy_count != null
                ? Math.round(
                    ((pipelineResult.summary.healthy_count ?? 0) /
                        Math.max(pipelineResult.summary.total_corals ?? 1, 1)) * 80 + 10
                )
                : 50;

            const dominantStage: string = pipelineResult.summary?.dominant_stage ?? 'Healthy';
            const bleachConf: number = pipelineResult.detections?.[0]?.bleach_confidence
                ?? (1 - avgScore / 100);
            const { health_score } = getSeverity(bleachConf, bleachConf > 0.5);

            const ocean = await fetchAllOceanData(gps.lat, gps.lon);
            const threats = evaluateThreats({ health_score }, [], ocean);

            updateJob(jobId, { step: 'saving' });
            const image_url = await uploadImageToCloudinary(file);

            if (isSupabaseConfigured) {
                const snap = await saveSnapshot({
                    lat: gps.lat,
                    lon: gps.lon,
                    health_score,
                    bleach_stage: dominantStage,
                    bleach_confidence: bleachConf,
                    sst_celsius: ocean.sst,
                    ocean_ph: ocean.ph,
                    uv_index: ocean.uv,
                    dhw: ocean.dhw,
                    threats,
                    image_url,
                });
                updateJob(jobId, { step: 'done', health_score, stage: dominantStage, reef_id: snap?.reef_id });
            } else {
                updateJob(jobId, { step: 'done', health_score, stage: dominantStage });
            }
        } catch (e: any) {
            updateJob(jobId, { step: 'error', error: e.message ?? 'Unknown error' });
        }
    };

    // Resume a manual-gps job with user-entered coordinates
    const handleManualGPS = async (jobId: string, lat: number, lon: number) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;
        await processFromDetection(jobId, job.file, { lat, lon });
    };

    const addFiles = (files: File[]) => {
        const images = files.filter((f) => f.type.startsWith('image/'));
        const newJobs: UploadJob[] = images.map((f) => ({
            id: Math.random().toString(36).slice(2),
            file: f,
            step: 'queued',
            gps: null,
        }));
        setJobs((prev) => [...prev, ...newJobs]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
    };

    const handleRun = async () => {
        setRunning(true);
        const pending = jobs.filter((j) => j.step === 'queued' || j.step === 'error');
        await Promise.all(pending.map(processFile));
        setRunning(false);
    };

    const done = jobs.filter((j) => j.step === 'done').length;
    const errors = jobs.filter((j) => j.step === 'error').length;
    const needsGps = jobs.filter((j) => j.step === 'manual-gps').length;

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const folder = zip.folder('annotated_corals');
        if (!folder) return;

        jobs.forEach((job) => {
            if (job.step === 'done' && job.annotated_image) {
                const b64Data = job.annotated_image.split(',')[1];
                if (b64Data) {
                    folder.file(`annotated_${job.file.name}`, b64Data, { base64: true });
                }
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'coral_analysis_results.zip');
    };

    return (
        <div className="space-y-4">
            {/* Summary banner */}
            {jobs.length > 0 && (
                <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant="secondary">📸 {jobs.length} images</Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                        ✅ {done} saved
                    </Badge>
                    {errors > 0 && (
                        <Badge className="bg-red-500/10 text-red-700 border-red-400/30">
                            ❌ {errors} failed
                        </Badge>
                    )}
                </div>
            )}

            {/* Dropzone */}
            <Card className="border-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Bulk Upload
                    </CardTitle>
                    <CardDescription>
                        Drop multiple coral images at once — GPS is extracted automatically
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : 'border-muted-foreground/25 hover:border-emerald-500/60 hover:bg-emerald-500/5'
                            }`}
                    >
                        <Upload className="mx-auto h-10 w-10 mb-2 text-muted-foreground" />
                        <p className="font-semibold">Drop images here</p>
                        <p className="text-sm text-muted-foreground">or click to browse — multiple files accepted</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                    />
                </CardContent>
            </Card>

            {/* Job list */}
            {jobs.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            className="flex items-start gap-3 rounded-lg border bg-card p-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{job.file.name}</p>
                                <Progress
                                    value={stepPct(job.step)}
                                    className={`mt-1 h-1.5 ${job.step === 'error' ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {job.step === 'error' ? `❌ ${job.error}` : job.step === 'manual-gps' ? '⚠️ No GPS — enter coordinates below' : stepLabel(job.step)}
                                    {job.gps && (
                                        <span className="ml-2 text-blue-500">
                                            <MapPin className="inline h-2.5 w-2.5" /> {job.gps.lat.toFixed(3)}, {job.gps.lon.toFixed(3)}
                                        </span>
                                    )}
                                </p>
                                {/* Manual GPS inline form */}
                                {job.step === 'manual-gps' && (
                                    <ManualGPSForm onSubmit={(lat, lon) => handleManualGPS(job.id, lat, lon)} />
                                )}
                            </div>

                            {job.step === 'done' && job.health_score != null && (
                                <SeverityBadge
                                    healthScore={job.health_score}
                                    stage={(job.stage ?? 'Healthy') as BleachStage}
                                    size="sm"
                                    showScore
                                />
                            )}
                            {(job.step === 'detecting' || job.step === 'classifying' || job.step === 'saving' || job.step === 'gps') && (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0 mt-0.5" />
                            )}
                            {job.step === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}

                            <button
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                                onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Run button */}
            {jobs.filter((j) => j.step === 'queued' || j.step === 'error').length > 0 && (
                <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
                    onClick={handleRun}
                    disabled={running}
                >
                    {running ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                        <><Upload className="mr-2 h-4 w-4" /> Run Pipeline on {jobs.filter((j) => j.step === 'queued').length} Images</>
                    )}
                </Button>
            )}

            {needsGps > 0 && !running && (
                <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                    <Navigation className="inline h-3.5 w-3.5 mr-1" />
                    {needsGps} image{needsGps > 1 ? 's' : ''} need manual GPS coordinates. Enter lat/lon in the form above to continue.
                </div>
            )}

            {/* Download Zip button */}
            {!running && done > 0 && (
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
                    onClick={handleDownloadZip}
                >
                    <DownloadCloud className="mr-2 h-4 w-4" /> Download All Results (ZIP)
                </Button>
            )}
        </div>
    );
}

// Small inline form for entering manual GPS coords
function ManualGPSForm({ onSubmit }: { onSubmit: (lat: number, lon: number) => void }) {
    const [lat, setLat] = useState('');
    const [lon, setLon] = useState('');
    return (
        <div className="flex items-center gap-1.5 mt-1.5">
            <Input
                className="h-6 text-[10px] w-24 px-1.5"
                placeholder="Lat"
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
            />
            <Input
                className="h-6 text-[10px] w-24 px-1.5"
                placeholder="Lon"
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
            />
            <Button
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={!lat || !lon}
                onClick={() => onSubmit(parseFloat(lat), parseFloat(lon))}
            >
                <MapPin className="h-3 w-3 mr-0.5" /> Set GPS
            </Button>
        </div>
    );
}
