"use client";

import { ISLAND_COVERAGE } from "@/data/island-coverage";
import { UPCOMING_ISLANDS } from "@/lib/upcoming-islands";
import styles from "./island-coverage-map.module.css";

type PlannedIsland = keyof typeof UPCOMING_ISLANDS;

export function IslandCoverageMap({
  onWishlist,
}: {
  onWishlist: (code: PlannedIsland) => void;
}) {
  return (
    <div className={styles.coverage} data-island-coverage>
      <svg className={styles.map} viewBox="0 0 1280 820" role="group" aria-label="Choose a Caribbean island or territory">
        <image href="/images/caribbean/island-coverage-relief.svg" width="1280" height="820" aria-hidden="true" />
        <g className={styles.oceanLabels} aria-hidden="true">
          <text x="646" y="245">North Atlantic Ocean</text>
          <text x="455" y="651">Caribbean Sea</text>
        </g>
        {ISLAND_COVERAGE.map((island) => {
          const { code, name, shape, point: [x, y], label: [lx, ly, anchor] } = island;
          if (code === "AG" || code === "DM") {
            const antigua = code === "AG";
            return (
              <a key={code} href={antigua ? "/antigua" : "/dominica"} className={styles.serving} data-island={code} aria-label={`Explore ${name}`}>
                <path className={styles.islandShape} d={shape} />
                <path className={styles.servingLine} d={`M${x},${y} L${lx - 14},${ly + 28} H${lx}`} aria-hidden="true" />
                <rect className={styles.destinationCard} x={lx} y={ly} width={antigua ? 178 : 158} height={antigua ? 68 : 55} rx={10} />
                <image href={`/flags/${code.toLowerCase()}.svg`} x={lx + 10} y={ly + 14} width={26} height={20} aria-hidden="true" />
                <text className={styles.destinationName} x={lx + 45} y={ly + 28}>
                  <tspan x={lx + 45}>{antigua ? "Antigua &" : "Dominica"}</tspan>
                  {antigua && <tspan x={lx + 45} dy={23}>Barbuda</tspan>}
                </text>
              </a>
            );
          }
          const endX = lx + (anchor === "start" ? -10 : anchor === "end" ? 10 : 0);
          const endY = ly - (anchor === "middle" ? 13 : 0);
          return (
            <g
              key={code}
              className={styles.planned}
              data-island={code}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-label={`Get launch updates for ${UPCOMING_ISLANDS[code]}`}
              onClick={(event) => {
                event.currentTarget.focus({ preventScroll: true });
                onWishlist(code);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onWishlist(code);
                }
              }}
            >
              <title>Join the wishlist for {UPCOMING_ISLANDS[code]}</title>
              <path className={styles.islandShape} d={shape} />
              <path className={styles.labelLine} d={`M${x},${y} L${endX},${endY}`} aria-hidden="true" />
              <text className={styles.placeName} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle">{name}</text>
            </g>
          );
        })}
      </svg>
      <p className={styles.attribution}>
        Map: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>
        {" · "}Coordinates: <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>
      </p>
    </div>
  );
}
