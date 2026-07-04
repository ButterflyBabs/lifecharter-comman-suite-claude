import { signOut } from "@/lib/auth/actions";

export function ProfileMenu({ email }: { email: string }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded px-3 py-1 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal">
        {email}
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-48 rounded border border-soft-taupe bg-ivory-light p-2 shadow-md">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded px-3 py-2 text-left text-sm text-deep-indigo hover:bg-soft-lavender/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
          >
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
