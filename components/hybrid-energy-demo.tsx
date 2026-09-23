"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { HYBRID_SCENES } from "@/lib/hybrid-scenes";
import styles from "./hybrid-energy-demo.module.css";

function Flow({
  d,
  active,
  reverse = false,
  ac = false,
  running,
}: {
  d: string;
  active: boolean;
  reverse?: boolean;
  ac?: boolean;
  running: boolean;
}) {
  const id = useId();
  return (
    <g
      className={styles.flow}
      data-active={active}
      data-ac={ac}
      data-reverse={reverse}
    >
      <path id={id} d={d} className={styles.track} />
      {active && (
        <>
          <path d={d} className={styles.halo} />
          <path d={d} className={styles.cable} />
          <path d={d} className={styles.stream} />
          <text className={styles.direction} dy="5">
            <textPath href={`#${id}`} startOffset="55%" textAnchor="middle">
              {reverse ? "◀" : "▶"}
            </textPath>
          </text>
          {running &&
            [0, 1, 2].map((i) => (
              <g key={i} className={styles.particle}>
                <circle r="3.5" />
                <animateMotion
                  path={d}
                  dur="3s"
                  begin={`${-i}s`}
                  repeatCount="indefinite"
                  keyPoints={reverse ? "1;0" : "0;1"}
                  keyTimes="0;1"
                  calcMode="linear"
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
  const [selection, setSelection] = useState(0);
  const [motion, setMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const scene = HYBRID_SCENES[index];
  const running = motion && visible && pageVisible;
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
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(
      () => setIndex((value) => (value + 1) % HYBRID_SCENES.length),
      9000,
    );
    return () => clearTimeout(timer);
  }, [running, index, selection]);
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
              setSelection((value) => value + 1);
            }}
          >
            <span>0{i + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.presentation}>
        <div className={styles.console}>
          <div
            className={styles.stage}
            role="img"
            aria-label={`${scene.label}: ${scene.text} Equipment includes protective breakers, isolators and a CT sensor. Illustrative arrangement only.`}
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
              <Flow
                d="M290 145V335"
                active={scene.solarFlow}
                running={running}
              />
              <Flow
                d="M290 451V605Q290 620 305 620H360"
                active={scene.solarFlow}
                running={running}
              />
              <Flow
                d="M498 758V855"
                active={scene.batteryFlow !== "idle"}
                reverse={scene.batteryFlow === "discharge"}
                running={running}
              />
              <Flow
                d="M1000 234V275Q1000 292 983 292H879Q861 292 861 310V378"
                active={scene.gridFlow}
                ac
                running={running}
              />
              <Flow
                d="M870 498V517"
                active={scene.gridFlow}
                ac
                running={running}
              />
              <Flow
                d="M792 570H615"
                active={scene.gridFlow}
                ac
                running={running}
              />
              <Flow
                d="M615 605H725Q740 605 740 620V654Q740 670 756 670H825Q840 670 840 685"
                active
                ac
                running={running}
              />
              <Flow
                d="M840 806V935Q840 953 858 953H918"
                active
                ac
                running={running}
              />
              <Flow d="M840 824H928" active={!outage} ac running={running} />
              <Flow
                d="M840 897H715Q699 897 699 913V1090Q699 1105 715 1105H736"
                active={!outage}
                ac
                running={running}
              />
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
          </div>
        </div>
        <div className={styles.description} id={id} aria-live="off">
          <div className={styles.sceneNumber}>
            <span>ENERGY IN MOTION</span>
            <span>0{index + 1} / 04</span>
          </div>
          <div className={styles.progress} aria-hidden="true">
            <i key={`${index}-${selection}-${running}`} />
          </div>
          <h2>{scene.title}</h2>
          <p>{scene.text}</p>
          <dl className={styles.status}>
            {[
              ["Solar panels", scene.solar],
              ["Battery", scene.battery],
              ["Utility grid", scene.grid],
              ["Your home", scene.home],
            ].map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.note}>
            Follow the moving light to see where the energy goes. Choose a scene
            to explore another moment.
          </div>
        </div>
      </div>
      <p className={styles.disclaimer}>
        Illustrative equipment and energy flow, not a wiring diagram or live
        monitoring. Actual equipment and protective arrangements vary. Backup
        supports selected circuits; available power and runtime depend on system
        capacity, sunlight, battery charge and connected loads. Export
        permissions and settings are assessed separately. Bill savings depend on
        solar generation, energy use, system settings and your electricity tariff.
      </p>
    </div>
  );
}
