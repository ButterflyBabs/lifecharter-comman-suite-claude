import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/data/workspace";
import { ModeToggle } from "./ModeToggle";
import { ThemeToggle } from "./ThemeToggle";
import { ProfileMenu } from "./ProfileMenu";
import { CommandPalette } from "./CommandPalette";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspaces = await getUserWorkspaces();
  const currentWorkspace = workspaces[0];

  const { count: unreadCount } = user
    ? await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null)
    : { count: 0 };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] bg-[var(--surface-bg)] px-4 py-3">
      <div className="flex items-center gap-4">
        <Link href="/command/today" className="lc-title text-lg">
          LifeCharter
        </Link>
        {currentWorkspace ? (
          <span aria-label="Current workspace" className="text-sm text-[var(--text-muted)]">
            {currentWorkspace.name}
          </span>
        ) : (
          <span className="text-sm text-[var(--text-muted)]">No workspace yet</span>
        )}
        <ModeToggle />
      </div>

      <form action="/search" className="min-w-[160px] flex-1 max-w-md">
        <label htmlFor="global-search" className="sr-only">
          Search
        </label>
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Search..."
          className="w-full rounded border border-[var(--card-border)] bg-transparent px-3 py-1.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
        />
      </form>

      <nav aria-label="Quick access" className="flex items-center gap-3 text-sm">
        <CommandPalette />
        <Link href="/work" className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal">
          Work
        </Link>
        <Link href="/approvals" className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal">
          Approvals
        </Link>
        <Link
          href="/notifications"
          className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
        >
          Notifications{unreadCount ? ` (${unreadCount})` : ""}
        </Link>
        {/* Section 5 requires a persistent Help control, but Appendix A defines
            no /help route — omitted rather than inventing one; see
            docs/navigation-and-routes.md. */}
        <ThemeToggle />
        {user && <ProfileMenu email={user.email ?? "Account"} />}
      </nav>
    </header>
  );
}
