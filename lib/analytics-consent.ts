export const CONSENT_KEY = "gasolisto_analytics_consent_v1";
export const CONSENT_EVENT = "gasolisto-analytics-consent";
export type AnalyticsChoice = "accepted" | "rejected";

export function readAnalyticsConsent(): AnalyticsChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const choice = localStorage.getItem(CONSENT_KEY);
    return choice === "accepted" || choice === "rejected" ? choice : null;
  } catch {
    return null;
  }
}

export function analyticsAllowed(): boolean {
  return readAnalyticsConsent() === "accepted";
}

export function analyticsURL(value: string, referrer = false): string {
  try {
    const url = new URL(value);
    return referrer ? url.origin : `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}
