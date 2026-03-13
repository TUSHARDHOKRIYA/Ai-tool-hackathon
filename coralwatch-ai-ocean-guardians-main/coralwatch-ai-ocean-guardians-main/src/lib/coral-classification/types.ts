// ─────────────────────────────────────────────────────────────────────────────
// Coral Classification API (ResNet-50) — shared TypeScript types
// Base URL: https://degree-checker-01-coral-classification-resnet.hf.space
// ─────────────────────────────────────────────────────────────────────────────

export type CoralClass = "bleached_corals" | "healthy_corals";

// ── GET /health ──────────────────────────────────────────────────────────────

export interface CoralClassificationHealth {
  status: string;
  model_loaded: boolean;
  device: string;
  classes: CoralClass[];
}

// ── POST /classify ────────────────────────────────────────────────────────────

export interface CropItem {
  id: number;
  /** Raw base64 string (no data URI prefix) */
  crop_b64: string;
}

export interface ClassifyBatchRequest {
  crops: CropItem[];
}

export interface ClassificationResult {
  id: number;
  predicted_class: CoralClass;
  confidence: number;
  /** Map of class → probability score */
  scores: Record<CoralClass, number>;
}

export interface ClassifyBatchResponse {
  results: ClassificationResult[];
}
