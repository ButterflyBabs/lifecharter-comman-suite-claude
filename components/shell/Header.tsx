import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/data/workspace";
import { getTheme } from "@/lib/theme/actions";
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
  const theme = await getTheme();
  const logoSrc = theme === "dark" ? "/brand/logo-dark.png" : "/brand/logo-light.png";

  const { count: unreadCount } = user
    ? await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null)
    : { count: 0 };

  return (
    <header className="flex items-center gap-4 border-b border-[var(--card-border)] bg-[var(--surface-bg)] px-4 py-3">
      <Link
        href="/command/today"
        className="flex shrink-0 items-center self-center"
        aria-label="LifeCharter Command Suite — go to Command Center"
      >
        <Image src={logoSrc} alt="LifeCharter Command Suite" width={132} height={35} priority />
      </Link>

      {/* A 2-row grid (rather than two independent flex rows) so specific
          columns line up exactly: workspace name sits above Notifications,
          Build/Run sits above Light/Dark, and search sits above the account
          email. The nav-links column is auto-width (not flexible) so Jump
          to/Work/Approvals sit tight against Notifications instead of being
          pushed apart by the search box's width. */}
      <div className="grid min-w-0 flex-1 grid-cols-[auto_auto_auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
        <div className="col-start-1 row-start-2 flex flex-wrap items-center gap-3 text-sm">
          <CommandPalette />
          <Link href="/work" className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal">
            Work
          </Link>
          <Link href="/approvals" className="text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal">
            Approvals
          </Link>
          {/* Section 5 requires a persistent Help control, but Appendix A defines
              no /help route — omitted rather than inventing one; see
              docs/navigation-and-routes.md. */}
        </div>

        {currentWorkspace ? (
          <span aria-label="Current workspace" className="col-start-2 row-start-1 text-sm text-[var(--text-muted)]">
            {currentWorkspace.name}
          </span>
        ) : (
          <span className="col-start-2 row-start-1 text-sm text-[var(--text-muted)]">No workspace yet</span>
        )}
        <Link
          href="/notifications"
          className="col-start-2 row-start-2 text-sm text-deep-indigo hover:text-warm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
        >
          Notifications{unreadCount ? ` (${unreadCount})` : ""}
        </Link>

        <div className="col-start-3 row-start-1">
          <ModeToggle />
        </div>
        <div className="col-start-3 row-start-2">
          <ThemeToggle />
        </div>

        <form action="/search" className="col-start-4 row-start-1 min-w-[160px] max-w-md">
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
        <div className="col-start-4 row-start-2">{user && <ProfileMenu email={user.email ?? "Account"} />}</div>
      </div>
    </header>
  );
}
