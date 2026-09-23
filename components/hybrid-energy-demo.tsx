"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HYBRID_SCENES } from "@/lib/hybrid-scenes";
import styles from "./hybrid-energy-demo.module.css";

function Equipment({
  kind,
}: {
  kind: "solar" | "battery" | "inverter" | "grid" | "home";
}) {
  return (
    <svg viewBox="0 0 180 108" className={styles.equipment} aria-hidden="true">
      {kind === "solar" && (
        <>
          <circle cx="146" cy="24" r="16" fill="#ffd166" />
          <path
            d="M29 92H153M57 73L50 92M131 73L137 92"
            stroke="#9bbac8"
            strokeWidth="5"
          />
          <path
            d="M38 21H139L159 77H18Z"
            fill="#113955"
            stroke="#b8def1"
            strokeWidth="3"
          />
          <path
            d="M33 39H145M26 58H152M63 22L54 77M89 22V77M115 22L126 77"
            stroke="#4da5dd"
            strokeWidth="2"
          />
        </>
      )}
      {kind === "inverter" && (
        <>
          <path
            d="M55 91V106M75 91V106M105 91V106M125 91V106"
            stroke="#71aabd"
            strokeWidth="5"
          />
          <rect x="43" y="7" width="94" height="87" rx="12" fill="#e6eded" />
          <path d="M43 24H137" stroke="#ccdada" strokeWidth="2" />
          <rect x="65" y="36" width="50" height="25" rx="4" fill="#163b41" />
          <path
            d="M72 49H79L83 41L90 57L96 46H107"
            stroke="#77e0b5"
            strokeWidth="2"
            fill="none"
          />
          <circle cx="90" cy="77" r="3" fill="#00a688" />
          <path
            d="M52 70V82M58 70V82M122 70V82M128 70V82"
            stroke="#b4c9ca"
            strokeWidth="2"
          />
        </>
      )}
      {kind === "battery" && (
        <>
          {[8, 38, 68].map((y) => (
            <g key={y}>
              <rect
                x="39"
                y={y}
                width="102"
                height="27"
                rx="5"
                fill="#e0eceb"
              />
              <rect
                x="51"
                y={y + 8}
                width="22"
                height="10"
                rx="2"
                fill="#235359"
              />
              <path
                d={`M82 ${y + 13}H123`}
                stroke="#78c7ac"
                strokeWidth="4"
                strokeDasharray="6 3"
              />
            </g>
          ))}
          <path d="M49 96V102M130 96V102" stroke="#a8bfbc" strokeWidth="5" />
        </>
      )}
      {kind === "grid" && (
        <g fill="none" stroke="#b2c5cf" strokeWidth="3" strokeLinejoin="round">
          <path d="M89 8L57 102M91 8L123 102M77 43H103M69 65H111M62 88H119M78 43L111 65L62 88M102 43L69 65L119 88M87 12L60 29H120L93 12M80 36L43 51H138L99 36" />
          <path
            d="M43 51H8M138 51H172M60 29H22M120 29H160"
            stroke="#6f9caf"
            strokeWidth="2"
          />
        </g>
      )}
      {kind === "home" && (
        <>
          <path d="M27 50L89 10L154 50V98H27Z" fill="#e3e8db" />
          <path
            d="M15 52L87 6L164 52"
            fill="none"
            stroke="#708b89"
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <path
            d="M36 38L74 14H102L136 36Z"
            fill="#244f67"
            stroke="#7ca5bb"
            strokeWidth="2"
          />
          <rect x="43" y="59" width="28" height="22" rx="2" fill="#ffda85" />
          <rect x="111" y="59" width="28" height="22" rx="2" fill="#ffda85" />
          <rect x="82" y="60" width="20" height="38" rx="2" fill="#a4beb0" />
          <path d="M18 101H162" stroke="#6eac93" strokeWidth="5" />
        </>
      )}
    </svg>
  );
}

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
  const pathId = useId();
  return (
    <g
      className={styles.flow}
      data-active={active}
      data-ac={ac}
      data-reverse={reverse}
    >
      <path id={pathId} d={d} className={styles.track} />
      {active && (
        <>
          <path d={d} className={styles.halo} />
          <path d={d} className={styles.stream} />
          <text className={styles.direction} dy="5">
            <textPath href={`#${pathId}`} startOffset="55%" textAnchor="middle">
              {reverse ? "◀" : "▶"}
            </textPath>
          </text>
          {running &&
            [0, 1, 2].map((index) => (
              <g key={index} className={styles.particle}>
                <circle r="4" />
                <animateMotion
                  path={d}
                  dur="3s"
                  begin={`${-index}s`}
                  repeatCount="indefinite"
                  keyPoints={reverse ? "1;0" : "0;1"}
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
  const [playing, setPlaying] = useState(true);
  const [motion, setMotion] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const scene = HYBRID_SCENES[index];
  const running = playing && motion && visible && pageVisible;
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
      { threshold: 0.2 },
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
  }, [running, index]);
  const paths = {
    desktop: [
      "M150 145V285H500",
      "M500 285V480H180",
      "M850 145H650V230H500V285",
      "M500 285H820V480",
    ],
    mobile: [
      "M250 180V460H500",
      "M500 460V800H250",
      "M750 180V300H500V460",
      "M500 460H750V800",
    ],
  };
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
              setPlaying(false);
            }}
          >
            <span>0{i + 1}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.console}>
        <div className={styles.consoleBar}>
          <span>
            <i /> HYBRID ENERGY FLOW
          </span>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={playing}
          >
            {playing ? "Pause demo" : "Play demo"}
          </button>
        </div>
        <div
          className={styles.stage}
          role="img"
          aria-label={`${scene.label}: ${scene.text}`}
        >
          <span className={styles.sun} aria-hidden="true" />
          {Object.entries(paths).map(
            ([layout, [solar, battery, grid, home]]) => (
              <svg
                key={layout}
                className={
                  layout === "desktop"
                    ? styles.desktopWires
                    : styles.mobileWires
                }
                viewBox={
                  layout === "desktop" ? "0 0 1000 620" : "0 0 1000 1000"
                }
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <Flow d={solar} active={scene.solarFlow} running={running} />
                <Flow
                  d={battery}
                  active={scene.batteryFlow !== "idle"}
                  reverse={scene.batteryFlow === "discharge"}
                  running={running}
                />
                <Flow d={grid} active={scene.gridFlow} ac running={running} />
                <Flow d={home} active ac running={running} />
                {scene.id === "outage" && (
                  <g
                    aria-hidden="true"
                    transform={
                      layout === "desktop"
                        ? "translate(650 185)"
                        : "translate(650 300) rotate(90)"
                    }
                  >
                    <path d="M0 -22V22" stroke="#102f3a" strokeWidth="14" />
                    <circle cy="-22" r="4" fill="#ff98a7" />
                    <circle cy="22" r="4" fill="#ff98a7" />
                    <path
                      d="M0 22L-22 -15"
                      stroke="#ff98a7"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </svg>
            ),
          )}
          <div
            className={`${styles.device} ${styles.solar}`}
            data-idle={!scene.solarFlow}
          >
            <Equipment kind="solar" />
            <strong>Solar panels</strong>
            <small>{scene.solar}</small>
          </div>
          <div className={`${styles.device} ${styles.inverter}`}>
            <Equipment kind="inverter" />
            <strong>Hybrid inverter</strong>
            <small>
              {scene.id === "outage"
                ? "Backup output active"
                : "Managing your energy"}
            </small>
          </div>
          <div
            className={`${styles.device} ${styles.grid}`}
            data-idle={!scene.gridFlow}
            data-disconnected={scene.id === "outage"}
          >
            <Equipment kind="grid" />
            <strong>Utility grid</strong>
            <small>{scene.grid}</small>
          </div>
          <div
            className={`${styles.device} ${styles.battery}`}
            data-idle={scene.batteryFlow === "idle"}
          >
            <Equipment kind="battery" />
            <strong>LiFePO4 battery</strong>
            <small>{scene.battery}</small>
          </div>
          <div className={`${styles.device} ${styles.home}`}>
            <Equipment kind="home" />
            <strong>Your home</strong>
            <small>{scene.home}</small>
          </div>
          {scene.id === "outage" && (
            <span className={styles.isolation}>Grid isolated · no export</span>
          )}
        </div>
        <div className={styles.legend}>
          <span>
            <i /> DC · solar & battery
          </span>
          <span>
            <i /> AC · grid & home
          </span>
          <span>Moving light = energy direction</span>
        </div>
      </div>
      <div
        className={styles.description}
        id={id}
        aria-live={playing ? "off" : "polite"}
      >
        <span className={styles.sceneNumber}>0{index + 1} / 04</span>
        <div>
          <h2>{scene.title}</h2>
          <p>{scene.text}</p>
        </div>
      </div>
      <p className={styles.disclaimer}>
        Illustrative energy flow, not live monitoring or a wiring diagram.
        Backup needs compatible equipment and a suitable installation. Available
        power and runtime depend on sunlight, battery charge, system capacity
        and the loads connected. Export permissions and settings are assessed
        separately.
      </p>
    </div>
  );
}
