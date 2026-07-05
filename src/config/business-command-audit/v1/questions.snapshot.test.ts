/* eslint-disable */
// Snapshot + integrity guard for the CANONICAL Business Command Audit question
// bank v1 (48 questions, 12 phases). Locks the exact wording (checksum), the
// canonical phase set/order, and the Build Completion / Operating Health measure
// pattern. Run with `npm run test`.
//
// This file is treated as canonical and its text must never be paraphrased,
// merged, or silently changed. If you intentionally edit questions.json (only
// after formal approval), regenerate the checksum:
//   shasum -a 256 src/config/business-command-audit/v1/questions.json \
//     | awk '{print $1}' > src/config/business-command-audit/v1/questions.checksum.txt
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const raw = readFileSync(new URL("./questions.json", import.meta.url), "utf8");
const expectedChecksum = readFileSync(new URL("./questions.checksum.txt", import.meta.url), "utf8").trim();
const data = JSON.parse(raw) as {
  templateKey: string;
  version: string;
  status: string;
  questionCount: number;
  phaseCount: number;
  phases: Array<{
    phaseKey: string;
    name: string;
    order: number;
    questions: Array<{ questionKey: string; displayOrder: number; text: string; primaryMeasure: string }>;
  }>;
};

// Canonical phase order per the approved bank's phaseOrder (spec order).
const CANONICAL_PHASES: Array<[number, string]> = [
  [1, "founder-leadership"],
  [2, "vision-strategy"],
  [3, "market-positioning"],
  [4, "offers-pricing"],
  [5, "brand-messaging"],
  [6, "sales-revenue"],
  [7, "client-journey-delivery"],
  [8, "client-success-retention"],
  [9, "marketing-audience-growth"],
  [10, "finance-legal-risk"],
  [11, "operations-systems-technology"],
  [12, "team-capacity"],
];

describe("business-command-audit v1 canonical question bank", () => {
  it("matches its recorded checksum (exact wording is locked)", () => {
    const actual = createHash("sha256").update(raw).digest("hex");
    expect(
      actual,
      "questions.json changed but questions.checksum.txt was not updated. Canonical wording must not drift silently; if the change is approved, regenerate the checksum (see this file's header).",
    ).toBe(expectedChecksum);
  });

  it("has exactly 48 questions across the canonical 12 phases (4 each)", () => {
    expect(data.phases.map((p) => [p.order, p.phaseKey])).toEqual(CANONICAL_PHASES);
    let total = 0;
    for (const p of data.phases) {
      expect(p.questions.length, `${p.phaseKey} must have 4 questions`).toBe(4);
      total += p.questions.length;
    }
    expect(total).toBe(48);
    expect(data.questionCount).toBe(48);
    expect(data.phaseCount).toBe(12);
  });

  it("keeps every question keyed and non-empty", () => {
    const keys = new Set<string>();
    for (const p of data.phases) {
      for (const q of p.questions) {
        expect(q.text.trim().length, `empty text in ${p.phaseKey}`).toBeGreaterThan(0);
        expect(q.questionKey.length).toBeGreaterThan(0);
        expect(keys.has(q.questionKey), `duplicate questionKey ${q.questionKey}`).toBe(false);
        keys.add(q.questionKey);
      }
    }
    expect(keys.size).toBe(48);
  });

  it("follows the Build Completion (Q1,Q2) / Operating Health (Q3,Q4) measure pattern", () => {
    for (const p of data.phases) {
      const byOrder = new Map(p.questions.map((q) => [q.displayOrder, q.primaryMeasure]));
      expect(byOrder.get(1)).toBe("Build Completion");
      expect(byOrder.get(2)).toBe("Build Completion");
      expect(byOrder.get(3)).toBe("Operating Health");
      expect(byOrder.get(4)).toBe("Operating Health");
    }
  });

  it("stays 'proposed' until formally approved", () => {
    expect(["proposed", "approved"]).toContain(data.status);
  });
});
