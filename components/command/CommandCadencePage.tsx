import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function CommandCadencePage({
  title,
  cadence,
  reviewPath,
}: {
  title: string;
  cadence: "weekly" | "monthly" | "quarterly" | "annual";
  reviewPath: string;
}) {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">{title}</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          <Link href="/roadmap/setup" className="underline">
            Set up your workspace
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: outcomes }, { data: decisions }] = await Promise.all([
    supabase
      .from("outcomes")
      .select("id, title, status, due_date")
      .eq("workspace_id", workspaceId)
      .eq("cadence", cadence)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("decisions")
      .select("id, question, status")
      .eq("workspace_id", workspaceId)
      .eq("status", "open")
      .limit(5),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">{title}</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Outcomes</h2>
        {outcomes && outcomes.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {outcomes.map((o) => (
              <li key={o.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
                {o.title} · {o.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">
            No outcomes yet — complete the{" "}
            <Link href={reviewPath} className="underline">
              {title.toLowerCase()} review
            </Link>{" "}
            to set them.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold text-deep-indigo">Open decisions</h2>
        {decisions && decisions.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {decisions.map((d) => (
              <li key={d.id} className="rounded border border-soft-taupe/40 p-3 text-sm">
                {d.question}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">Nothing awaiting a decision.</p>
        )}
      </section>

      <Link
        href={reviewPath}
        className="mt-6 inline-block rounded bg-accent px-4 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
      >
        Open {title.toLowerCase()} review
      </Link>
    </div>
  );
}
