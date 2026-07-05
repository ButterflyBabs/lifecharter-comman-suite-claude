/* eslint-disable */
// Snapshot + integrity guard for the versioned Business Command Audit question
// bank. Prevents silent wording drift (checksum), enforces the canonical domain
// set/order, and gates seeding: once status is "APPROVED" the bank MUST have
// >=4 questions/domain (>=48 total) with non-empty text. Run with `npm run test`.
//
// When you intentionally change questions.json, regenerate the checksum:
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
  allowedResponseTypes: string[];
  allowedScoreCategories: string[];
  domains: Array<{
    domainKey: string;
    code: string;
    name: string;
    order: number;
    questions: Array<{ text?: string; responseType?: string; scoreCategory?: string }>;
  }>;
};

// The 12 canonical domains, in the order held in the live database
// (business_command_domains.display_order). Codes are authoritative for the FK
// mapping used by the seed.
const CANONICAL_DOMAINS: Array<[number, string]> = [
  [1, "founder_leadership"],
  [2, "vision_strategy"],
  [3, "market_positioning"],
  [4, "offers_pricing"],
  [5, "brand_messaging"],
  [6, "marketing_growth"],
  [7, "sales_revenue"],
  [8, "client_journey_delivery"],
  [9, "client_success_retention"],
  [10, "operations_systems_technology"],
  [11, "team_capacity"],
  [12, "finance_legal_risk"],
];

describe("business-command-audit v1 question bank", () => {
  it("matches its recorded checksum (no silent wording changes)", () => {
    const actual = createHash("sha256").update(raw).digest("hex");
    expect(
      actual,
      "questions.json changed but questions.checksum.txt was not updated. If the change is intentional and APPROVED, regenerate the checksum (see the header of this file).",
    ).toBe(expectedChecksum);
  });

  it("keeps the canonical 12 domains, codes, and order intact", () => {
    expect(data.domains.map((d) => [d.order, d.code])).toEqual(CANONICAL_DOMAINS);
  });

  it("enforces the >=48 (>=4/domain) approved bank before it can be seeded", () => {
    if (data.status !== "APPROVED") {
      // Draft scaffold: nothing to seed yet. This is expected until canonical,
      // human-approved wording has been added.
      expect(data.status).toBe("DRAFT_AWAITING_CANONICAL_TEXT");
      return;
    }
    let total = 0;
    for (const domain of data.domains) {
      expect(domain.questions.length, `${domain.code} needs >=4 questions`).toBeGreaterThanOrEqual(4);
      for (const q of domain.questions) {
        expect((q.text ?? "").trim().length, `empty question text in ${domain.code}`).toBeGreaterThan(0);
        expect(data.allowedResponseTypes).toContain(q.responseType);
        if (q.scoreCategory != null) expect(data.allowedScoreCategories).toContain(q.scoreCategory);
        total++;
      }
    }
    expect(total, "approved bank must have at least 48 questions").toBeGreaterThanOrEqual(48);
  });
});
