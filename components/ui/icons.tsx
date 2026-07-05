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

export function IconCircle() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function IconDollarSign() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M16 7.5c0-1.9-1.8-3-4-3s-4 1.1-4 3 1.8 2.6 4 3 4 1.1 4 3-1.8 3-4 3-4-1.1-4-3" />
    </svg>
  );
}

export function IconTrendingUp() {
  return (
    <svg {...base} aria-hidden="true">
      <polyline points="3,17 9,11 13,15 21,6" />
      <polyline points="15,6 21,6 21,12" />
    </svg>
  );
}

export function IconCpu() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </svg>
  );
}

export function IconBookOpen() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 5.5c2-1 5-1 8 .5v13c-3-1.5-6-1.5-8-.5z" />
      <path d="M20 5.5c-2-1-5-1-8 .5v13c3-1.5 6-1.5 8-.5z" />
    </svg>
  );
}

export function IconShieldAlert() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M12 8v5" />
      <line x1="12" y1="16" x2="12" y2="16.1" />
    </svg>
  );
}

export function IconBuilding() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="5" y="3" width="9" height="18" />
      <path d="M14 8h5v13h-5" />
      <path d="M8 7h1M8 11h1M8 15h1" />
    </svg>
  );
}

export function IconWrench() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2z" />
    </svg>
  );
}

export function IconPlug() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M9 3v5M15 3v5" />
      <rect x="7" y="8" width="10" height="6" rx="1.5" />
      <path d="M12 14v3a4 4 0 0 1-4 4H7" />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconChevronLeft() {
  return (
    <svg {...base} width={18} height={18} aria-hidden="true">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  );
}

export function IconGripVertical() {
  return (
    <svg {...base} width={16} height={16} aria-hidden="true" fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}

export function IconEye() {
  return (
    <svg {...base} width={18} height={18} aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff() {
  return (
    <svg {...base} width={18} height={18} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a15.6 15.6 0 0 1-3.4 4.3M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7a9.5 9.5 0 0 0 4.2-.9" />
      <path d="M9.5 9.7a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconLayoutGrid() {
  return (
    <svg {...base} width={16} height={16} aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function IconLayoutList() {
  return (
    <svg {...base} width={16} height={16} aria-hidden="true">
      <rect x="3" y="4" width="18" height="4" rx="1.5" />
      <rect x="3" y="10" width="18" height="4" rx="1.5" />
      <rect x="3" y="16" width="18" height="4" rx="1.5" />
    </svg>
  );
}
