"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setNotificationPreference(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const notificationType = formData.get("notification_type") as string;
  const channel = formData.get("channel") as string;

  await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      notification_type: notificationType,
      channel,
      cadence: formData.get("cadence") as string,
      enabled: formData.get("enabled") === "on",
    },
    { onConflict: "user_id,notification_type,channel" },
  );

  revalidatePath("/settings/notifications");
}
