"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { PipelineProgress } from "@/lib/types";

interface PipelineContextValue {
  running: boolean;
  progress: PipelineProgress | null;
  runPipeline: (params: { configName: string; maxVideos: number; topK: number; nDays: number }) => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELED", "CRASHED", "TIMED_OUT"]);

export function PipelineProvider({ children }: { children: React.ReactNode }) {
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string | undefined>(undefined);
  const [publicToken, setPublicToken] = useState<string | undefined>(undefined);

  const { run } = useRealtimeRun(runId, {
    accessToken: publicToken,
    enabled: !!runId && !!publicToken,
  });

  // Stop the local "running" spinner once the task reaches a terminal state
  useEffect(() => {
    if (run?.status && TERMINAL_STATUSES.has(run.status)) {
      setRunning(false);
    }
  }, [run?.status]);

  const progress = (run?.metadata?.progress as PipelineProgress) ?? null;

  const isRunning = running || run?.status === "EXECUTING" || run?.status === "QUEUED";

  const runPipeline = useCallback(
    async (params: { configName: string; maxVideos: number; topK: number; nDays: number }) => {
      if (isRunning) return;
      setRunning(true);
      setRunId(undefined);
      setPublicToken(undefined);

      try {
        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        if (!response.ok) throw new Error(`Failed to start pipeline: ${response.status}`);

        const data = await response.json();
        setRunId(data.runId);
        setPublicToken(data.publicToken);
      } catch (err) {
        setRunning(false);
        console.error("Pipeline trigger failed:", err);
      }
    },
    [isRunning]
  );

  return (
    <PipelineContext.Provider value={{ running: isRunning, progress, runPipeline }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
  return ctx;
}
