"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveResponse, completeAuditAction, runAdaptive, saveAdaptiveAnswer } from "@/app/(app)/roadmap/audit/actions";
import type { AdaptiveQuestion } from "@/lib/audit/types";
import { SCALE_0_4_OPTIONS, UNSCORED_OPTIONS, normalizeScale0to4 } from "@/lib/audit/scale";

type Confidence = "low" | "medium" | "high";

export type EngineQuestion = {
  id: string;
  prompt: string;
  responseType: string;
  scoreCategory: string;
  existing: {
    score: number | null;
    responseJson: any;
    notes: string | null;
    evidenceRefs: unknown[];
  } | null;
};

export type EngineDomain = {
  id: string;
  name: string;
  description: string | null;
  order: number;
  questions: EngineQuestion[];
};

type Answer = {
  score: number | null;
  value: any;
  selectedOption: string | null;
  confidence: Confidence | null;
  notes: string | null;
  evidenceRefs: EvidenceRef[];
};

type EvidenceRef = { path: string; name: string; type: string };

const EVIDENCE_BUCKET = "audit-evidence";

function isScale(type: string) {
  return type === "scale_0_100" || type === "scale";
}
function scaleMax(type: string) {
  return type === "scale" ? 10 : 100;
}

function initialAnswer(q: EngineQuestion): Answer {
  const rj = q.existing?.responseJson ?? {};
  return {
    score: q.existing?.score ?? null,
    value: rj?.value ?? null,
    selectedOption: rj?.selectedOption ?? null,
    confidence: (rj?.confidence as Confidence) ?? null,
    notes: q.existing?.notes ?? null,
    evidenceRefs: (q.existing?.evidenceRefs as EvidenceRef[]) ?? [],
  };
}

function isAnswered(a: Answer | undefined): boolean {
  if (!a) return false;
  if (a.selectedOption != null && a.selectedOption !== "") return true;
  return a.score !== null || (a.value !== null && a.value !== "" && a.value !== undefined);
}

