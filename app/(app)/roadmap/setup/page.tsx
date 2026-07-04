import Link from "next/link";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { createWorkspace } from "./actions";
import { TIMEZONES } from "@/lib/timezones";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  if (workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Setup</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          Your workspace is already set up. Continue to the{" "}
          <Link href="/roadmap/audit" className="underline">
            Business Command Audit
          </Link>{" "}
          to receive your personalized roadmap.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Set up your workspace</h1>
      <p className="mt-2 text-sm text-soft-taupe">
        A workspace is the boundary for everything you build here — your business
        architecture, revenue, clients, and reviews all live inside it, isolated from
        every other workspace by database-enforced Row Level Security.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <form action={createWorkspace} className="mt-6 max-w-sm space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-deep-indigo">
            Workspace name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Acme Coaching"
            className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
          />
        </div>
        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-deep-indigo">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            defaultValue="UTC"
            className="mt-1 w-full rounded border border-soft-taupe bg-white px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-deep-indigo px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          Create workspace
        </button>
      </form>
    </div>
  );
}
