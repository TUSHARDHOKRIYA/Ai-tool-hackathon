// ─────────────────────────────────────────────────────────────────────────────
// useCoralDetection – custom hook for the Coral Detection API
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchCoralHealth, fetchCoralDetect } from "@/lib/coral-detection/api";
import type {
  CoralDetectResponse,
  CoralDetectionState,
  UseCoralDetectionConfig,
} from "@/lib/coral-detection/types";

const COLD_START_THRESHOLD_MS = 5_000;

interface UseCoralDetectionReturn {
  analyze: (file: File) => Promise<void>;
  result: CoralDetectResponse | null;
  state: CoralDetectionState;
  error: string | null;
  modelWarning: string | null;
  reset: () => void;
}

export function useCoralDetection(
  config: UseCoralDetectionConfig = {}
): UseCoralDetectionReturn {
  const { conf = 0.25, iou = 0.45 } = config;

  const [state, setState] = useState<CoralDetectionState>("idle");
  const [result, setResult] = useState<CoralDetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelWarning, setModelWarning] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── Health check on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetchCoralHealth()
      .then((health) => {
        if (!cancelled && !health.model_loaded) {
          setModelWarning(
            "The coral detection model is not yet loaded on the server. Your first request may take longer."
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

  // ── analyze ────────────────────────────────────────────────────────────────
  const analyze = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setResult(null);
      setState("loading");

      // Cold-start banner if request takes > 5s
      const coldStartTimer = setTimeout(() => {
        setState("cold-start");
      }, COLD_START_THRESHOLD_MS);

      try {
        const data = await fetchCoralDetect(file, conf, iou, controller.signal);
        clearTimeout(coldStartTimer);
        setResult(data);
        setState("success");
      } catch (err: unknown) {
        clearTimeout(coldStartTimer);
        if (err instanceof Error && err.name === "AbortError") {
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

  return { analyze, result, state, error, modelWarning, reset };
}
