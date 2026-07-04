import { portalSignIn } from "../actions";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Card } from "@/components/ui";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <h1 className="lc-title-hero mb-2 text-2xl">Client Portal</h1>
        <p className="mb-6 text-sm text-soft-taupe">Sign in to see your sessions, actions, and progress.</p>
        {error && (
          <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}
        <form action={portalSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-deep-indigo">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-deep-indigo">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
            />
          </div>
          <button
            type="submit"
            className="lc-btn-primary w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
          >
            Sign in
          </button>
        </form>
        <p className="mt-4 text-xs text-soft-taupe">
          Your coach sends you an invitation to set up access — there&apos;s no self-serve sign-up here.
        </p>
      </Card>
    </main>
  );
}
