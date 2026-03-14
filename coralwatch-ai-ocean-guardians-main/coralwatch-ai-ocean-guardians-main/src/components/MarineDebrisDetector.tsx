import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Fish,
  Loader2,
  Clock,
  Save,
  Waves,
  DownloadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchHealth, fetchDetect } from "@/lib/marine-debris/api";
import { saveDebrisEvent } from "@/lib/db";
import { extractGPS } from "@/lib/exif";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, string> = {
  plastic_bottle: "bg-blue-500",
  plastic_bag: "bg-cyan-500",
  fishing_net: "bg-purple-500",
  rope: "bg-yellow-500",
  foam: "bg-green-500",
  metal_debris: "bg-gray-500",
  wood_debris: "bg-amber-700",
  other_debris: "bg-rose-500",
};

function classColor(name: string): string {
  return CLASS_COLORS[name] ?? "bg-slate-500";
}

function formatLabel(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ── Upload Job types ─────────────────────────────────────────────────────────

interface UploadJob {
  id: string;
  file: File;
  step: 'queued' | 'gps' | 'detecting' | 'done' | 'error';
  gps: { lat: number; lon: number } | null;
  result?: any;
  error?: string;
}

function stepLabel(step: UploadJob['step']): string {
  const labels: Record<UploadJob['step'], string> = {
    queued: 'Queued',
    gps: 'Extracting GPS…',
    detecting: 'Detecting debris…',
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
    done: 100,
    error: 100,
  };
  return pcts[step];
}

// ─────────────────────────────────────────────────────────────────────────────

const MarineDebrisDetector = () => {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [running, setRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const updateJob = useCallback((id: string, patch: Partial<UploadJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const processFile = async (job: UploadJob) => {
    try {
      updateJob(job.id, { step: 'gps' });
      const gps = await extractGPS(job.file);
      updateJob(job.id, { gps });

      updateJob(job.id, { step: 'detecting' });
      const data = await fetchDetect(job.file, 0.25, 0.45);

      updateJob(job.id, { step: 'done', result: data });
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
    if (!imgFolder) return;

    jobs.forEach((job) => {
      if (job.step === 'done' && job.result?.annotated_image) {
        const b64Data = job.result.annotated_image.split(',')[1];
        if (b64Data) {
          imgFolder.file(`annotated_${job.file.name}`, b64Data, { base64: true });
        }
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'debris_detection_results.zip');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* ── Left: upload + controls ── */}
          <div className="space-y-6">
            <Card className="border shadow-sm bg-white/50 backdrop-blur-sm overflow-hidden">
              <CardHeader className="bg-white/50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                  <Upload className="h-5 w-5 text-teal-600" /> Upload Images or Folder
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Drag &amp; drop files/folders here, or use the buttons below. If images contain GPS data, coordinates will be auto-extracted.
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
                    : 'border-muted-foreground/25 hover:border-orange-500/60 hover:bg-orange-500/5'
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
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold"
                  onClick={handleRun}
                  disabled={running}
                >
                  {running ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing {jobs.filter(j => j.step === 'queued').length} items…</>
                  ) : (
                    <><Fish className="mr-2 h-4 w-4" /> Detect Debris ({jobs.filter((j) => j.step === 'queued').length})</>
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
                      Download ZIP
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
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">GPS Found</Badge>
                              ) : job.step === 'done' || job.step === 'detecting' ? (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">No GPS</Badge>
                              ) : null}
                              <span className="text-[11px] text-muted-foreground">
                                {job.step === 'error' ? `❌ ${job.error}` : stepLabel(job.step)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            {job.step === 'done' && job.result && (
                              <Badge className="bg-orange-500 text-white text-xs">
                                {job.result.summary?.total_debris ?? 0} debris
                              </Badge>
                            )}
                            {(job.step === 'detecting' || job.step === 'gps') && (
                              <Loader2 className="h-4 w-4 animate-spin text-orange-500 shrink-0" />
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
                          className={`h-1.5 ${job.step === 'error' ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-500'}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-muted-foreground p-8 text-center bg-white/20">
                    <Fish className="h-12 w-12 opacity-20 mb-4 text-orange-500" />
                    <p className="text-sm font-medium text-slate-500">
                      Upload single or bulk images to detect marine debris.
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
};

export default MarineDebrisDetector;
