// ─────────────────────────────────────────────────────────────────────────────
// Marine Debris Detection API — shared TypeScript types
// Base URL: https://degree-checker-01-marine-debris-detection.hf.space
// ─────────────────────────────────────────────────────────────────────────────

export type DebrisClassName =
  | "plastic_bottle"
  | "plastic_bag"
  | "fishing_net"
  | "rope"
  | "foam"
  | "metal_debris"
  | "wood_debris"
  | "other_debris";

// ── GET /health ──────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  classes: string[];
  num_classes: number;
  device: string;
}

// ── POST /detect ─────────────────────────────────────────────────────────────

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  id: number;
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
  width: number;
  height: number;
}

export interface DetectionSummary {
  total_debris: number;
  by_class: Record<string, number>;
  avg_confidence: number;
  image_size: { width: number; height: number };
  conf_threshold: number;
  iou_threshold: number;
}

export interface DetectResponse {
  success: boolean;
  annotated_image: string; // base64 data URI — use directly as <img src={...} />
  detections: Detection[];
  summary: DetectionSummary;
}

// ── Hook config & state ──────────────────────────────────────────────────────

export interface UseMarineDebrisConfig {
  conf?: number;
  iou?: number;
}

export type DetectionState =
  | "idle"
  | "uploading"
  | "loading"
  | "cold-start"
  | "success"
  | "error";
