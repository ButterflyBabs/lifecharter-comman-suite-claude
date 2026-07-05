"use server";

import { createClient } from "@/lib/supabase/server";
import type { LayoutMode } from "./types";

export async function saveDashboardLayout(
  pageKey: string,
  layoutMode: LayoutMode,
  widgetOrder: string[],
  hiddenWidgets: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Every widget page already fetches fresh, per-request data with no
  // caching layer, so there's nothing to revalidate here — the next time
  // this page renders (including this same client's next full reload) it
  // reads this row straight from the database.
  await supabase.from("dashboard_layouts").upsert(
    {
      user_id: user.id,
      page_key: pageKey,
      layout_mode: layoutMode,
      widget_order: widgetOrder,
      hidden_widgets: hiddenWidgets,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,page_key" },
  );
}
