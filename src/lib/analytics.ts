type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

type PostHogModule = typeof import('posthog-js');

let clientPromise: Promise<PostHogModule['default'] | null> | null = null;
let warmScheduled = false;

async function getAnalyticsClient() {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (!clientPromise) {
    clientPromise = import('posthog-js')
      .then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
            capture_pageview: false,
            capture_pageleave: true,
          });
        }

        return posthog;
      })
      .catch(() => null);
  }

  return clientPromise;
}

export function warmAnalyticsClient() {
  if (typeof window === 'undefined' || warmScheduled) {
    return;
  }

  warmScheduled = true;
  const warm = () => {
    void getAnalyticsClient();
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(warm, { timeout: 2000 });
    return;
  }

  globalThis.setTimeout(warm, 1200);
}

export async function captureAnalyticsEvent(
  event: string,
  properties?: AnalyticsProperties,
) {
  const client = await getAnalyticsClient();
  client?.capture(event, properties);
}
