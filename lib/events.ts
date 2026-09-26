export type ProductEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "instagram_connect_started"
  | "instagram_connected"
  | "analysis_started"
  | "analysis_completed"
  | "strategy_created"
  | "checkout_started"
  | "subscription_started"
  | "subscription_cancelled"
  | "trial_started"
  | "diagnostic_started"
  | "diagnostic_completed"
  | "checkout_viewed"
  | "pix_created"
  | "payment_approved"
  | "trial_expired"
  | "upgrade_clicked";

export interface AnalyticsEvent {
  name: ProductEvent;
  occurredAt: string;
  anonymousId?: string;
  userId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  if (typeof window === "undefined") return;

  await fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true
  }).catch(() => undefined);
}
