import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";

// Appendix A lists both /ai/policies and /settings/ai-policies, but Section
// 6 doesn't describe distinct content for each — /ai/policies (Phase 7)
// already renders the permission ladder, Human Approval Matrix, and each
// agent's current permission-level distribution. Rather than duplicate that
// reference content under a second route, this is a thin redirect-style
// link, the same choice made for Settings -> Integrations.

export default function AiPoliciesSettingsPage() {
  return (
    <div className="p-8">
      <PageHeader
        title="AI Policies"
        description="The permission ladder and Human Approval Matrix (Appendix C) live on the AI Team section, since they govern agent behavior directly."
      />
      <Card className="mt-6 max-w-md text-sm">
        <p className="mb-2">
          View the permission ladder, the Human Approval Matrix, and every
          agent&apos;s current permission level.
        </p>
        <Link href="/ai/policies" className="lc-btn-primary inline-block">
          Open AI Policies
        </Link>
      </Card>
    </div>
  );
}
