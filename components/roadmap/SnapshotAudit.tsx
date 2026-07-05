"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SCALE_0_4_OPTIONS, UNSCORED_OPTIONS, normalizeScale0to4 } from "@/lib/audit/scale";

export type SnapshotQuestion = { id: string; prompt: string; displayOrder: number; scoreCategory: string };
export type SnapshotPhase = { id: string; name: string; order: number; questions: SnapshotQuestion[] };

type Ans = { selectedOption: string | null; score: number | null };

const ROLES = ["Coach", "Consultant", "Course Creator", "Service Provider", "Agency Owner", "Other"];
const STAGES = ["Under $100K/year", "$100K–$250K/year", "$250K–$500K/year", "$500K–$1M/year", "$1M+/year"];

function bandFor(score: number): string {
  if (score >= 87.5) return "Strong";
  if (score >= 62.5) return "Stable";
  if (score >= 37.5) return "Needs Attention";
  return "At Risk";
}

export function SnapshotAudit({ phases }: { phases: SnapshotPhase[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<"intake" | "questions" | "result">("intake");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<string>(ROLES[0] ?? "Coach");
  const [stage, setStage] = useState<string>(STAGES[0] ?? "");
  const [answers, setAnswers] = useState<Record<string, Ans>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ overall: number; band: string; perPhase: { name: string; score: number | null }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => phases.reduce((n, p) => n + p.questions.length, 0), [phases]);
  const answeredCount = Object.values(answers).filter((a) => a.selectedOption != null).length;

  function setAnswer(qid: string, selectedOption: string, score: number | null) {
    setAnswers((prev) => ({ ...prev, [qid]: { selectedOption, score } }));
  }

  function compute() {
    const perPhase = phases.map((p) => {
      const scored = p.questions.map((q) => answers[q.id]?.score).filter((s): s is number => typeof s === "number");
      const score = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
      return { name: p.name, score };
    });
    const valid = perPhase.map((p) => p.score).filter((s): s is number => typeof s === "number");
    const overall = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    return { overall, band: bandFor(overall), perPhase };
  }

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    const computed = compute();
    const payload = {
      templateKey: "business-command-audit",
      templateVersion: "1.0.0",
      firstName,
      email: email.trim(),
      businessName,
      role,
      businessStage: stage,
      answers: phases.flatMap((p) =>
        p.questions.map((q) => ({ questionId: q.id, selectedOption: answers[q.id]?.selectedOption ?? null })),
      ),
      overallScore: String(computed.overall),
      perPhaseScores: computed.perPhase,
      resultBand: computed.band,
    };
    const { error: rpcError } = await supabase.rpc("submit_public_audit_snapshot", { payload });
    setSubmitting(false);
    if (rpcError) {
      setError("Something went wrong saving your results. Please try again.");
      return;
    }
    setResult(computed);
    setStep("result");
  }

  // ---- Intake ----
  if (step === "intake") {
    return (
      <div>
        <h1 className="text-3xl font-semibold text-deep-indigo">The Business Command Audit</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          A quick snapshot of how built-out and healthy your business systems are across the twelve Business Command
          areas. About 5 minutes. You will get your score and top gaps right away.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setStep("questions");
          }}
        >
          <Field label="First name">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" required>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Business name">
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Primary role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Business stage">
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputCls}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" className="lc-btn-primary">
            Start the audit
          </button>
        </form>
      </div>
    );
  }

  // ---- Result ----
  if (step === "result" && result) {
    return (
      <div>
        <h1 className="text-3xl font-semibold text-deep-indigo">Your Business Systems Score</h1>
        <div className="mt-6 flex items-center gap-4">
          <div
            className="flex h-24 w-24 flex-col items-center justify-center rounded-full text-white"
            style={{ background: "#1f315b" }}
          >
            <span className="text-3xl font-semibold">{result.overall}</span>
            <span className="text-[10px] uppercase tracking-wide opacity-80">of 100</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-deep-indigo">{result.band}</p>
            <p className="text-sm text-soft-taupe">Across all twelve Business Command areas.</p>
          </div>
        </div>

        <ul className="mt-6 space-y-2">
          {result.perPhase.map((p) => (
            <li key={p.name} className="flex items-center gap-3 text-sm">
              <span className="w-56 shrink-0 text-deep-indigo">{p.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
                <span
                  className="block h-full rounded-full bg-warm-gold"
                  style={{ width: `${p.score ?? 0}%` }}
                />
              </span>
              <span className="w-10 text-right text-soft-taupe">{p.score ?? "—"}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-warm-gold/40 bg-warm-gold/5 p-5">
          <p className="text-sm font-medium text-deep-indigo">This is just the snapshot.</p>
          <p className="mt-1 text-sm text-soft-taupe">
            The full Business Command Audit scores all 48 questions on two independent measures, adds AI-written findings
            and risk flags, and builds a prioritized roadmap for your business.
          </p>
          <a href="/sign-up" className="lc-btn-primary mt-4 inline-block">
            Create your account to unlock the full audit
          </a>
        </div>
      </div>
    );
  }

  // ---- Questions ----
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  return (
    <div>
      <h1 className="text-2xl font-semibold text-deep-indigo">The Business Command Audit</h1>
      <div className="sticky top-0 z-10 -mx-5 mt-3 bg-[var(--card-bg,#fff)] px-5 py-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
          <div className="h-full rounded-full bg-warm-gold transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-soft-taupe">
          {answeredCount} of {total} answered
        </p>
      </div>

      <div className="mt-4 space-y-8">
        {phases.map((p) => (
          <section key={p.id}>
            <h2 className="text-lg font-semibold text-deep-indigo">
              {p.order}. {p.name}
            </h2>
            <div className="mt-3 space-y-6">
              {p.questions.map((q) => {
                const selected = answers[q.id]?.selectedOption ?? null;
                return (
                  <div key={q.id}>
                    <p className="text-sm text-deep-indigo">{q.prompt}</p>
                    <div className="mt-2 space-y-1.5">
                      {SCALE_0_4_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex cursor-pointer items-start gap-2 text-sm">
                          <input
                            type="radio"
                            name={`sq-${q.id}`}
                            checked={selected === String(opt.value)}
                            onChange={() => setAnswer(q.id, String(opt.value), normalizeScale0to4(opt.value))}
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
                            onClick={() => setAnswer(q.id, opt.key, null)}
                            className={
                              "rounded-full px-3 py-0.5 text-xs " +
                              (selected === opt.key ? "bg-deep-indigo text-white" : "border border-soft-taupe text-soft-taupe")
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button type="button" onClick={submit} disabled={submitting} className="lc-btn-primary mt-8 disabled:opacity-60">
        {submitting ? "Scoring…" : "Get my results"}
      </button>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded border border-soft-taupe bg-transparent px-3 py-2 text-sm text-deep-indigo";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-deep-indigo">
      {label}
      {required ? " *" : ""}
      {children}
    </label>
  );
}
