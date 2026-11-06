"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { HYBRID_DISPLAY_SCENES, HYBRID_FAQ_SCENE_IDS, hybridSceneIndex } from "@/lib/hybrid-scenes";
import { hybridFlows } from "@/lib/hybrid-flows";
import { HYBRID_ART, hybridWeather, hybridBatteryGauge } from "@/lib/hybrid-art";
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
  const scene = HYBRID_DISPLAY_SCENES[index];
  const running = motion && visible && pageVisible;
  useEffect(() => {
    const sync = () => {
      const selected = hybridSceneIndex(window.location.hash);
      if (selected >= 0) {
        setIndex(selected);
        root.current?.scrollIntoView({ block: "start" });
      } else if (HYBRID_FAQ_SCENE_IDS.some(sceneId => window.location.hash === `#scene-${sceneId}`)) {
        const question = document.getElementById(window.location.hash.slice(1));
        if (question instanceof HTMLDetailsElement) {
          question.open = true;
          question.scrollIntoView({ block: "start" });
        }
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
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!running || scene.id !== "solar-grid") return;
    const timer = window.setInterval(() => setClock(t => t + .1), 100);
    return () => window.clearInterval(timer);
  }, [running, scene.id]);
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
        {HYBRID_DISPLAY_SCENES.map((item, i) => (
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
            aria-label={`${scene.label}: ${scene.text} The grid and parallel inverter branch meet at the AC junction box, then feed the household distribution board. The battery connects directly to the inverter. Illustrative arrangement only.`}
          >
            <Image
              src={HYBRID_ART.src}
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 720px"
              className={styles.photo}
            />
            <svg
              className={styles.wires}
              viewBox={`0 0 ${HYBRID_ART.width} ${HYBRID_ART.height}`}
              aria-hidden="true"
            >
              <g dangerouslySetInnerHTML={{ __html: hybridWeather(scene, clock) }} />
              <g dangerouslySetInnerHTML={{ __html: hybridBatteryGauge(scene) }} />
              {hybridFlows(scene).map((flow) => (
                <Flow key={flow.id} d={flow.d} active={flow.active} ac={flow.ac} running={running} />
              ))}
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
        <p>The grid and inverter meet at the AC junction box, which feeds the household distribution board. Solar and battery power enter through the parallel inverter branch; grid supply does not pass through the inverter in this arrangement.</p>
        <p>During an outage, a compatible backup output and transfer equipment isolate selected essentials from the grid and other home circuits. Parallel connection alone does not provide backup. This is an energy-flow illustration, not an installation wiring diagram.</p>
        <p>Actual supply, backup and savings depend on equipment, settings and available energy.</p>
      </div>
    </div>
  );
}
