"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateClientStatus(formData: FormData) {
  const clientId = formData.get("client_id") as string;
  const nextStatus = formData.get("next_status") as string;

  const supabase = await createClient();
  await supabase.from("clients").update({ status: nextStatus }).eq("id", clientId);

  revalidatePath(`/clients/active/${clientId}`);
  revalidatePath("/clients/overview");
}
