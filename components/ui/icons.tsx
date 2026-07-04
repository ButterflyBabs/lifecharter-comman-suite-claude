const base = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCompass() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polygon points="14.5,9.5 10.5,10.5 9.5,14.5 13.5,13.5" />
    </svg>
  );
}

export function IconClipboard() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}

export function IconCheckCircle() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  );
}

export function IconHelpCircle() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.2 1-1.2 1.8" />
      <line x1="12" y1="16.5" x2="12" y2="16.6" />
    </svg>
  );
}

export function IconUsers() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.2 20c.3-2.2 1.8-4 3.8-4.6" />
    </svg>
  );
}

export function IconReceipt() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M6 2h12v20l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V2z" />
      <path d="M8.5 7h7M8.5 11h7M8.5 15h4" />
    </svg>
  );
}

export function IconCreditCard() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M6.5 15h3" />
    </svg>
  );
}

export function IconMap() {
  return (
    <svg {...base} aria-hidden="true">
      <polygon points="9,4 3,6 3,20 9,18 15,20 21,18 21,4 15,6 9,4" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function IconGauge() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15l3.5-4.5" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

export function IconFlag() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M6 3v18" />
      <path d="M6 4h11l-2.5 4 2.5 4H6" />
    </svg>
  );
}

export function IconClock() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
