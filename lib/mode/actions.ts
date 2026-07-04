"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setMode(mode: "build" | "run") {
  const cookieStore = await cookies();
  cookieStore.set("lc_mode", mode, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function getMode(): Promise<"build" | "run"> {
  const cookieStore = await cookies();
  const value = cookieStore.get("lc_mode")?.value;
  return value === "run" ? "run" : "build";
}
