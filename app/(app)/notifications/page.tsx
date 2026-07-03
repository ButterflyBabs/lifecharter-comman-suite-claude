import { createClient } from "@/lib/supabase/server";
import { markRead } from "./actions";

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
      <h1 className="text-2xl font-semibold text-deep-indigo">Notifications</h1>
      <p className="mt-2 text-sm text-soft-taupe">
        Meaningful, deduplicated events with direct actions (Section 14.4).
      </p>
      {notifications && notifications.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`rounded border p-3 text-sm ${
                n.read_at ? "border-soft-taupe/30" : "border-sacred-teal bg-soft-lavender/10"
              }`}
            >
              <p className="font-medium">{n.message}</p>
              <p className="text-soft-taupe">
                {n.type} · {n.severity} · {new Date(n.created_at).toLocaleString()}
              </p>
              {!n.read_at && (
                <form action={markRead.bind(null, n.id)} className="mt-2">
                  <button
                    type="submit"
                    className="rounded border border-soft-taupe px-3 py-1 text-xs text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
                  >
                    Mark read
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-soft-taupe">No notifications yet.</p>
      )}
    </div>
  );
}
