'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAnalyticsEvent, warmAnalyticsClient } from '@/lib/analytics';

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    warmAnalyticsClient();
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    void captureAnalyticsEvent('$pageview', { $current_url: window.location.href });
  }, [pathname]);

  return null;
}
