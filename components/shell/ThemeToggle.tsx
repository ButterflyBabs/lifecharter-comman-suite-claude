import { getTheme, setTheme } from "@/lib/theme/actions";

// Persisted via cookie (lib/theme/actions.ts), read in the root layout to set
// the `dark` class on <html> — Tailwind's darkMode: "class" plus theme-aware
// CSS variables (app/globals.css) do the rest, so this toggle affects every
// page, not just the ones inside the authenticated app shell.
export async function ThemeToggle() {
  const theme = await getTheme();

  return (
    <div
      role="group"
      aria-label="Light or dark theme"
      className="flex overflow-hidden rounded-lg border border-[var(--card-border)] text-sm"
    >
      <form action={setTheme.bind(null, "light")}>
        <button type="submit" aria-pressed={theme === "light"} className={`lc-toggle-pill ${theme === "light" ? "active" : ""}`}>
          Light
        </button>
      </form>
      <form action={setTheme.bind(null, "dark")}>
        <button type="submit" aria-pressed={theme === "dark"} className={`lc-toggle-pill ${theme === "dark" ? "active" : ""}`}>
          Dark
        </button>
      </form>
    </div>
  );
}
