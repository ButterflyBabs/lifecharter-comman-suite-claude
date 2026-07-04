import { getTheme, setTheme } from "@/lib/theme/actions";

// Persisted via cookie (lib/theme/actions.ts), read in the root layout to set
// the `dark` class on <html> — Tailwind's darkMode: "class" plus theme-aware
// CSS variables (app/globals.css) do the rest, so this toggle affects every
// page, not just the ones inside the authenticated app shell.
export async function ThemeToggle() {
  const theme = await getTheme();

  return (
    <div role="group" aria-label="Light or dark theme" className="flex rounded border border-soft-taupe text-sm">
      <form action={setTheme.bind(null, "light")}>
        <button
          type="submit"
          aria-pressed={theme === "light"}
          className={`rounded-l px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
            theme === "light" ? "bg-accent text-white" : "text-deep-indigo"
          }`}
        >
          Light
        </button>
      </form>
      <form action={setTheme.bind(null, "dark")}>
        <button
          type="submit"
          aria-pressed={theme === "dark"}
          className={`rounded-r px-3 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${
            theme === "dark" ? "bg-accent text-white" : "text-deep-indigo"
          }`}
        >
          Dark
        </button>
      </form>
    </div>
  );
}
