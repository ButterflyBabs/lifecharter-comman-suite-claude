import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Authenticated via the regular RLS-scoped client, not the admin client —
// data_export_requests' own RLS policy already restricts this to members
// of the request's workspace, so no extra check is needed here.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("data_export_requests")
    .select("export_data, status, requested_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!request || request.status !== "completed") {
    return NextResponse.json({ error: "Export not found or not yet completed" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(request.export_data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="workspace-export-${request.requested_at.slice(0, 10)}.json"`,
    },
  });
}
