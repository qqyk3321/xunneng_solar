"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./floating-question-button.module.css";

export function FloatingQuestionButton({
  onOpen,
  disabled,
  action = "dialog",
}: {
  onOpen: () => void;
  disabled: boolean;
  action?: "dialog" | "scroll";
}) {
  const button = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  function clamp(left: number, top: number) {
    const box = button.current?.getBoundingClientRect();
    return {
      left: Math.max(12, Math.min(left, innerWidth - (box?.width ?? 180) - 12)),
      top: Math.max(12, Math.min(top, innerHeight - (box?.height ?? 48) - 12)),
    };
  }
  useEffect(() => {
    const resize = () =>
      setPosition((value) => (value ? clamp(value.left, value.top) : null));
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return (
    <button
      ref={button}
      type="button"
      className={styles.launcher}
      style={
        position
          ? {
              left: position.left,
              top: position.top,
              right: "auto",
              bottom: "auto",
            }
          : undefined
      }
      data-dragging={dragging || undefined}
      disabled={disabled}
      aria-label="Ask a question"
      aria-haspopup={action === "dialog" ? "dialog" : undefined}
      data-tip-right={position && position.left < 140 ? true : undefined}
      data-tip-below={position && position.top < 60 ? true : undefined}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        suppressClick.current = false;
        const box = event.currentTarget.getBoundingClientRect();
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: box.left,
          top: box.top,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x,
          dy = event.clientY - start.y;
        if (!start.moved && Math.hypot(dx, dy) < 8) return;
        start.moved = true;
        suppressClick.current = true;
        setDragging(true);
        setPosition(clamp(start.left + dx, start.top + dy));
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        suppressClick.current = drag.current.moved;
        drag.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
        suppressClick.current = true;
        setDragging(false);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
        setDragging(false);
      }}
      onClick={(event) => {
        if (event.detail !== 0 && suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        suppressClick.current = false;
        onOpen();
      }}
    >
      <span className={styles.ripple} aria-hidden="true" />
      <span className={styles.water} aria-hidden="true" />
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 3V11.5a9 9 0 0 1 18 0Z" />
        <path d="M7 10h8M7 14h5" />
      </svg>
      <span className={styles.tooltip} aria-hidden="true">
        Ask a question
      </span>
    </button>
  );
}
