import { createClient } from "@/lib/supabase/server";
import type { DashboardLayout } from "./types";

// Plain server-side read, not a Server Action — only ever called from a
// Server Component while rendering a page, unlike saveDashboardLayout
// (lib/dashboard/actions.ts), which a Client Component invokes directly.
export async function getDashboardLayout(pageKey: string): Promise<DashboardLayout | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("dashboard_layouts")
    .select("layout_mode, widget_order, hidden_widgets")
    .eq("user_id", user.id)
    .eq("page_key", pageKey)
    .maybeSingle();

  if (!data) return null;

  return {
    layoutMode: data.layout_mode === "list" ? "list" : "grid",
    widgetOrder: Array.isArray(data.widget_order) ? (data.widget_order as string[]) : [],
    hiddenWidgets: Array.isArray(data.hidden_widgets) ? (data.hidden_widgets as string[]) : [],
  };
}
