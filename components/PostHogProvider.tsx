"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { CONSENT_EVENT, analyticsAllowed, analyticsURL } from "@/lib/analytics-consent";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { Suspense, useEffect, useState } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com").trim().replace(/\/$/, "");

function PostHogPageView({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !POSTHOG_KEY || !analyticsAllowed()) return;

    posthog.capture("$pageview", {
      $current_url: analyticsURL(window.location.href),
    });
  }, [enabled, pathname]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [posthogReady, setPosthogReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const consent = analyticsAllowed();
    setAllowed(consent);
    if (!consent || !POSTHOG_KEY) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      request_batching: false,
      opt_out_capturing_by_default: true,
      before_send: (event) => {
        if (!event || !analyticsAllowed()) return null;
        for (const key of ["$current_url", "$initial_current_url", "$referrer", "$initial_referrer", "$session_entry_url", "$session_entry_referrer"]) {
          const value = event.properties[key];
          if (typeof value === "string") event.properties[key] = analyticsURL(value, key.includes("referrer"));
        }
        return event;
      },
      loaded: (client) => {
        if (!analyticsAllowed()) return;
        client.opt_in_capturing();
        setPosthogReady(true);
      },
    });
    const withdraw = () => {
      if (!analyticsAllowed()) {
        posthog.opt_out_capturing();
        posthog.stopSessionRecording();
        setPosthogReady(false);
        setAllowed(false);
      }
    };
    window.addEventListener(CONSENT_EVENT, withdraw);
    return () => window.removeEventListener(CONSENT_EVENT, withdraw);
  }, []);

  return (
    <Provider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView enabled={posthogReady} />
      </Suspense>
      {children}
      {allowed && <Analytics beforeSend={(event) => analyticsAllowed() ? { ...event, url: analyticsURL(event.url) } : null} />}
      {pathname !== "/privacidad" && <AnalyticsConsent banner />}
    </Provider>
  );
}
