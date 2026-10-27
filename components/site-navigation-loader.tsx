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

function NavigationEvents() {
  const pathname = usePathname();
  const exitTimer = useRef<number | undefined>(undefined);
  const stallTimer = useRef<number | undefined>(undefined);
  const watchTimer = useRef<number | undefined>(undefined);
  const committedHref = useRef<string | undefined>(undefined);
  const paintFrame = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const slowTimer = useRef<number | undefined>(undefined);
  const contentReadyAt = useRef<number | undefined>(undefined);

  const finish = useCallback(function finishLoading() {
    window.clearTimeout(window.__solTideInitialLoader);
    window.clearTimeout(stallTimer.current);
    window.clearTimeout(watchTimer.current);
    window.clearTimeout(slowTimer.current);
    committedHref.current = window.location.href;
    const root = document.documentElement;
    if (!root.dataset.siteLoading || root.dataset.siteLoading === "leaving") return;
    root.dataset.siteRevealed = "true";
    if (root.dataset.siteLoading === "pending" && performance.now() - startedAt.current < 140) {
      delete root.dataset.siteLoading;
      delete root.dataset.siteLoadingKind;
      window.dispatchEvent(new Event("solortide:navigation-end"));
      return;
    }
    root.dataset.siteLoading = "leaving";
    window.dispatchEvent(new Event("solortide:navigation-reveal"));
    window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => {
      delete root.dataset.siteLoading;
      delete root.dataset.siteLoadingKind;
      delete root.dataset.siteLoadingSlow;
      window.dispatchEvent(new Event("solortide:navigation-end"));
    }, window.matchMedia("(min-width: 801px) and (prefers-reduced-motion: no-preference)").matches ? 360 : 220);
  }, []);

  const finishWhenReady = useCallback(() => {
    window.clearTimeout(watchTimer.current);
    const waitForContent = () => {
      const fallback = document.querySelector('[data-route-loading="true"]');
      if (fallback && !fallback.closest('[hidden]')) {
        watchTimer.current = window.setTimeout(waitForContent, 50);
        return;
      }
      // Give the priority background a bounded head start on first load.
      // Navigation and mobile retain their existing readiness behavior.
      const root = document.documentElement;
      if (root.dataset.siteLoading === "initial" && window.matchMedia("(min-width: 801px)").matches) {
        contentReadyAt.current ??= performance.now();
        const image = document.querySelector<HTMLImageElement>("[data-hero-background]");
        if (image && !image.complete && performance.now() - contentReadyAt.current < 850) {
          watchTimer.current = window.setTimeout(waitForContent, 30);
          return;
        }
      }
      finish();
    };
    waitForContent();
  }, [finish]);

  const begin = useCallback(
    (fromHref = window.location.href, immediate = false) => {
      const root = document.documentElement;
      window.clearTimeout(exitTimer.current);
      window.clearTimeout(stallTimer.current);
      window.clearTimeout(watchTimer.current);
      window.clearTimeout(slowTimer.current);
      contentReadyAt.current = undefined;
      window.cancelAnimationFrame(paintFrame.current ?? 0);
      startedAt.current = performance.now();
      root.dataset.siteLoading = immediate ? "immediate" : "pending";
      delete root.dataset.siteRevealed;
      root.dataset.siteLoadingKind = "route";
      delete root.dataset.siteLoadingSlow;
      slowTimer.current = window.setTimeout(() => {
        if (root.dataset.siteLoading === "pending") root.dataset.siteLoadingSlow = "true";
      }, 400);

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
    [finish, finishWhenReady],
  );

  useEffect(() => {
    // Keep the initial fail-open watchdog until content is actually ready,
    // not merely until this layout has hydrated ahead of a streamed page.
    committedHref.current = window.location.href;
    paintFrame.current = window.requestAnimationFrame(() => {
      paintFrame.current = window.requestAnimationFrame(finishWhenReady);
    });
    return () => window.cancelAnimationFrame(paintFrame.current ?? 0);
  }, [finishWhenReady, pathname]);

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
      begin(current.href, false);
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
    const shown = () => finishWhenReady();
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
      window.clearTimeout(slowTimer.current);
      window.cancelAnimationFrame(paintFrame.current ?? 0);
    };
  }, [begin, finish, finishWhenReady]);

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
