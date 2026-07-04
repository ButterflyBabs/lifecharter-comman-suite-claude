import { Card, PageHeader } from "@/components/ui";
import { getAccessibilityPrefs, setAccessibilityPrefs } from "@/lib/accessibility/actions";

export default async function AccessibilitySettingsPage() {
  const prefs = await getAccessibilityPrefs();

  return (
    <div className="p-8">
      <PageHeader
        title="Accessibility"
        description="Manual overrides on top of the keyboard, screen reader, zoom, and reduced-motion/high-contrast support already built into every page (Section 16.1)."
      />

      <Card className="mt-6 max-w-md">
        <form action={setAccessibilityPrefs} className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reduce_motion" defaultChecked={prefs.reduce_motion} />
            Reduce motion, regardless of my device setting
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="high_contrast" defaultChecked={prefs.high_contrast} />
            Increase contrast, regardless of my device setting
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="large_text" defaultChecked={prefs.large_text} />
            Larger base text size
          </label>
          <button type="submit" className="lc-btn-primary">Save</button>
        </form>
      </Card>

      <Card className="mt-6 max-w-md text-sm text-soft-taupe">
        These settings apply on top of your device&apos;s own
        prefers-reduced-motion and prefers-contrast settings, which this app
        already respects automatically. Full assistive-technology testing
        (a real screen reader pass, keyboard-only walkthrough, and browser
        zoom test) hasn&apos;t been run yet — see docs/testing.md.
      </Card>
    </div>
  );
}
