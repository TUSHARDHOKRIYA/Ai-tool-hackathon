import { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, MapPin, Activity, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const SPACE2_URL = import.meta.env.VITE_SPACE2_URL ?? 'https://your-user-coral-pipeline.hf.space';

// YOLO formatted text helper
function generateYoloLabels(detections: any[], image_size: { width: number, height: number }) {
  let output = "";
  if (!image_size || !image_size.width || !image_size.height) return output;

  for (const d of detections) {
    // Class 0 = healthy, Class 1 = bleached
    const clsId = d.label_short === 'bleached' ? 1 : 0;
    const box = d.bbox;
    const dw = 1.0 / image_size.width;
    const dh = 1.0 / image_size.height;
    const x_center = ((box.x1 + box.x2) / 2.0) * dw;
    const y_center = ((box.y1 + box.y2) / 2.0) * dh;
    const w = (box.x2 - box.x1) * dw;
    const h = (box.y2 - box.y1) * dh;
    output += `${clsId} ${x_center.toFixed(6)} ${y_center.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}\n`;
  }
  return output;
}

interface UploadJob {
  id: string;
  file: File;
  step: 'queued' | 'gps' | 'detecting' | 'saving' | 'done' | 'error';
  gps: { lat: number; lon: number } | null;
  health_score?: number;
  stage?: string;
  error?: string;
  annotated_image?: string;
  yolo_text?: string;
}

function stepLabel(step: UploadJob['step']): string {
  const labels: Record<UploadJob['step'], string> = {
    queued: 'Queued',
    gps: 'Extracting GPS…',
    detecting: 'Analyzing pipeline…',
    saving: 'Saving to DB…',
    done: 'Done',
    error: 'Error',
  };
  return labels[step];
}

function stepPct(step: UploadJob['step']): number {
  const pcts: Record<UploadJob['step'], number> = {
    queued: 5,
    gps: 15,
    detecting: 50,
    saving: 85,
    done: 100,
    error: 100,
  };
  return pcts[step];
}

export default function CoralHealthDetector() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [running, setRunning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const processFile = async (job: UploadJob) => {
    try {
      updateJob(job.id, { step: 'gps' });
      const gps = await extractGPS(job.file);
      updateJob(job.id, { gps });

      updateJob(job.id, { step: 'detecting' });
      const form = new FormData();
      form.append('file', job.file);
      // Default threshold, no UI sliders
      const res = await fetch(`${SPACE2_URL}/analyze`, { method: 'POST', body: form });

      if (!res.ok) {
        throw new Error(`Pipeline error: ${res.status}`);
      }
      const pipelineResult = await res.json();

      // labels for output
      const yolo_text = generateYoloLabels(pipelineResult.detections || [], pipelineResult.summary?.image_size || { width: 640, height: 640 });

      updateJob(job.id, { annotated_image: pipelineResult.annotated_image, yolo_text });

      const avgScore: number = pipelineResult.summary?.avg_health_score ?? 50;
      const dominantStage: string = pipelineResult.summary?.dominant_stage ?? 'Healthy';
      const bleachConf: number = pipelineResult.detections?.[0]?.bleach_confidence ?? (1 - avgScore / 100);
      const { health_score } = getSeverity(bleachConf, bleachConf > 0.5);

      // Conditional DB save based on GPS existence
      if (gps && isSupabaseConfigured) {
        updateJob(job.id, { step: 'saving' });
        const ocean = await fetchAllOceanData(gps.lat, gps.lon);
        const threats = evaluateThreats({ health_score }, [], ocean);
        const image_url = await uploadImageToCloudinary(job.file);

        await saveSnapshot({
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
      }

      updateJob(job.id, { step: 'done', health_score, stage: dominantStage });
    } catch (e: any) {
      updateJob(job.id, { step: 'error', error: e.message ?? 'Unknown error' });
    }
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
    // Processing sequentially to avoid overwhelming local RAM or pipeline max workers,
    for (const job of pending) {
      await processFile(job);
    }
    setRunning(false);
  };

  const handleClear = () => {
    if (!running) setJobs([]);
  };

  const done = jobs.filter((j) => j.step === 'done').length;
  const errors = jobs.filter((j) => j.step === 'error').length;

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const imgFolder = zip.folder('images');
    const labelsFolder = zip.folder('labels');
    if (!imgFolder || !labelsFolder) return;

    jobs.forEach((job) => {
      if (job.step === 'done' && job.annotated_image && job.yolo_text !== undefined) {
        const b64Data = job.annotated_image.split(',')[1];
        if (b64Data) {
          const baseName = job.file.name.replace(/\.[^/.]+$/, "");
          imgFolder.file(`annotated_${job.file.name}`, b64Data, { base64: true });
          labelsFolder.file(`${baseName}.txt`, job.yolo_text);
        }
      }
    });

    // Add a class mapping file for reference
    const refFolder = zip.folder('reference');
    if (refFolder) {
      refFolder.file('classes.txt', "0: healthy_corals\n1: bleached_corals");
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'coral_analysis_results.zip');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#e5f1f7] to-white/90 pt-16 pb-24 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="mx-auto w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-teal-600/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Coral Health Check
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Upload an underwater image and our YOLOv11 model will detect and isolate every coral specimen in real time. Understanding coral health is crucial for reef conservation and early disease detection.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* ── Left: upload + controls ── */}
          <div className="space-y-6">
            <Card className="border shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-white/50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <Upload className="h-5 w-5 text-teal-600" /> Upload Images or Folder
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Drag &amp; drop files/folders here. If images contain GPS they will be automatically saved to the database.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => folderInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${isDragging
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-muted-foreground/25 hover:border-emerald-500/60 hover:bg-emerald-500/5'
                    }`}
                >
                  <Upload className="mx-auto h-10 w-10 mb-2 text-muted-foreground" />
                  <p className="font-semibold">Drop images or folders here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>

                {/* Hidden inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                />
                {/* Input for folder select */}
                <input
                  ref={folderInputRef}
                  type="file"
                  accept="image/*"
                  // @ts-expect-error webkitdirectory is non-standard but widely supported
                  webkitdirectory="true"
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                />

                <div className="flex gap-2 mt-4 justify-center">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Select Files
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                    Select Folder
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {jobs.filter((j) => j.step === 'queued' || j.step === 'error').length > 0 && (
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing {jobs.filter(j => j.step === 'queued').length} items…</>
                  ) : (
                    <><Activity className="mr-2 h-4 w-4" /> Check Coral Health ({jobs.filter((j) => j.step === 'queued').length})</>
                  )}
                </Button>
              )}
              {jobs.length > 0 && !running && (
                <Button variant="outline" onClick={handleClear}>
                  Clear List
                </Button>
              )}
            </div>
          </div>

          {/* ── Right: results/job list ── */}
          <div className="space-y-4">
            <Card className="border-2 h-full min-h-[400px]">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Analysis Progress</CardTitle>
                    <CardDescription>
                      Files loaded: {jobs.length} | Done: {done}
                    </CardDescription>
                  </div>
                  {!running && done > 0 && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      onClick={handleDownloadZip}
                    >
                      <DownloadCloud className="w-4 h-4 mr-2" />
                      Download ZIP (Images + Labels)
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {jobs.length > 0 ? (
                  <div className="divide-y max-h-[500px] overflow-y-auto">
                    {jobs.map((job) => (
                      <div key={job.id} className="p-4 flex flex-col gap-2 hover:bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-medium truncate" title={job.file.webkitRelativePath || job.file.name}>
                              {job.file.webkitRelativePath || job.file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {job.gps ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">GPS Found (Saving to DB)</Badge>
                              ) : job.step === 'done' || job.step === 'saving' || job.step === 'detecting' ? (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">No GPS (Skip DB)</Badge>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">
                                {job.step === 'error' ? `❌ ${job.error}` : stepLabel(job.step)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            {job.step === 'done' && job.health_score != null && (
                              <SeverityBadge
                                healthScore={job.health_score}
                                stage={(job.stage ?? 'Healthy') as BleachStage}
                                size="sm"
                                showScore
                              />
                            )}
                            {(job.step === 'detecting' || job.step === 'saving' || job.step === 'gps') && (
                              <Loader2 className="h-4 w-4 animate-spin text-emerald-500 shrink-0" />
                            )}
                            {job.step === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />}
                            <button
                              className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
                              onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}
                              title="Remove from list"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <Progress
                          value={stepPct(job.step)}
                          className={`h-1.5 ${job.step === 'error' ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-muted-foreground p-8 text-center bg-white/20">
                    <Activity className="h-12 w-12 opacity-20 mb-4 text-teal-600" />
                    <p className="text-sm font-medium text-slate-500">
                      Upload single or bulk coral images to analyze them.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
