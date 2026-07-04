import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptionsWithName };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth session on every request so Server Components
  // always see a valid (or correctly expired) session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/sign-up" || pathname.startsWith("/auth/");
  const isPortalRoute = pathname.startsWith("/portal");
  const isPortalAuthRoute = pathname === "/portal/login";

  // Portal (client-facing) routes are a separate identity class from the
  // workspace-member app — an unauthenticated visitor there goes to
  // /portal/login, not the workspace-member /login, and a signed-in
  // workspace member hitting /portal isn't redirected away from it either
  // (whether they also happen to have portal access is a page-level check,
  // not a middleware one — middleware only knows "is there any session").
  if (isPortalRoute) {
    if (!user && !isPortalAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/portal/login";
      return NextResponse.redirect(redirectUrl);
    }
    if (user && isPortalAuthRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/portal";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  if (!user && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/sign-up")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/command/today";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
