// ─────────────────────────────────────────────────────────────────────────────
// Coral Classification API (ResNet-50) — fetch layer
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CoralClassificationHealth,
  ClassifyBatchRequest,
  ClassifyBatchResponse,
} from "./types";

const BASE_URL =
  "https://degree-checker-01-coral-classification-resnet.hf.space";

export async function fetchClassificationHealth(): Promise<CoralClassificationHealth> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<CoralClassificationHealth>;
}

export async function fetchClassify(
  request: ClassifyBatchRequest,
  signal?: AbortSignal
): Promise<ClassifyBatchResponse> {
  const res = await fetch(`${BASE_URL}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok) {
    let message = `Classification failed: ${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<ClassifyBatchResponse>;
}
