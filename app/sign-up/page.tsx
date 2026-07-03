import Link from "next/link";
import { signUp } from "./actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  if (checkEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory-light p-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-4 text-2xl font-semibold text-deep-indigo">Check your email</h1>
          <p className="text-sm text-soft-taupe">
            We sent a confirmation link. Follow it to activate your account, then{" "}
            <Link href="/login" className="underline">
              sign in
            </Link>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory-light p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-2xl font-semibold text-deep-indigo">Create your account</h1>
        {error && (
          <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form action={signUp} className="space-y-4">
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
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-deep-indigo px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
          >
            Create account
          </button>
        </form>
        <p className="mt-4 text-sm text-soft-taupe">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
