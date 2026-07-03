// Canonical primary navigation — Section 5's ten numbered sections, mapped to
// their Appendix A base routes (see docs/navigation-and-routes.md for why
// Appendix A's segment names win over Section 5's).
export const PRIMARY_NAV = [
  { label: "Command Center", href: "/command/today" },
  { label: "My Roadmap", href: "/roadmap/setup" },
  { label: "Business Architecture", href: "/architecture/founder" },
  { label: "Revenue Engine", href: "/revenue/overview" },
  { label: "Client Experience", href: "/clients/overview" },
  { label: "Operations", href: "/operations/overview" },
  { label: "Review Center", href: "/reviews/daily" },
  { label: "AI Team", href: "/ai/overview" },
  { label: "Knowledge and Asset Library", href: "/library/business-brain" },
  { label: "Settings", href: "/settings/workspace" },
] as const;
