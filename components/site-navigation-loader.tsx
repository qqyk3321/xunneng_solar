"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { SiteLoadingVisual } from "./site-loading-visual";

declare global {
  interface Window {
    __solTideInitialLoader?: number;
  }
}

const NAVIGATION_EVENT = "solortide:navigation-start";
const SOLAR_MINIMUM_LOADING_MS = 1000;
const isSolarAnalysis = (path: string) => path.replace(/\/$/, "") === "/solar-analysis";

function NavigationEvents() {
  const pathname = usePathname();
  const exitTimer = useRef<number | undefined>(undefined);
  const stallTimer = useRef<number | undefined>(undefined);
  const watchTimer = useRef<number | undefined>(undefined);
  const committedHref = useRef<string | undefined>(undefined);
  const paintFrame = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const minimumUntil = useRef(0);
  const minimumTimer = useRef<number | undefined>(undefined);
  const minimumFrame = useRef<number | undefined>(undefined);
  const startMinimum = useCallback(() => {
    minimumUntil.current = performance.now() + SOLAR_MINIMUM_LOADING_MS;
    window.cancelAnimationFrame(minimumFrame.current ?? 0);
    minimumFrame.current = window.requestAnimationFrame(() => {
      minimumFrame.current = window.requestAnimationFrame(() => {
        minimumUntil.current = performance.now() + SOLAR_MINIMUM_LOADING_MS;
      });
    });
  }, []);

  const finish = useCallback(function finishLoading() {
    if (isSolarAnalysis(window.location.pathname) && minimumUntil.current === 0 && document.documentElement.dataset.siteLoading) {
      startMinimum();
    }
    const remaining = minimumUntil.current - performance.now();
    window.clearTimeout(minimumTimer.current);
    if (remaining > 0) {
      minimumTimer.current = window.setTimeout(finishLoading, remaining);
      return;
    }
    window.clearTimeout(window.__solTideInitialLoader);
    window.clearTimeout(stallTimer.current);
    window.clearTimeout(watchTimer.current);
    committedHref.current = window.location.href;
    const root = document.documentElement;
    if (!root.dataset.siteLoading || root.dataset.siteLoading === "leaving") return;
    if (root.dataset.siteLoading === "pending" && performance.now() - startedAt.current < 140) {
      delete root.dataset.siteLoading;
      window.dispatchEvent(new Event("solortide:navigation-end"));
      return;
    }
    root.dataset.siteLoading = "leaving";
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      delete root.dataset.siteLoading;
      window.dispatchEvent(new Event("solortide:navigation-end"));
    }, 220);
  }, [startMinimum]);

  const finishWhenReady = useCallback(() => {
    window.clearTimeout(watchTimer.current);
    const waitForContent = () => {
      const fallback = document.querySelector('[data-route-loading="true"]');
      if (fallback && !fallback.closest('[hidden]')) {
        watchTimer.current = window.setTimeout(waitForContent, 50);
        return;
      }
      finish();
    };
    waitForContent();
  }, [finish]);

  const begin = useCallback(
    (fromHref = window.location.href, immediate = false, destinationPath = window.location.pathname) => {
      const root = document.documentElement;
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(stallTimer.current);
      window.clearTimeout(watchTimer.current);
      window.clearTimeout(minimumTimer.current);
      window.cancelAnimationFrame(minimumFrame.current ?? 0);
      window.cancelAnimationFrame(paintFrame.current ?? 0);
      startedAt.current = performance.now();
      const solar = isSolarAnalysis(destinationPath);
      minimumUntil.current = 0;
      if (solar) startMinimum();
      root.dataset.siteLoading = immediate || solar ? "immediate" : "pending";

      // Query-only navigations do not change usePathname. Detect the committed
      // URL without subscribing the root layout to Next's async search state.
      const watchUrl = () => {
        if (window.location.href !== fromHref) {
          paintFrame.current = window.requestAnimationFrame(() => {
            paintFrame.current = window.requestAnimationFrame(finishWhenReady);
          });
          return;
        }
        watchTimer.current = window.setTimeout(watchUrl, 50);
      };
      watchTimer.current = window.setTimeout(watchUrl, 50);
      // Never leave the current page permanently covered if a navigation fails.
      stallTimer.current = window.setTimeout(finish, 20_000);
    },
    [finish, finishWhenReady, startMinimum],
  );

  useEffect(() => {
    // Keep the initial fail-open watchdog until content is actually ready,
    // not merely until this layout has hydrated ahead of a streamed page.
    committedHref.current = window.location.href;
    paintFrame.current = window.requestAnimationFrame(() => {
      // Start initial-entry timing after the overlay can actually be painted,
      // not in the head script before CSS/the streamed body arrive.
      if (isSolarAnalysis(pathname) && minimumUntil.current === 0) {
        startMinimum();
        document.documentElement.dataset.siteLoading = "immediate";
      }
      paintFrame.current = window.requestAnimationFrame(finishWhenReady);
    });
    return () => window.cancelAnimationFrame(paintFrame.current ?? 0);
  }, [finishWhenReady, pathname, startMinimum]);

  useEffect(() => {
    function navigate(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        !["http:", "https:"].includes(destination.protocol)
      )
        return;
      const current = new URL(window.location.href);
      const sameDocument =
        destination.pathname === current.pathname &&
        destination.search === current.search;
      if (sameDocument || destination.href === current.href) return;
      begin(current.href, false, destination.pathname);
    }
    const programmatic = (event: Event) => begin(
      window.location.href,
      event instanceof CustomEvent && event.detail?.immediate === true,
    );
    const restored = () => {
      const previous = committedHref.current;
      if (!previous) return;
      const previousUrl = new URL(previous);
      if (previousUrl.pathname === window.location.pathname &&
          previousUrl.search === window.location.search) {
        committedHref.current = window.location.href;
        return;
      }
      begin(previous);
    };
    const shown = (event: PageTransitionEvent) => {
      if (event.persisted && isSolarAnalysis(window.location.pathname)) {
        startMinimum();
        document.documentElement.dataset.siteLoading = "immediate";
      }
      finishWhenReady();
    };
    const cancelled = () => {
      window.cancelAnimationFrame(paintFrame.current ?? 0);
      finish();
    };
    // Next Link calls preventDefault during bubbling; observe before that.
    document.addEventListener("click", navigate, true);
    window.addEventListener(NAVIGATION_EVENT, programmatic);
    window.addEventListener("solortide:navigation-cancel", cancelled);
    window.addEventListener("popstate", restored);
    window.addEventListener("pageshow", shown);
    return () => {
      document.removeEventListener("click", navigate, true);
      window.removeEventListener(NAVIGATION_EVENT, programmatic);
      window.removeEventListener("solortide:navigation-cancel", cancelled);
      window.removeEventListener("popstate", restored);
      window.removeEventListener("pageshow", shown);
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(stallTimer.current);
      window.clearTimeout(watchTimer.current);
      window.clearTimeout(minimumTimer.current);
      window.cancelAnimationFrame(minimumFrame.current ?? 0);
      window.cancelAnimationFrame(paintFrame.current ?? 0);
    };
  }, [begin, finish, finishWhenReady, startMinimum]);

  return null;
}

export function SiteNavigationLoader() {
  return (
    <>
      <SiteLoadingVisual />
      <NavigationEvents />
    </>
  );
}
