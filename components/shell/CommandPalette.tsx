"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { COMMAND_PALETTE_ROUTES } from "@/lib/command-palette-routes";

// Section 16.2 (Voice-first and low-friction design): "Command palette and
// keyboard shortcuts" — a keyboard-only way to jump to any canonical route
// without navigating the sidebar tree, for people who rely on dictation,
// switch control, or reduced fine-motor input. Cmd/Ctrl+K opens it; the
// header's visible "Jump to..." button (Header.tsx) opens the same dialog
// for anyone without a keyboard shortcut memorized.
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? COMMAND_PALETTE_ROUTES.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()))
    : COMMAND_PALETTE_ROUTES;

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlighted(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function navigateTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleInputKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      const target = results[highlighted];
      if (target) navigateTo(target.href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
        aria-haspopup="dialog"
      >
        Jump to&hellip; (&#8984;K)
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Jump to a page"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div className="lc-card w-full max-w-lg p-4" onClick={(e) => e.stopPropagation()}>
            <label htmlFor="command-palette-input" className="sr-only">
              Search pages
            </label>
            <input
              id="command-palette-input"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Jump to a page..."
              className="w-full rounded border border-soft-taupe px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
            />

            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto" role="listbox" aria-label="Matching pages">
              {results.map((r, i) => (
                <li key={r.href} role="option" aria-selected={i === highlighted}>
                  <button
                    type="button"
                    onClick={() => navigateTo(r.href)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
                      i === highlighted ? "bg-soft-lavender/20" : ""
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className="text-xs text-soft-taupe">{r.section}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-2 text-sm text-soft-taupe">No matching pages.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
