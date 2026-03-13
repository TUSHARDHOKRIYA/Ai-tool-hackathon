import { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Waves,
  ZoomIn,
  HeartPulse,
  ShieldAlert,
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
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCoralDetection } from "@/hooks/use-coral-detection";
import { useCoralClassification } from "@/hooks/use-coral-classification";
import type { CoralDetection } from "@/lib/coral-detection/types";
import type { ClassificationResult } from "@/lib/coral-classification/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function detectionConfColor(confidence: number): string {
  if (confidence >= 0.75) return "bg-emerald-500";
  if (confidence >= 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

// ── Crop Card ─────────────────────────────────────────────────────────────────

interface CropCardProps {
  detection: CoralDetection;
  index: number;
  classification?: ClassificationResult;
  classifying: boolean;
  onZoom: (src: string, index: number) => void;
}

function CropCard({
  detection,
  index,
  classification,
  classifying,
  onZoom,
}: CropCardProps) {
  const src = `data:image/png;base64,${detection.crop_b64}`;
  const detConf = detection.confidence;
  const detColor = detectionConfColor(detConf);

  const isHealthy = classification?.predicted_class === "healthy_corals";
  const isBleached = classification?.predicted_class === "bleached_corals";

  return (
    <div
      className={`group relative flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm transition-all hover:shadow-md ${
        isBleached
          ? "border-red-400/50"
          : isHealthy
          ? "border-emerald-400/50"
          : "border-muted hover:border-emerald-500/40"
      }`}
    >
      {/* Crop image */}
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-square">
        <img
          src={src}
          alt={`Coral detection ${index + 1}`}
          className="h-full w-full object-cover"
        />
        {/* Classification overlay banner */}
        {classification && (
          <div
            className={`absolute bottom-0 left-0 right-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white ${
              isHealthy ? "bg-emerald-600/90" : "bg-red-600/90"
            }`}
          >
            {isHealthy ? (
              <HeartPulse className="h-3 w-3" />
            ) : (
              <ShieldAlert className="h-3 w-3" />
            )}
            {isHealthy ? "Healthy" : "Bleached"}
          </div>
        )}
        {/* Classifying spinner */}
        {classifying && !classification && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        {/* Zoom overlay */}
        <button
          onClick={() => onZoom(src, index)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
          aria-label={`Zoom coral ${index + 1}`}
        >
          <ZoomIn className="h-6 w-6 text-white drop-shadow" />
        </button>
      </div>

      {/* Meta */}
      <div className="space-y-1 px-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Coral #{index + 1}</span>
          {classification ? (
            <Badge
              className={`text-[10px] px-1.5 py-0 text-white ${
                isHealthy ? "bg-emerald-500" : "bg-red-500"
              }`}
            >
              {pct(classification.confidence)}
            </Badge>
          ) : (
            <Badge
              className={`${detColor} text-white text-[10px] px-1.5 py-0`}
            >
              {pct(detConf)}
            </Badge>
          )}
        </div>

        {/* Detection confidence bar */}
        <div className="flex items-center gap-1">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                classification
                  ? isHealthy
                    ? "bg-emerald-500"
                    : "bg-red-500"
                  : detColor
              }`}
              style={{
                width: pct(classification?.confidence ?? detConf),
              }}
            />
          </div>
        </div>

        {/* Classification scores */}
        {classification?.scores && (
          <div className="space-y-0.5 pt-0.5">
            {Object.entries(classification.scores).map(([cls, score]) => (
              <div key={cls} className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>{cls === "healthy_corals" ? "Healthy" : "Bleached"}</span>
                <span className="font-mono">{pct(score)}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {Math.round(detection.bbox.x2 - detection.bbox.x1)} ×{" "}
          {Math.round(detection.bbox.y2 - detection.bbox.y1)} px
        </p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const CoralHealthDetector = () => {
  const [conf, setConf] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { analyze, result, state, error, modelWarning, reset } =
    useCoralDetection({ conf, iou });

  const {
    classify,
    results: classResults,
    state: classState,
    error: classError,
    reset: resetClass,
  } = useCoralClassification();

  const isProcessing =
    state === "loading" || state === "uploading" || state === "cold-start";
  const isClassifying = classState === "loading";

  // ── Prepare a lookup map: detection index → classification result ──────────
  const classMap = new Map<number, ClassificationResult>(
    classResults.map((r) => [r.id, r])
  );

  // ── File handling ─────────────────────────────────────────────────────────
  const applyFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setSelectedFile(file);
    setErrorDismissed(false);
    setPreviewUrl(URL.createObjectURL(file));
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
    resetClass();
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorDismissed(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setErrorDismissed(false);
    resetClass();
    await analyze(selectedFile);
  };

  const handleClassify = async () => {
    if (!result || result.detections.length === 0) return;
    await classify(
      result.detections.map((d, i) => ({ id: i, crop_b64: d.crop_b64 }))
    );
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const avgConf =
    result && result.detections.length > 0
      ? result.detections.reduce((acc, d) => acc + d.confidence, 0) /
        result.detections.length
      : 0;

  const healthyCount = classResults.filter(
    (r) => r.predicted_class === "healthy_corals"
  ).length;
  const bleachedCount = classResults.filter(
    (r) => r.predicted_class === "bleached_corals"
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Model warning */}
      {modelWarning && (
        <Alert className="border-yellow-500/40 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {modelWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* Detection error banner */}
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

      {/* Classification error banner */}
      {classState === "error" && classError && (
        <Alert className="border-red-500/40 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700 dark:text-red-400">
            Classification error: {classError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* ── Left: upload + controls ─────────────────────────────────────── */}
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
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/25 hover:border-emerald-500/60 hover:bg-emerald-500/5"
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
                  className="[&_[role=slider]]:bg-emerald-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Permissive (0.1)</span>
                  <span>Strict (0.9)</span>
                </div>
              </div>

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
                  className="[&_[role=slider]]:bg-emerald-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Allow overlap (0.1)</span>
                  <span>Strict NMS (0.9)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold"
              disabled={!selectedFile || isProcessing}
              onClick={handleAnalyze}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {state === "cold-start" ? "Model waking up…" : "Detecting…"}
                </>
              ) : (
                <>
                  <Waves className="mr-2 h-4 w-4" />
                  Detect Corals
                </>
              )}
            </Button>
            <Button
              variant="outline"
              disabled={isProcessing || isClassifying}
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Cold-start alert */}
          {state === "cold-start" && (
            <Alert className="border-blue-500/40 bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Model is waking up — this may take 30–60 s on first use. Please
                wait…
              </AlertDescription>
            </Alert>
          )}

          {/* Classify Health button — shown after successful detection */}
          {state === "success" &&
            result &&
            result.detections.length > 0 &&
            classState === "idle" && (
              <Button
                className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold"
                onClick={handleClassify}
              >
                <HeartPulse className="mr-2 h-4 w-4" />
                Classify Health (bleached / healthy)
              </Button>
            )}

          {isClassifying && (
            <Alert className="border-pink-500/40 bg-pink-500/10">
              <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
              <AlertDescription className="text-pink-700 dark:text-pink-400">
                Running ResNet-50 classification on {result?.detections.length}{" "}
                coral crop{result?.detections.length !== 1 ? "s" : ""}…
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* ── Right: results ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {state === "success" && result ? (
            <>
              {/* Stats summary */}
              <Card className="border-2 border-emerald-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Analysis Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classState === "success" && classResults.length > 0 ? (
                    /* Classification summary */
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-500">
                          {healthyCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Healthy
                        </p>
                      </div>
                      <div className="rounded-lg bg-red-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-red-500">
                          {bleachedCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bleached
                        </p>
                      </div>
                      <div className="rounded-lg bg-teal-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-teal-500">
                          {result.detections.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Detection summary */
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-500">
                          {result.detections.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Corals Found
                        </p>
                      </div>
                      <div className="rounded-lg bg-teal-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-teal-500">
                          {pct(avgConf)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg Confidence
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                        <p className="text-2xl font-bold text-blue-500">
                          {result.image_size.width}×{result.image_size.height}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Image (px)
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health bar (only after classification) */}
              {classState === "success" && classResults.length > 0 && (
                <div className="flex overflow-hidden rounded-full h-3">
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{
                      width: `${(healthyCount / classResults.length) * 100}%`,
                    }}
                    title={`${healthyCount} healthy`}
                  />
                  <div
                    className="bg-red-500 transition-all"
                    style={{
                      width: `${(bleachedCount / classResults.length) * 100}%`,
                    }}
                    title={`${bleachedCount} bleached`}
                  />
                </div>
              )}

              {/* Original image */}
              <Card className="border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Original Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={`data:image/png;base64,${result.original_image_b64}`}
                    alt="Original uploaded image"
                    className="mx-auto max-h-56 w-full rounded-lg object-contain shadow"
                  />
                </CardContent>
              </Card>

              {/* Coral crops grid */}
              {result.detections.length > 0 ? (
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Detected Corals ({result.detections.length})
                    </CardTitle>
                    <CardDescription>
                      {classState === "success"
                        ? "Green border = healthy · Red border = bleached"
                        : <>Click any crop to zoom · Use <strong>Classify Health</strong> to analyse each coral</>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-72 px-4">
                      <div className="grid grid-cols-3 gap-3 py-3">
                        {result.detections.map((d, i) => (
                          <CropCard
                            key={i}
                            detection={d}
                            index={i}
                            classification={classMap.get(i)}
                            classifying={isClassifying}
                            onZoom={(src, idx) => {
                              setZoomSrc(src);
                              setZoomIndex(idx);
                            }}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Alert className="border-yellow-500/40 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    No coral detected at the current thresholds. Try lowering
                    the confidence threshold.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            /* Idle / loading placeholder */
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                  <p className="text-sm font-medium">
                    {state === "cold-start"
                      ? "Model waking up, please wait…"
                      : "Detecting corals…"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <Waves className="h-12 w-12 opacity-30" />
                  <p className="text-sm">
                    Upload an image and click{" "}
                    <strong>Detect Corals</strong> to see results here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zoom dialog */}
      <Dialog
        open={zoomSrc !== null}
        onOpenChange={(open) => !open && setZoomSrc(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Coral #{zoomIndex + 1}
              {classMap.get(zoomIndex) && (
                <Badge
                  className={`ml-2 text-white ${
                    classMap.get(zoomIndex)?.predicted_class ===
                    "healthy_corals"
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                >
                  {classMap.get(zoomIndex)?.predicted_class === "healthy_corals"
                    ? "Healthy"
                    : "Bleached"}{" "}
                  · {pct(classMap.get(zoomIndex)?.confidence ?? 0)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {zoomSrc && (
            <img
              src={zoomSrc}
              alt={`Zoomed coral ${zoomIndex + 1}`}
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoralHealthDetector;
