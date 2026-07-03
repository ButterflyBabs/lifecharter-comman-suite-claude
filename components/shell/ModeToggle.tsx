"use client";

import { useState } from "react";

// Phase 1 keeps this as local UI state — persisting the selected mode
// per user/workspace is a Phase 2 refinement once Build Mode and Run Mode
// actually change roadmap/review behavior (Section 18, Phase 2).
export function ModeToggle() {
  const [mode, setMode] = useState<"build" | "run">("build");

  return (
    <div role="group" aria-label="Build or Run mode" className="flex rounded border border-soft-taupe text-sm">
      <button
        type="button"
        aria-pressed={mode === "build"}
        onClick={() => setMode("build")}
        className={`rounded-l px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
          mode === "build" ? "bg-deep-indigo text-white" : "text-deep-indigo"
        }`}
      >
        Build
      </button>
      <button
        type="button"
        aria-pressed={mode === "run"}
        onClick={() => setMode("run")}
        className={`rounded-r px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
          mode === "run" ? "bg-deep-indigo text-white" : "text-deep-indigo"
        }`}
      >
        Run
      </button>
    </div>
  );
}
