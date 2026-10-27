"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./viewport-image.module.css";

/** Desktop artwork loads near the viewport, with optional adjacent-slide preloading.
 * Mobile retains viewport-only loading; loaded layers stay mounted.
 * Hero images intentionally do not use this component.
 */
export function ViewportImage({
  enabled = true,
  preload = false,
  onLoad,
  ...props
}: ImageProps & { enabled?: boolean; preload?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  const [loadedSource, setLoadedSource] = useState<ImageProps["src"] | null>(null);
  useEffect(() => {
    if (ready || !host.current) return;
    const desktop = window.matchMedia("(min-width: 801px)");
    if (!("IntersectionObserver" in window)) {
      if (enabled) setReady(true);
      return;
    }
    let observer: IntersectionObserver | undefined;
    const observe = () => {
      observer?.disconnect();
      if (!enabled && !(preload && desktop.matches)) return;
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setReady(true);
            observer?.disconnect();
          }
        },
        { threshold: 0.01, rootMargin: desktop.matches ? "480px 0px" : "0px" },
      );
      if (host.current) observer.observe(host.current);
    };
    observe();
    desktop.addEventListener("change", observe);
    return () => { observer?.disconnect(); desktop.removeEventListener("change", observe); };
  }, [enabled, preload, ready]);
  return (
    <span
      ref={host}
      data-viewport-image
      data-image-ready={ready}
      data-image-loaded={loadedSource === props.src}
      className={styles.frame}
      style={
        props.fill
          ? {
              position: "absolute",
              inset: 0,
              display: "block",
              pointerEvents: "none",
            }
          : {
              display: "block",
              position: "relative",
              aspectRatio: `${props.width} / ${props.height}`,
            }
      }
    >
      {ready && <Image {...props} alt={props.alt} loading="eager" onLoad={event => {
        setLoadedSource(props.src);
        onLoad?.(event);
      }} />}
    </span>
  );
}
