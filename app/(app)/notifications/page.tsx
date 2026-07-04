import { createClient } from "@/lib/supabase/server";
import { markRead } from "./actions";
import { PageHeader } from "@/components/ui";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = user
    ? await supabase
        .from("notifications")
        .select("id, type, severity, message, action_url, read_at, created_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="p-8">
      <PageHeader
        title="Notifications"
        description="Meaningful, deduplicated events with direct actions (Section 14.4)."
      />
      {notifications && notifications.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <div className={`lc-card p-4 text-sm ${n.read_at ? "" : "border-l-4 border-l-warm-gold"}`}>
                <p className="font-medium">{n.message}</p>
                <p className="text-soft-taupe">
                  {n.type} · {n.severity} · {new Date(n.created_at).toLocaleString()}
                </p>
                {!n.read_at && (
                  <form action={markRead.bind(null, n.id)} className="mt-2">
                    <button type="submit" className="lc-btn-secondary px-3 py-1 text-xs">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">No notifications yet.</p>
      )}
    </div>
  );
}
