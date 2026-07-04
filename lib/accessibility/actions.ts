"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AccessibilityPrefs = {
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
};

const DEFAULT_PREFS: AccessibilityPrefs = {
  reduce_motion: false,
  high_contrast: false,
  large_text: false,
};

// Mirrors the theme cookie's pattern (lib/theme/actions.ts): the
// authoritative value lives in user_profiles.accessibility_preferences
// (Section 10.3), but root layout renders for unauthenticated pages too and
// shouldn't need an extra DB round-trip just to decide a CSS class, so the
// same JSON is mirrored into a cookie whenever it's saved.
export async function getAccessibilityPrefs(): Promise<AccessibilityPrefs> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("lc_a11y")?.value;
  if (!raw) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setAccessibilityPrefs(formData: FormData) {
  const prefs: AccessibilityPrefs = {
    reduce_motion: formData.get("reduce_motion") === "on",
    high_contrast: formData.get("high_contrast") === "on",
    large_text: formData.get("large_text") === "on",
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("user_profiles").update({ accessibility_preferences: prefs }).eq("auth_user_id", user.id);
  }

  const cookieStore = await cookies();
  cookieStore.set("lc_a11y", JSON.stringify(prefs), { path: "/", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/", "layout");
}
