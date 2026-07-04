import { getMode, setMode } from "@/lib/mode/actions";

// Persisted via cookie (lib/mode/actions.ts) so Build Mode vs Run Mode is a
// real, server-visible signal — Command Center pages read it to change what
// they emphasize (Section 4: "changes guidance, available prompts, and
// roadmap behavior"), not just a client-side label with no effect.
export async function ModeToggle() {
  const mode = await getMode();

  return (
    <div
      role="group"
      aria-label="Build or Run mode"
      className="flex overflow-hidden rounded-lg border border-[var(--card-border)] text-sm"
    >
      <form action={setMode.bind(null, "build")}>
        <button type="submit" aria-pressed={mode === "build"} className={`lc-toggle-pill ${mode === "build" ? "active" : ""}`}>
          Build
        </button>
      </form>
      <form action={setMode.bind(null, "run")}>
        <button type="submit" aria-pressed={mode === "run"} className={`lc-toggle-pill ${mode === "run" ? "active" : ""}`}>
          Run
        </button>
      </form>
    </div>
  );
}
