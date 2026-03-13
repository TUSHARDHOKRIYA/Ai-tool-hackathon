// ─────────────────────────────────────────────────────────────────────────────
// Coral Detection API — shared TypeScript types
// Base URL: https://degree-checker-01-coral-detection-api.hf.space
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /health ──────────────────────────────────────────────────────────────

export interface CoralHealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
}

// ── POST /detect ─────────────────────────────────────────────────────────────

export interface CoralBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CoralDetection {
  bbox: CoralBoundingBox;
  confidence: number;
  /** Base64-encoded PNG crop of the detected coral region */
  crop_b64: string;
}

export interface CoralImageSize {
  width: number;
  height: number;
}

export interface CoralDetectResponse {
  detections: CoralDetection[];
  /** Base64-encoded original image (not annotated) */
  original_image_b64: string;
  image_size: CoralImageSize;
}

// ── Hook config & state ──────────────────────────────────────────────────────

export interface UseCoralDetectionConfig {
  conf?: number;
  iou?: number;
}

export type CoralDetectionState =
  | "idle"
  | "uploading"
  | "loading"
  | "cold-start"
  | "success"
  | "error";
