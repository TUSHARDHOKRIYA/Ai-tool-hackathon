// ─────────────────────────────────────────────────────────────────────────────
// useMarineDebris – custom hook for Marine Debris Detection API
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchHealth, fetchDetect } from "@/lib/marine-debris/api";
import type {
  DetectResponse,
  DetectionState,
  UseMarineDebrisConfig,
} from "@/lib/marine-debris/types";

const COLD_START_THRESHOLD_MS = 5_000;

interface UseMarineDebrisReturn {
  detect: (file: File) => Promise<void>;
  result: DetectResponse | null;
  state: DetectionState;
  error: string | null;
  modelWarning: string | null;
  reset: () => void;
}

export function useMarineDebris(
  config: UseMarineDebrisConfig = {}
): UseMarineDebrisReturn {
  const { conf = 0.25, iou = 0.45 } = config;

  const [state, setState] = useState<DetectionState>("idle");
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelWarning, setModelWarning] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Health check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((health) => {
        if (!cancelled && !health.model_loaded) {
          setModelWarning(
            "The detection model is not yet loaded on the server. Your first request may take longer."
          );
        }
      })
      .catch(() => {
        // Health check failure is non-fatal; silently ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── detect ─────────────────────────────────────────────────────────────────
  const detect = useCallback(
    async (file: File) => {
      // Cancel any ongoing request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setResult(null);
      setState("uploading");

      // Show cold-start warning if the request takes more than 5s
      const coldStartTimer = setTimeout(() => {
        setState("cold-start");
      }, COLD_START_THRESHOLD_MS);

      setState("loading");

      try {
        const data = await fetchDetect(file, conf, iou, controller.signal);
        clearTimeout(coldStartTimer);
        setResult(data);
        setState("success");
      } catch (err: unknown) {
        clearTimeout(coldStartTimer);
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled — return to idle quietly
          setState("idle");
          return;
        }
        setState("error");
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    },
    [conf, iou]
  );

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setResult(null);
    setError(null);
  }, []);

  return { detect, result, state, error, modelWarning, reset };
}
