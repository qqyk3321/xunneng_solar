"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/** Below-fold artwork is requested only when its slot enters the viewport.
 * Invisible carousel/story layers wait until selected; loaded layers stay mounted.
 * Hero images intentionally do not use this component.
 */
export function ViewportImage({
  enabled = true,
  ...props
}: ImageProps & { enabled?: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready || !enabled || !host.current) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [enabled, ready]);
  return (
    <span
      ref={host}
      data-viewport-image
      data-image-ready={ready}
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
      {ready && <Image {...props} alt={props.alt} loading="eager" />}
    </span>
  );
}
