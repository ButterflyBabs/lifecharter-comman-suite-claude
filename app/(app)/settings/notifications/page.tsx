import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { setNotificationPreference } from "./actions";

// Section 14.4's "Default notification triggers" list, used as the
// configurable catalog here even though no generator in this build creates
// notification rows for most of these yet (a known, honestly-flagged gap —
// see docs/testing.md) — the preferences are real and ready for when
// trigger-side code lands.
const TRIGGER_TYPES = [
  { key: "decision_due", label: "Decision due" },
  { key: "approval_requested", label: "Approval requested" },
  { key: "task_overdue", label: "Task overdue" },
  { key: "client_at_risk", label: "Client at risk" },
  { key: "payment_failed_or_overdue", label: "Payment failed or overdue" },
  { key: "contract_awaiting_signature", label: "Contract awaiting signature" },
  { key: "lead_no_next_action", label: "Lead or opportunity has no next action" },
  { key: "stage_aging_exceeded", label: "Stage aging exceeded" },
  { key: "automation_failed", label: "Automation failed" },
  { key: "integration_disconnected", label: "Integration disconnected" },
  { key: "data_conflict_review", label: "Data conflict requires review" },
  { key: "review_due", label: "Review due" },
  { key: "capacity_threshold_exceeded", label: "Capacity threshold exceeded" },
] as const;

const CHANNELS = ["in_app", "email", "sms"] as const;

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8">
        <PageHeader title="Notifications" />
        <p className="mt-2 text-sm text-soft-taupe">Sign in to manage notification preferences.</p>
      </div>
    );
  }

  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("notification_type, channel, cadence, enabled")
    .eq("user_id", user.id);

  const prefByKey = new Map(
    (preferences ?? []).map((p) => [`${p.notification_type}:${p.channel}`, p]),
  );

  return (
    <div className="p-8">
      <PageHeader
        title="Notifications"
        description="Choose channel, cadence, and on/off per trigger. Selective and batchable, per Section 14.4 — defaults to in-app, immediate, enabled until you change them."
      />

      <div className="mt-6 space-y-4">
        {TRIGGER_TYPES.map((trigger) => (
          <Card key={trigger.key} className="text-sm">
            <p className="font-medium">{trigger.label}</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CHANNELS.map((channel) => {
                const pref = prefByKey.get(`${trigger.key}:${channel}`);
                return (
                  <form key={channel} action={setNotificationPreference} className="flex items-center gap-2 rounded border border-soft-taupe p-2 text-xs">
                    <input type="hidden" name="notification_type" value={trigger.key} />
                    <input type="hidden" name="channel" value={channel} />
                    <span className="w-12 font-medium">{channel.replace("_", "-")}</span>
                    <select name="cadence" defaultValue={pref?.cadence ?? "immediate"} className="rounded border border-soft-taupe bg-ivory-light px-1 py-0.5">
                      <option value="immediate">Immediate</option>
                      <option value="daily_digest">Daily digest</option>
                      <option value="weekly_digest">Weekly digest</option>
                    </select>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name="enabled" defaultChecked={pref?.enabled ?? true} />
                      On
                    </label>
                    <button type="submit" className="lc-btn-secondary px-2 py-0.5">Save</button>
                  </form>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
