// Shared audit types. Kept out of any "use server" module so they can be
// imported by client components and server components alike.

export type AdaptiveQuestion = {
  id: string;
  prompt: string;
  rationale: string | null;
  domainId: string;
  value: string | null;
  notes: string | null;
};
