"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./floating-question-button.module.css";
import { WhatsAppDialog, WhatsAppIcon } from "./whatsapp-contact";

export function FloatingQuestionButton({
  onOpen,
  disabled,
  compact = false,
}: {
  onOpen?: () => void;
  disabled: boolean;
  compact?: boolean;
  action?: "dialog" | "scroll";
}) {
  const button = useRef<HTMLButtonElement>(null);
  const [contactOpen, setContactOpen] = useState(false);
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
    <>
      <WhatsAppDialog
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        onMessage={onOpen}
        compact={compact}
      />
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
        aria-label="Chat on WhatsApp"
        aria-haspopup="dialog"
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
          setContactOpen(true);
        }}
      >
        <WhatsAppIcon />
        <span className={styles.tooltip} aria-hidden="true">
          Chat on WhatsApp
        </span>
      </button>
    </>
  );
}
