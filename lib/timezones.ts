// Full IANA timezone list from the runtime's own ICU data (Node 18+ / modern
// browsers) rather than a hand-maintained array — stays accurate without
// upkeep. "UTC" is guaranteed present since it's the workspace default.
function getTimezones(): string[] {
  const zones = new Set<string>(["UTC"]);
  if (typeof Intl.supportedValuesOf === "function") {
    for (const zone of Intl.supportedValuesOf("timeZone")) {
      zones.add(zone);
    }
  }
  return [...zones].sort();
}

export const TIMEZONES = getTimezones();
