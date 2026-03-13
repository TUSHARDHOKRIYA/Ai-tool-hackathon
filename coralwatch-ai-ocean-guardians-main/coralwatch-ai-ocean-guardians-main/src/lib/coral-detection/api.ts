// ─────────────────────────────────────────────────────────────────────────────
// Coral Detection API — fetch layer
// ─────────────────────────────────────────────────────────────────────────────

import type { CoralHealthResponse, CoralDetectResponse } from "./types";

const BASE_URL = "https://degree-checker-01-coral-detection-api.hf.space";

export async function fetchCoralHealth(): Promise<CoralHealthResponse> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<CoralHealthResponse>;
}

export async function fetchCoralDetect(
  file: File,
  conf: number,
  iou: number,
  signal?: AbortSignal
): Promise<CoralDetectResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${BASE_URL}/detect`);
  url.searchParams.set("conf", conf.toString());
  url.searchParams.set("iou", iou.toString());

  const res = await fetch(url.toString(), {
    method: "POST",
    body: formData,
    signal,
  });

  if (!res.ok) {
    let message = `Detection failed: ${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<CoralDetectResponse>;
}
