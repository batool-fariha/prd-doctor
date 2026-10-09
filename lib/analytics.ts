import posthog from "posthog-js";

type EventName = "analysis_started" | "analysis_completed" | "share_clicked" | "score_viewed";

let ready = false;

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (ready || !key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only", // anonymous usage; no user profiles
    capture_pageview: true,
    disable_session_recording: true, // the PRD textarea must never be recorded
    autocapture: false, // only our four explicit events
    capture_dead_clicks: false,
    disable_surveys: true,
  });
  ready = true;
}

/** Never pass PRD text here: only counts and scores. */
export function track(event: EventName, props: Record<string, string | number | boolean> = {}) {
  initAnalytics();
  if (ready) posthog.capture(event, props);
}
