import { getMode, setMode } from "@/lib/mode/actions";

// Persisted via cookie (lib/mode/actions.ts) so Build Mode vs Run Mode is a
// real, server-visible signal — Command Center pages read it to change what
// they emphasize (Section 4: "changes guidance, available prompts, and
// roadmap behavior"), not just a client-side label with no effect.
export async function ModeToggle() {
  const mode = await getMode();

  return (
    <div role="group" aria-label="Build or Run mode" className="flex rounded border border-soft-taupe text-sm">
      <form action={setMode.bind(null, "build")}>
        <button
          type="submit"
          aria-pressed={mode === "build"}
          className={`rounded-l px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
            mode === "build" ? "bg-accent text-white" : "text-deep-indigo"
          }`}
        >
          Build
        </button>
      </form>
      <form action={setMode.bind(null, "run")}>
        <button
          type="submit"
          aria-pressed={mode === "run"}
          className={`rounded-r px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
            mode === "run" ? "bg-accent text-white" : "text-deep-indigo"
          }`}
        >
          Run
        </button>
      </form>
    </div>
  );
}
