"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveDashboardLayout } from "@/lib/dashboard/actions";
import type { DashboardLayout, LayoutMode, WidgetDefinition } from "@/lib/dashboard/types";
import { IconSettings, IconGripVertical, IconEye, IconEyeOff, IconLayoutGrid, IconLayoutList } from "@/components/ui";

// Widget content is pre-rendered server-side (each widget can be a Server
// Component doing its own data fetch) and handed to this Client Component
// as plain ReactNode values — a function-as-children prop can't cross the
// server/client boundary, but rendered JSX can, so widgets are keyed
// ReactNodes rather than a render callback.
export function DashboardGrid({
  pageKey,
  widgets,
  widgetContent,
  savedLayout,
}: {
  pageKey: string;
  widgets: WidgetDefinition[];
  widgetContent: Record<string, ReactNode>;
  savedLayout: DashboardLayout | null;
}) {
  const defaultOrder = widgets.map((w) => w.key);
  const initialOrder =
    savedLayout && savedLayout.widgetOrder.length > 0
      ? [...savedLayout.widgetOrder.filter((k) => defaultOrder.includes(k)), ...defaultOrder.filter((k) => !savedLayout.widgetOrder.includes(k))]
      : defaultOrder;

  const [order, setOrder] = useState<string[]>(initialOrder);
  const [hidden, setHidden] = useState<Set<string>>(new Set(savedLayout?.hiddenWidgets ?? []));
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(savedLayout?.layoutMode ?? "grid");
  const [customizing, setCustomizing] = useState(false);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const titleByKey = new Map(widgets.map((w) => [w.key, w.title]));

  function persist(nextMode: LayoutMode, nextOrder: string[], nextHidden: Set<string>) {
    startTransition(() => {
      saveDashboardLayout(pageKey, nextMode, nextOrder, Array.from(nextHidden));
    });
  }

  function setLayoutModeAndSave(mode: LayoutMode) {
    setLayoutMode(mode);
    persist(mode, order, hidden);
  }

  function moveWidget(key: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(key);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      // Both indices were just bounds-checked above (0 <= targetIndex <
      // prev.length, and index came from indexOf on this same array), but
      // noUncheckedIndexedAccess still types indexed reads as possibly
      // undefined — the assertions are safe given that check, not a bypass.
      [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
      return next;
    });
  }

  function handleDrop(targetKey: string) {
    if (!draggedKey || draggedKey === targetKey) return;
    setOrder((prev) => {
      const next = prev.filter((k) => k !== draggedKey);
      next.splice(next.indexOf(targetKey), 0, draggedKey);
      return next;
    });
    setDraggedKey(null);
  }

  function toggleHidden(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function done() {
    setCustomizing(false);
    persist(layoutMode, order, hidden);
  }

  const visibleOrder = customizing ? order : order.filter((k) => !hidden.has(k));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (customizing ? done() : setCustomizing(true))}
          aria-pressed={customizing}
          className="lc-btn-secondary inline-flex items-center gap-1.5 text-xs"
        >
          <IconSettings />
          {customizing ? "Done" : "Customize"}
        </button>
        {!customizing && (
          <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] p-1" role="group" aria-label="Layout">
            <button
              type="button"
              onClick={() => setLayoutModeAndSave("grid")}
              aria-pressed={layoutMode === "grid"}
              aria-label="Grid layout"
              className={`rounded p-1.5 ${layoutMode === "grid" ? "bg-[var(--card-bg-hover)] text-warm-gold" : "text-[var(--text-muted)]"}`}
            >
              <IconLayoutGrid />
            </button>
            <button
              type="button"
              onClick={() => setLayoutModeAndSave("list")}
              aria-pressed={layoutMode === "list"}
              aria-label="List layout"
              className={`rounded p-1.5 ${layoutMode === "list" ? "bg-[var(--card-bg-hover)] text-warm-gold" : "text-[var(--text-muted)]"}`}
            >
              <IconLayoutList />
            </button>
          </div>
        )}
      </div>

      <div className={layoutMode === "grid" ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : "flex flex-col gap-4"}>
        {visibleOrder.map((key, index) => {
          const isHidden = hidden.has(key);
          return (
            <div
              key={key}
              draggable={customizing}
              onDragStart={customizing ? () => setDraggedKey(key) : undefined}
              onDragOver={customizing ? (e) => e.preventDefault() : undefined}
              onDrop={customizing ? () => handleDrop(key) : undefined}
              className={customizing ? "rounded-2xl ring-1 ring-[var(--card-border)] p-2" : ""}
            >
              {customizing && (
                <div className="mb-2 flex items-center justify-between px-1 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex cursor-move items-center gap-1.5">
                    <IconGripVertical />
                    {titleByKey.get(key)}
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveWidget(key, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${titleByKey.get(key)} up`}
                      className="rounded px-1.5 py-0.5 hover:bg-[var(--card-bg-hover)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWidget(key, 1)}
                      disabled={index === visibleOrder.length - 1}
                      aria-label={`Move ${titleByKey.get(key)} down`}
                      className="rounded px-1.5 py-0.5 hover:bg-[var(--card-bg-hover)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleHidden(key)}
                      aria-label={isHidden ? `Show ${titleByKey.get(key)}` : `Hide ${titleByKey.get(key)}`}
                      className="rounded p-1 hover:bg-[var(--card-bg-hover)]"
                    >
                      {isHidden ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </span>
                </div>
              )}
              <div className={customizing && isHidden ? "opacity-40" : ""}>{widgetContent[key]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
