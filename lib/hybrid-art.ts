import { HYBRID_SCENES } from "./hybrid-scenes";

export const HYBRID_ART = { width: 1174, height: 1339, src: "/images/hybrid-parallel-scene.webp" };
type Scene = (typeof HYBRID_SCENES)[number];
export function hybridWeather(scene: Pick<Scene, "id">, time: number, blend?: { cloud: number; night: number; rain: number }, imageSource = HYBRID_ART.src) {
  const { cloud, night, rain } = blend ?? { cloud: scene.id === "solar-grid" ? 1 : 0, night: ["night", "grid"].includes(scene.id) ? 1 : 0, rain: scene.id === "solar-grid" ? 1 : 0 };
  let svg = `<defs><filter id="hybrid-sky-select"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -3 0 3 0 -.15"/></filter><mask id="hybrid-sky-mask" maskUnits="userSpaceOnUse" x="817" y="0" width="357" height="249" style="mask-type:alpha"><image href="${imageSource}" width="1174" height="1339" filter="url(#hybrid-sky-select)"/></mask><radialGradient id="hybrid-lamplight"><stop stop-color="#ffc86a" stop-opacity=".24"/><stop offset="1" stop-color="#ffc86a" stop-opacity="0"/></radialGradient><filter id="hybrid-cloud-soft"><feGaussianBlur stdDeviation="10"/></filter></defs><rect width="1174" height="1339" fill="#233e54" opacity="${cloud * .28}"/><rect width="1174" height="1339" fill="#071c3b" opacity="${night * .46}"/><g mask="url(#hybrid-sky-mask)"><rect x="817" width="357" height="249" fill="#718392" opacity="${cloud * .94}"/><rect x="817" width="357" height="249" fill="#08233c" opacity="${night * .98}"/></g><ellipse cx="1120" cy="600" rx="180" ry="350" fill="url(#hybrid-lamplight)" opacity="${night}"/>`;
  svg += `<svg x="817" y="17" width="357" height="222" overflow="hidden"><g opacity="${cloud * .5}" fill="#647785" filter="url(#hybrid-cloud-soft)">`;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 130 - time * 12) % 520 + 520) % 520 - 90;
    svg += `<ellipse cx="${x}" cy="${45 + i % 2 * 50}" rx="98" ry="32"/><ellipse cx="${x + 15}" cy="${25 + i % 2 * 50}" rx="65" ry="35"/>`;
  }
  svg += `</g><g opacity="${night}"><path d="M65 26A28 28 0 1 0 82 76A30 30 0 0 1 65 26" fill="#eff5ff"/><circle cx="124" cy="24" r="2" fill="white"/><circle cx="253" cy="52" r="1.7" fill="white"/></g></svg>`;
  for (const [x, y, w, h] of [[817, 17, 357, 222], [0, 330, 140, 600], [0, 0, 625, 210]]) {
    svg += `<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="hidden"><g opacity="${rain * .7}" stroke="#d5e6f4" stroke-width="2">`;
    for (let i = 0; i < 30; i++) {
      const rx = ((i * 73 + time * 20) % (w + 20)) - 10, ry = ((i * 59 + time * 270) % (h + 30)) - 20;
      svg += `<path d="M${rx} ${ry}l-6 20"/>`;
    }
    svg += "</g></svg>";
  }
  return svg;
}

export function hybridBatteryGauge(scene: Pick<Scene, "id" | "batteryFlow">, level?: number) {
  const amount = level ?? (scene.id === "grid" ? .22 : scene.batteryFlow === "charge" ? .7 : .55);
  const height = Math.max(0, Math.min(1, amount)) * 206;
  const color = scene.id === "grid" ? "#ffb321" : "#05c5ba";
  return `<rect x="473" y="1017" width="22" height="214" rx="11" fill="#ffffff" opacity=".85"/><rect x="477" y="1021" width="14" height="206" rx="7" fill="#26474d" opacity=".45"/><rect x="477" y="${1227 - height}" width="14" height="${height}" rx="7" fill="${color}"/>`;
}
