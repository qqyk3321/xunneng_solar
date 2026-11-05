"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { HYBRID_SCENES, hybridSceneIndex } from "@/lib/hybrid-scenes";
import { hybridFlows } from "@/lib/hybrid-flows";
import styles from "./hybrid-energy-demo.module.css";

function Flow({
  d,
  active,
  ac = false,
  running,
}: {
  d: string;
  active: boolean;
  ac?: boolean;
  running: boolean;
}) {
  return (
    <g className={styles.flow} data-active={active} data-ac={ac}>
      <path d={d} className={styles.track} />
      {active && (
        <>
          <path d={d} className={styles.halo} />
          <path d={d} className={styles.cable} />
          {running &&
            [0, 1, 2].map((i) => (
              <g key={i} className={styles.movingArrow}>
                <polygon points="-8,-7 9,0 -8,7 -4,0" />
                <animateMotion
                  path={d}
                  dur="3s"
                  begin={`${-i}s`}
                  repeatCount="indefinite"
                  keyPoints="0;1"
                  keyTimes="0;1"
                  calcMode="linear"
                  rotate="auto"
                />
              </g>
            ))}
        </>
      )}
    </g>
  );
}

export function HybridEnergyDemo() {
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const noteId = useId();
  const scene = HYBRID_SCENES[index];
  const running = motion && visible && pageVisible;
  useEffect(() => {
    const sync = () => {
      const selected = hybridSceneIndex(window.location.hash);
      if (selected >= 0) {
        setIndex(selected);
        root.current?.scrollIntoView({ block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!media.matches);
    const visibility = () => setPageVisible(!document.hidden);
    update();
    visibility();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const outage = scene.id === "outage";
  return (
    <div
      ref={root}
      className={styles.demo}
      data-scene={scene.id}
      data-running={running}
    >
      <div
        className={styles.controls}
        role="group"
        aria-label="Energy scenarios"
      >
        {HYBRID_SCENES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={index === i}
            aria-controls={id}
            onClick={() => {
              setIndex(i);
              window.history.replaceState(
                window.history.state,
                "",
                `#scene-${item.id}`,
              );
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.presentation}>
        <div className={styles.console}>
          <div
            className={styles.stage}
            role="img"
            aria-label={`${scene.label}: ${scene.text} The grid feeds the home distribution board directly, with the inverter connected in parallel. Backup essentials require a separate isolated transfer path. Illustrative arrangement only.`}
          >
            <Image
              src="/images/hybrid-system-realistic.webp"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 720px"
              className={styles.photo}
            />
            <div className={styles.atmosphere} aria-hidden="true" />
            <svg
              className={styles.wires}
              viewBox="0 0 1145 1374"
              aria-hidden="true"
            >
              {hybridFlows(scene).map((flow) => (
                <Flow key={flow.id} d={flow.d} active={flow.active} ac={flow.ac} running={running} />
              ))}
              {outage && (
                <g transform="translate(840 666)" className={styles.disconnect}>
                  <path d="M0 -12V12" stroke="#eae6df" strokeWidth="16" />
                  <circle cy="-12" r="3" /><circle cy="12" r="3" />
                  <path d="M0 12L13 -8" />
                </g>
              )}
              {outage && (
                <g transform="translate(930 292)" className={styles.disconnect}>
                  <path d="M-23 0H23" stroke="#eae6df" strokeWidth="18" />
                  <circle cx="-23" r="4" />
                  <circle cx="23" r="4" />
                  <path d="M-23 0L14 -24" />
                </g>
              )}
            </svg>
          </div>
          <div className={styles.legend}>
            <span>
              <i /> DC · solar & battery
            </span>
            <span>
              <i /> AC · grid & home
            </span>
            <button
              type="button"
              className={styles.noteButton}
              popoverTarget={noteId}
              aria-label="Details about this diagram"
            >
              <span className={styles.noteIcon} aria-hidden="true">i</span>
              <span className={styles.noteLabel} aria-hidden="true">Details</span>
            </button>
          </div>
        </div>
        <div className={styles.description} id={id} aria-live="polite">
          <div className={styles.sceneCopy}>
            <h2>{scene.title}</h2>
            <p>{scene.text}</p>
          </div>
          <dl className={styles.status}>
            {[
              ["Solar panels", scene.solar],
              ["Battery", scene.battery],
              ["Utility grid", scene.grid],
              ["Your home", scene.home],
            ].map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd data-tone={/idle|no generation|disconnected/i.test(value) ? "idle" : "active"}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div id={noteId} popover="auto" className={styles.notePopover} role="region" aria-labelledby={`${noteId}-title`}>
        <div className={styles.noteHeading}>
          <h3 id={`${noteId}-title`}>About this diagram</h3>
          <button type="button" popoverTarget={noteId} popoverTargetAction="hide" aria-label="Close diagram information">×</button>
        </div>
        <div className={styles.mobileExplanation}>
          <h4>{scene.title}</h4>
          <p>{scene.text}</p>
        </div>
        <p>The grid feeds the home distribution board directly. Solar and battery power enter through a parallel inverter connection; grid supply does not pass through the inverter in this arrangement.</p>
        <p>During an outage, a compatible backup output and transfer equipment isolate selected essentials from the grid and other home circuits. Parallel connection alone does not provide backup. This is an energy-flow illustration, not an installation wiring diagram.</p>
        <p>Actual supply, backup and savings depend on equipment, settings and available energy.</p>
      </div>
    </div>
  );
}
