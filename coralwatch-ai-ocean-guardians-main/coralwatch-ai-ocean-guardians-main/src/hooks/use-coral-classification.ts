// ─────────────────────────────────────────────────────────────────────────────
// useCoralClassification – runs ResNet-50 classification on coral crop images
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";
import { fetchClassify } from "@/lib/coral-classification/api";
import type {
  ClassificationResult,
  CropItem,
} from "@/lib/coral-classification/types";

export type ClassificationState = "idle" | "loading" | "success" | "error";

interface UseCoralClassificationReturn {
  classify: (crops: CropItem[]) => Promise<void>;
  results: ClassificationResult[];
  state: ClassificationState;
  error: string | null;
  reset: () => void;
}

export function useCoralClassification(): UseCoralClassificationReturn {
  const [state, setState] = useState<ClassificationState>("idle");
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const classify = useCallback(async (crops: CropItem[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("loading");
    setError(null);
    setResults([]);

    try {
      const response = await fetchClassify({ crops }, controller.signal);
      setResults(response.results);
      setState("success");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setError(
        err instanceof Error ? err.message : "Classification failed unexpectedly."
      );
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setResults([]);
    setError(null);
  }, []);

  return { classify, results, state, error, reset };
}
