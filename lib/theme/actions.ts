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
  return value === "dark" ? "dark" : "light";
}
