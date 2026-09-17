"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/react";

type Step = { target: string; title: string; description: string };

export default function AnalysisTour({ steps, index, ready, onStepChange }: {
  steps: readonly Step[]; index: number; ready: boolean; onStepChange: (step: number | null) => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const pointer = useRef<SVGSVGElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const markerId = useId();
  const backdrop = useRef<HTMLDivElement>(null);
  const [positioned, setPositioned] = useState(false);
  const step = steps[index];

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      // Native detail/settings dialogs handle their own Escape key.
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        onStepChange(null);
        document.querySelector<HTMLButtonElement>(".tour-launch")?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onStepChange]);

  useEffect(() => {
    const target = document.getElementById(step.target);
    const card = panel.current;
    const tip = pointer.current;
    setPositioned(false);
    if (!card || !tip) return;
    if (!target) {
      backdrop.current?.removeAttribute("style");
      Object.assign(card.style, { left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
      tip.style.display = "none";
      if (frame.current) frame.current.style.display = "none";
      setPositioned(true);
      return;
    }
    let active = true;
    card.style.transform = "none";
    tip.style.display = "block";
    if (frame.current) frame.current.style.display = "block";
    target.classList.add("tour-target");
    // The summary is sticky/fixed: do not scroll the underlying document for it.
    if (step.target !== "solar-live-summary") target.scrollIntoView({ behavior: "instant", block: step.target === "solar-report-button" ? "nearest" : innerWidth < 760 ? "start" : "center" });
    const update = () => {
      // Four panels leave an interactive hole around the target, including
      // sticky/fixed elements, without altering their stacking or positioning.
      const rect = target.getBoundingClientRect();
      const bounds = {
        top: Math.max(0, Math.min(innerHeight, rect.top - 8)),
        bottom: Math.max(0, Math.min(innerHeight, rect.bottom + 8)),
        left: Math.max(0, Math.min(innerWidth, rect.left - 8)),
        right: Math.max(0, Math.min(innerWidth, rect.right + 8)),
      };
      for (const [edge, value] of Object.entries(bounds)) {
        backdrop.current?.style.setProperty(`--tour-${edge}`, `${value}px`);
      }
      if (frame.current) Object.assign(frame.current.style, {
        left: `${bounds.left}px`, top: `${bounds.top}px`,
        width: `${bounds.right - bounds.left}px`, height: `${bounds.bottom - bounds.top}px`,
      });
      void computePosition(target, card, {
        strategy: "fixed",
        placement: step.target === "solar-live-summary" && innerWidth >= 1180 ? "left" : "bottom",
        middleware: [offset(32), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y, placement }) => {
        if (!active) return;
        Object.assign(card.style, { left: `${x}px`, top: `${y}px` });
        const side = placement.split("-")[0];
        card.dataset.side = side;
        const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
        const horizontal = side === "left" || side === "right";
        const sx = horizontal ? (side === "left" ? x + card.offsetWidth + 2 : x - 2) : clamp((bounds.left + bounds.right) / 2, x + 20, x + card.offsetWidth - 20);
        const sy = horizontal ? clamp((bounds.top + bounds.bottom) / 2, y + 20, y + card.offsetHeight - 20) : (side === "top" ? y + card.offsetHeight + 2 : y - 2);
        // End inside the bright frame; the pointer is never part of the dimmed page.
        const ex = horizontal ? (side === "left" ? bounds.left + 2 : bounds.right - 2) : clamp(sx, bounds.left + 12, bounds.right - 12);
        const ey = horizontal ? clamp(sy, bounds.top + 12, bounds.bottom - 12) : (side === "top" ? bounds.top + 2 : bounds.bottom - 2);
        const path = horizontal
          ? `M${sx},${sy} C${(sx + ex) / 2},${sy} ${(sx + ex) / 2},${ey} ${ex},${ey}`
          : `M${sx},${sy} C${sx},${(sy + ey) / 2} ${ex},${(sy + ey) / 2} ${ex},${ey}`;
        tip.querySelectorAll(".tour-connector-line").forEach(line => line.setAttribute("d", path));
        setPositioned(true);
      });
    };
    const cleanup = autoUpdate(target, card, update);
    return () => { active = false; cleanup(); target.classList.remove("tour-target"); };
  }, [index, step.target, ready]);

  return createPortal(<><div ref={backdrop} className="tour-backdrop" aria-hidden="true" data-ready={positioned}>
    <div className="tour-shade-top" /><div className="tour-shade-bottom" /><div className="tour-shade-left" /><div className="tour-shade-right" />
  </div><div className="tour-emphasis" aria-hidden="true" data-ready={positioned}>
    <div ref={frame} className="tour-focus-frame" />
    <svg ref={pointer} className="tour-pointer" width="100%" height="100%">
      <defs><marker id={markerId} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1L10 6L1 11" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" /><path d="M1 1L10 6L1 11" fill="none" stroke="#087b69" strokeWidth="3" strokeLinejoin="round" /></marker></defs>
      <path className="tour-connector-line" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path className="tour-connector-line" fill="none" stroke="#087b69" strokeWidth="3" strokeLinecap="round" markerEnd={`url(#${markerId})`} />
    </svg>
  </div><aside ref={panel} className="analysis-tour" role="region" aria-label="使用教程" data-target={step.target} style={{ visibility: positioned ? "visible" : "hidden" }}>
    <div className="tour-progress"><span>操作指引</span><b>{index + 1} / {steps.length}</b><button type="button" aria-label="退出教程" onClick={() => onStepChange(null)}>×</button></div>
    <div className="tour-copy" aria-live="polite"><h2>{step.title}</h2><p>{step.description}</p>{index >= 4 && !ready && <small>模型正在加载；加载失败时可退出教程重试。</small>}</div>
    <div className="tour-footer"><span>可直接操作框内选项</span><div>{index > 0 && <button type="button" onClick={() => onStepChange(index - 1)}>上一步</button>}<button type="button" className="tour-next" disabled={index >= 3 && !ready} onClick={() => onStepChange(index === steps.length - 1 ? null : index + 1)}>{index === steps.length - 1 ? "完成" : "下一步"}</button></div></div>
  </aside></>, document.body);
}
