import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Fish,
  Loader2,
  Clock,
  Save,
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
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMarineDebris } from "@/hooks/use-marine-debris";
import { saveDebrisEvent } from "@/lib/db";
import { extractGPS } from "@/lib/exif";
import { useToast } from "@/hooks/use-toast";

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

// ─────────────────────────────────────────────────────────────────────────────

const MarineDebrisDetector = () => {
  // ── local state ──────────────────────────────────────────────────────────
  const [conf, setConf] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [debrisGps, setDebrisGps] = useState<{ lat: string; lon: string }>({ lat: '', lon: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── hook ─────────────────────────────────────────────────────────────────
  const { detect, result, state, error, modelWarning, reset } =
    useMarineDebris({ conf, iou });

  const isProcessing =
    state === "loading" || state === "uploading" || state === "cold-start";

  // ── file selection ───────────────────────────────────────────────────────
  const applyFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setErrorDismissed(false);
    setSaved(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    // Auto-extract GPS
    extractGPS(file).then((gps) => {
      if (gps) {
        setDebrisGps({ lat: gps.lat.toFixed(4), lon: gps.lon.toFixed(4) });
      }
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorDismissed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDetect = async () => {
    if (!selectedFile) return;
    setErrorDismissed(false);
    await detect(selectedFile);
  };

  // ── derived ──────────────────────────────────────────────────────────────
  const byClass = result?.summary.by_class ?? {};
  const maxCount = Math.max(...Object.values(byClass), 1);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Model warning ─────────────────────────────────────────────────── */}
      {modelWarning && (
        <Alert className="border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {modelWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {state === "error" && error && !errorDismissed && (
        <Alert className="border-red-500/40 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-red-700 dark:text-red-400">{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setErrorDismissed(true)}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Left column: upload + controls ────────────────────────────── */}
        <div className="space-y-4">
          {/* Upload zone */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upload Image</CardTitle>
              <CardDescription>
                Drag &amp; drop or click to select · JPG, PNG, WEBP
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/25 hover:border-orange-500/60 hover:bg-orange-500/5"
                  } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Selected preview"
                    className="mx-auto max-h-64 rounded-lg object-contain shadow"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">Drop image here</p>
                      <p className="text-sm text-muted-foreground">
                        or click to browse
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* File name */}
              {selectedFile && (
                <p className="mt-2 truncate text-center text-xs text-muted-foreground">
                  {selectedFile.name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Threshold controls */}
          <Card className="border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detection Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Confidence</span>
                  <Badge variant="secondary">{conf.toFixed(2)}</Badge>
                </div>
                <Slider
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[conf]}
                  onValueChange={([v]) => setConf(v)}
                  disabled={isProcessing}
                  className="[&_[role=slider]]:bg-orange-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Permissive (0.1)</span>
                  <span>Strict (0.9)</span>
                </div>
              </div>

              {/* IOU */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">IOU (overlap)</span>
                  <Badge variant="secondary">{iou.toFixed(2)}</Badge>
                </div>
                <Slider
                  min={0.1}
                  max={0.9}
                  step={0.05}
                  value={[iou]}
                  onValueChange={([v]) => setIou(v)}
                  disabled={isProcessing}
                  className="[&_[role=slider]]:bg-orange-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Allow overlap (0.1)</span>
                  <span>Strict NMS (0.9)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold"
              disabled={!selectedFile || isProcessing}
              onClick={handleDetect}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {state === "cold-start"
                    ? "Model waking up…"
                    : "Detecting…"}
                </>
              ) : (
                <>
                  <Fish className="mr-2 h-4 w-4" />
                  Detect Debris
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isProcessing}
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Cold-start message */}
          {state === "cold-start" && (
            <Alert className="border-blue-500/40 bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Model is waking up — this may take 30–60 s on first use. Please
                wait…
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ── Right column: results ──────────────────────────────────────── */}
        <div className="space-y-4">
          {state === "success" && result ? (
            <>
              {/* Annotated image */}
              <Card className="border-2 border-green-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Detection Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={result.annotated_image}
                    alt="Annotated detection result"
                    className="mx-auto max-h-72 w-full rounded-lg object-contain shadow-md"
                  />
                </CardContent>
              </Card>

              {/* Summary card */}
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-orange-500">
                        {result.summary.total_debris}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Debris
                      </p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-500">
                        {pct(result.summary.avg_confidence)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg Confidence
                      </p>
                    </div>
                  </div>

                  {/* By-class breakdown */}
                  {Object.keys(byClass).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">By Class</p>
                      {Object.entries(byClass).map(([cls, count]) => (
                        <div key={cls} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${classColor(cls)}`}
                              />
                              {formatLabel(cls)}
                            </span>
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-xs"
                            >
                              {count}
                            </Badge>
                          </div>
                          <Progress
                            value={(count / maxCount) * 100}
                            className="h-1.5"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pill badges */}
                  {Object.keys(byClass).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(byClass).map(([cls]) => (
                        <Badge
                          key={cls}
                          className={`${classColor(cls)} text-white text-xs`}
                        >
                          {formatLabel(cls)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save to Database */}
              <Card className="border-2 border-blue-500/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Save className="h-4 w-4 text-blue-500" /> Save Detection to Database
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      type="number"
                      step="0.0001"
                      value={debrisGps.lat}
                      onChange={(e) => setDebrisGps(prev => ({ ...prev, lat: e.target.value }))}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Longitude"
                      type="number"
                      step="0.0001"
                      value={debrisGps.lon}
                      onChange={(e) => setDebrisGps(prev => ({ ...prev, lon: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                    disabled={saving || saved || !debrisGps.lat || !debrisGps.lon}
                    onClick={async () => {
                      setSaving(true);
                      const ok = await saveDebrisEvent({
                        lat: parseFloat(debrisGps.lat),
                        lon: parseFloat(debrisGps.lon),
                        total_debris: result.summary.total_debris,
                        by_class: result.summary.by_class,
                        avg_confidence: result.summary.avg_confidence,
                        image_url: result.annotated_image,
                      });
                      setSaving(false);
                      if (ok) {
                        setSaved(true);
                        toast({ title: 'Saved!', description: 'Debris event stored in database.' });
                      } else {
                        toast({ title: 'Error', description: 'Failed to save — check Supabase config & debris_events table.', variant: 'destructive' });
                      }
                    }}
                  >
                    {saved ? <><CheckCircle2 className="mr-1 h-3 w-3" /> Saved</>
                      : saving ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving...</>
                        : <><Save className="mr-1 h-3 w-3" /> Save to Database</>}
                  </Button>
                </CardContent>
              </Card>

              {/* Detections list */}
              {result.detections.length > 0 && (
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Detections ({result.detections.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-56 px-4">
                      <div className="space-y-2 py-3">
                        {result.detections.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-start justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${classColor(d.class_name)}`}
                                />
                                <span className="font-semibold">
                                  {formatLabel(d.class_name)}
                                </span>
                              </div>
                              <p className="text-muted-foreground">
                                bbox: ({Math.round(d.bbox.x1)},{" "}
                                {Math.round(d.bbox.y1)}) → (
                                {Math.round(d.bbox.x2)},{" "}
                                {Math.round(d.bbox.y2)})
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="ml-2 shrink-0 font-mono"
                            >
                              {pct(d.confidence)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* No debris found */}
              {result.detections.length === 0 && (
                <Alert className="border-green-500/40 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    No debris detected in this image at the current thresholds.
                    Try lowering the confidence threshold.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            /* Placeholder when no results */
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                  <p className="text-sm font-medium">
                    {state === "cold-start"
                      ? "Model waking up, please wait…"
                      : "Analyzing image…"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <Fish className="h-12 w-12 opacity-30" />
                  <p className="text-sm">
                    Upload an image and click{" "}
                    <strong>Detect Debris</strong> to see results here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarineDebrisDetector;