export function AuditEngine({
  instanceId,
  workspaceId,
  mode,
  domains,
  initialSavedAt,
  initialAdaptive = {},
}: {
  instanceId: string;
  workspaceId: string;
  mode: "full" | "snapshot";
  domains: EngineDomain[];
  initialSavedAt: string | null;
  initialAdaptive?: Record<string, AdaptiveQuestion[]>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [current, setCurrent] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(initialSavedAt);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [adaptive, setAdaptive] = useState<Record<string, AdaptiveQuestion[]>>(initialAdaptive);
  const generatedFor = useRef<Set<string>>(new Set(Object.keys(initialAdaptive)));

  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const seed: Record<string, Answer> = {};
    for (const d of domains) for (const q of d.questions) seed[q.id] = initialAnswer(q);
    return seed;
  });

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = useCallback(
    async (questionId: string, a: Answer) => {
      setSaving(true);
      const res = await saveResponse({
        instanceId,
        questionId,
        score: a.score,
        responseJson: { value: a.value, confidence: a.confidence, selectedOption: a.selectedOption },
        notes: a.notes,
        evidenceRefs: a.evidenceRefs,
      });
      setSaving(false);
      if (res.ok) setSavedAt(res.savedAt);
    },
    [instanceId],
  );

  // Debounced autosave, 1.5s per question.
  const scheduleSave = useCallback(
    (questionId: string, a: Answer) => {
      if (timers.current[questionId]) clearTimeout(timers.current[questionId]);
      timers.current[questionId] = setTimeout(() => persist(questionId, a), 1500);
    },
    [persist],
  );

  const update = useCallback(
    (questionId: string, patch: Partial<Answer>) => {
      setAnswers((prev) => {
        const next: Answer = { ...(prev[questionId] ?? initialAnswerEmpty()), ...patch };
        const updated = { ...prev, [questionId]: next };
        scheduleSave(questionId, next);
        return updated;
      });
    },
    [scheduleSave],
  );

  const flushPending = useCallback(async () => {
    const pending = Object.entries(timers.current);
    for (const [qid, t] of pending) {
      clearTimeout(t);
      const a = answers[qid];
      if (a) await persist(qid, a);
    }
    timers.current = {};
  }, [answers, persist]);

  const totalQuestions = useMemo(() => domains.reduce((n, d) => n + d.questions.length, 0), [domains]);
  const answeredCount = useMemo(
    () => Object.values(answers).filter(isAnswered).length,
    [answers],
  );
  const overallPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const domainComplete = useCallback(
    (d: EngineDomain) => d.questions.length > 0 && d.questions.every((q) => isAnswered(answers[q.id])),
    [answers],
  );
  const completedDomains = useMemo(() => domains.filter(domainComplete).length, [domains, domainComplete]);

  const domain = domains[current];
  const isLast = current === domains.length - 1;

  const uploadEvidence = useCallback(
    async (questionId: string, file: File) => {
      const path = `${workspaceId}/${instanceId}/${questionId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { upsert: true });
      if (error) return;
      const ref: EvidenceRef = { path, name: file.name, type: file.type };
      setAnswers((prev) => {
        const existing = prev[questionId] ?? initialAnswerEmpty();
        const next = { ...existing, evidenceRefs: [...existing.evidenceRefs, ref] };
        const updated = { ...prev, [questionId]: next };
        void persist(questionId, next);
        return updated;
      });
    },
    [supabase, workspaceId, instanceId, persist],
  );

  const saveAndExit = useCallback(async () => {
    await flushPending();
    router.push("/roadmap/plan");
  }, [flushPending, router]);

  const complete = useCallback(() => {
    startTransition(async () => {
      await flushPending();
      await completeAuditAction(instanceId);
    });
  }, [flushPending, instanceId]);

  // Adaptive follow-ups: answers saved on blur (kept out of the shared bank).
  const persistAdaptive = useCallback(async (id: string, value: string | null, notes: string | null) => {
    setSaving(true);
    const res = await saveAdaptiveAnswer({ adaptiveId: id, value, notes });
    setSaving(false);
    if (res.ok) setSavedAt(new Date().toISOString());
  }, []);

  const updateAdaptive = useCallback((domainId: string, id: string, patch: Partial<AdaptiveQuestion>) => {
    setAdaptive((prev) => {
      const list = (prev[domainId] ?? []).map((q) => (q.id === id ? { ...q, ...patch } : q));
      return { ...prev, [domainId]: list };
    });
  }, []);

  const commitAdaptive = useCallback(
    (domainId: string, id: string) => {
      const q = (adaptive[domainId] ?? []).find((x) => x.id === id);
      if (q) void persistAdaptive(id, q.value ?? null, q.notes ?? null);
    },
    [adaptive, persistAdaptive],
  );

  // Leaving a fully-answered domain: ask the AI (once) for follow-ups before
  // advancing. No-op without a BYOK credential, so this returns fast.
  const goNext = useCallback(async () => {
    const leaving = domains[current];
    if (leaving && leaving.questions.length > 0 && leaving.questions.every((q) => isAnswered(answers[q.id])) && !generatedFor.current.has(leaving.id)) {
      generatedFor.current.add(leaving.id);
      setAdvancing(true);
      await flushPending();
      try {
        const qs = await runAdaptive(instanceId, leaving.id);
        if (qs.length > 0) setAdaptive((prev) => ({ ...prev, [leaving.id]: qs }));
      } catch {
        // best-effort
      }
      setAdvancing(false);
    }
    setCurrent((c) => Math.min(domains.length - 1, c + 1));
  }, [domains, current, answers, flushPending, instanceId]);

  const savedLabel = savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Not saved yet";

  return (
    <div className="max-w-4xl p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="lc-title-hero text-3xl">Business Command Audit</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {mode === "snapshot" ? "Snapshot" : "Full audit"} &middot; {completedDomains} of {domains.length} areas
            complete
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--text-muted)]" aria-live="polite">
            {saving ? "Saving…" : savedLabel}
          </span>
          <button
            type="button"
            onClick={saveAndExit}
            className="rounded border border-soft-taupe px-3 py-1.5 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
          >
            Save and exit
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Overall progress</span>
          <span>{overallPct}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
          <div className="h-full rounded-full bg-warm-gold transition-[width]" style={{ width: `${overallPct}%` }} />
        </div>
      </div>

      {/* Domain stepper */}
      <ol className="mt-4 flex flex-wrap gap-1.5" aria-label="Audit areas">
        {domains.map((d, i) => {
          const done = domainComplete(d);
          const active = i === current;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={active ? "step" : undefined}
                title={d.name}
                className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo " +
                  (active
                    ? "bg-deep-indigo text-white"
                    : done
                      ? "bg-[var(--success)] text-white"
                      : "border border-soft-taupe text-soft-taupe")
                }
              >
                {i + 1}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Current domain */}
      {domain && (
        <div className="lc-card mt-6 p-6">
          <h2 className="text-xl font-semibold text-deep-indigo">
            {domain.order}. {domain.name}
          </h2>
          {domain.description && <p className="mt-1 text-sm text-soft-taupe">{domain.description}</p>}

          <div className="mt-5 space-y-8">
            {domain.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                answer={answers[q.id]}
                onChange={(patch) => update(q.id, patch)}
                onUpload={(file) => uploadEvidence(q.id, file)}
              />
            ))}
            {domain.questions.length === 0 && (
              <p className="text-sm text-soft-taupe">No questions defined for this area yet.</p>
            )}
          </div>

          {(adaptive[domain.id]?.length ?? 0) > 0 && (
            <div className="mt-8 rounded-2xl border border-warm-gold/40 bg-warm-gold/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                AI follow-up questions
              </p>
              <div className="mt-3 space-y-5">
                {(adaptive[domain.id] ?? []).map((aq) => (
                  <div key={aq.id}>
                    <label htmlFor={`adaptive-${aq.id}`} className="block text-sm font-medium text-deep-indigo">
                      {aq.prompt}
                    </label>
                    {aq.rationale && <p className="mt-0.5 text-xs text-soft-taupe">{aq.rationale}</p>}
                    <textarea
                      id={`adaptive-${aq.id}`}
                      value={aq.value ?? ""}
                      onChange={(e) => updateAdaptive(domain.id, aq.id, { value: e.target.value })}
                      onBlur={() => commitAdaptive(domain.id, aq.id)}
                      rows={2}
                      placeholder="Your answer"
                      className="mt-2 w-full rounded border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm text-deep-indigo"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-[var(--card-border)] pt-4">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="rounded border border-soft-taupe px-4 py-2 text-sm text-deep-indigo disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
            >
              Back
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={complete}
                disabled={isPending}
                className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal disabled:opacity-60"
              >
                {isPending ? "Generating findings…" : "Complete audit and generate findings"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={advancing}
                className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal disabled:opacity-60"
              >
                {advancing ? "Checking for follow-ups…" : "Next"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function initialAnswerEmpty(): Answer {
  return { score: null, value: null, selectedOption: null, confidence: null, notes: null, evidenceRefs: [] };
}

function QuestionField({
  question,
  answer,
  onChange,
  onUpload,
}: {
  question: EngineQuestion;
  answer: Answer | undefined;
  onChange: (patch: Partial<Answer>) => void;
  onUpload: (file: File) => void;
}) {
  const a = answer ?? initialAnswerEmpty();
  const answered = isAnswered(a);

  return (
    <div>
      <p className="text-sm font-medium text-deep-indigo">
        {question.prompt}{" "}
        {isScale(question.responseType) && (
          <span className="text-xs text-soft-taupe">
            ({question.scoreCategory === "build_completion" ? "Build Completion" : "Operating Health"})
          </span>
        )}
      </p>

      <div className="mt-2">
        <ResponseControl question={question} answer={a} onChange={onChange} />
      </div>

      {/* Confidence */}
      {answered && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Confidence:</span>
          {(["low", "medium", "high"] as Confidence[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ confidence: c })}
              className={
                "rounded-full px-2.5 py-0.5 capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo " +
                (a.confidence === c ? "bg-deep-indigo text-white" : "border border-soft-taupe text-soft-taupe")
              }
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Notes */}
      <textarea
        value={a.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Notes (optional)"
        rows={2}
        className="mt-3 w-full rounded border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm text-deep-indigo"
      />

      {/* Evidence */}
      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-sacred-teal">
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.currentTarget.value = "";
            }}
          />
          <span className="underline">Attach evidence</span>
        </label>
        {a.evidenceRefs.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {a.evidenceRefs.map((r) => (
              <li key={r.path} className="text-xs text-[var(--text-muted)]">
                {r.type.startsWith("image/") ? "🖼" : "📄"} {r.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResponseControl({
  question,
  answer,
  onChange,
}: {
  question: EngineQuestion;
  answer: Answer;
  onChange: (patch: Partial<Answer>) => void;
}) {
  const type = question.responseType;

  if (type === "scale_0_4") {
    const selected = answer.selectedOption;
    return (
      <div className="space-y-1.5">
        {SCALE_0_4_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={selected === String(opt.value)}
              onChange={() =>
                onChange({ selectedOption: String(opt.value), value: opt.value, score: normalizeScale0to4(opt.value) })
              }
              className="mt-0.5"
            />
            <span className="text-deep-indigo">
              <span className="font-medium">{opt.value}</span> — {opt.label}
            </span>
          </label>
        ))}
        <div className="flex flex-wrap gap-2 pt-1">
          {UNSCORED_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange({ selectedOption: opt.key, value: null, score: null })}
              className={
                "rounded-full px-3 py-0.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo " +
                (selected === opt.key ? "bg-deep-indigo text-white" : "border border-soft-taupe text-soft-taupe")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        {selected === "not_applicable" && (
          <p className="pt-1 text-xs text-warm-gold">Add a short rationale in Notes below for Not Applicable.</p>
        )}
        {selected === "not_sure" && (
          <p className="pt-1 text-xs text-[var(--text-muted)]">We will ask a follow-up to clarify this one.</p>
        )}
      </div>
    );
  }

  if (isScale(type)) {
    const max = scaleMax(type);
    // Slider position tracks the raw control value; score (0–100) is derived.
    const raw = (answer.value as number | null) ?? answer.score ?? (max === 10 ? 5 : 50);
    return (
      <div className="max-w-md">
        <input
          type="range"
          min={0}
          max={max}
          step={max === 10 ? 1 : 5}
          value={raw}
          onChange={(e) => {
            const v = Number(e.target.value);
            // store 0–100 in score for the domain-scores view; keep raw in value
            onChange({ score: max === 10 ? v * 10 : v, value: v });
          }}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-soft-taupe">
          <span>Not at all</span>
          <span className="font-medium text-deep-indigo">{raw}</span>
          <span>Fully</span>
        </div>
      </div>
    );
  }

  if (type === "boolean") {
    const val = answer.value;
    return (
      <div className="flex gap-2">
        {[
          { label: "Yes", v: true, score: 100 },
          { label: "No", v: false, score: 0 },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange({ value: opt.v, score: opt.score })}
            className={
              "rounded px-4 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo " +
              (val === opt.v ? "bg-deep-indigo text-white" : "border border-soft-taupe text-deep-indigo")
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (type === "text") {
    return (
      <textarea
        value={answer.value ?? ""}
        onChange={(e) => onChange({ value: e.target.value, score: null })}
        rows={3}
        placeholder="Your answer"
        className="w-full rounded border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm text-deep-indigo"
      />
    );
  }

  // Fallback: treat unknown/multiple_choice-without-options as a 0–100 scale so
  // the audit is never blocked by an unrecognized response_type.
  const raw = answer.score ?? 50;
  return (
    <div className="max-w-md">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={raw}
        onChange={(e) => onChange({ score: Number(e.target.value), value: Number(e.target.value) })}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-soft-taupe">
        <span>0</span>
        <span className="font-medium text-deep-indigo">{raw}</span>
        <span>100</span>
      </div>
    </div>
  );
}
