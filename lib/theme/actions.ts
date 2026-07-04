"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setTheme(theme: "light" | "dark") {
  const cookieStore = await cookies();
  cookieStore.set("lc_theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function getTheme(): Promise<"light" | "dark"> {
  const cookieStore = await cookies();
  const value = cookieStore.get("lc_theme")?.value;
  // Dark is the brand board's primary presentation — default to it for a
  // first-time visitor with no saved preference; "light" only applies once
  // someone has explicitly toggled to it (and it's been saved as a cookie).
  return value === "light" ? "light" : "dark";
}
