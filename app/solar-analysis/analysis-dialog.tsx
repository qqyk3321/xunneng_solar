"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export default function AnalysisDialog({ title, onClose, children, closeDisabled = false, className = "" }: {
  title: string; onClose: () => void; children: ReactNode; closeDisabled?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className={`analysis-dialog ${className}`} aria-label={title} aria-busy={closeDisabled || undefined} onCancel={event => { event.preventDefault(); if (!closeDisabled) onClose(); }} onClick={event => {
    if (closeDisabled) return;
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}>
    <div className="analysis-dialog-head"><h2>{title}</h2><button type="button" aria-label="关闭弹窗" disabled={closeDisabled} onClick={onClose}>×</button></div>
    {children}
  </dialog>;
}
