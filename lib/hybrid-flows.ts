import paths from "./hybrid-flow-paths.json";
import { HYBRID_SCENES } from "./hybrid-scenes";

type Scene = (typeof HYBRID_SCENES)[number];

// Conceptual parallel AC connection. Backup uses a separate, isolated
// transfer path; a grid-connected inverter alone cannot provide backup.
export function hybridFlows(scene: Scene) {
  const outage = scene.id === "outage";
  const supplying = scene.solarFlow || scene.batteryFlow === "discharge";
  const active: Record<string, boolean> = {
    solar: scene.solarFlow,
    charge: scene.batteryFlow === "charge",
    discharge: scene.batteryFlow === "discharge",
    grid: scene.gridFlow && !outage,
    parallel: supplying && !outage,
    normal: !outage,
    backup: outage && supplying,
    home: true,
  };
  return paths
    .filter((path) => {
      if (path.mode === "backup") return outage;
      if (outage && path.mode === "normal") return false;
      if (path.mode === "charge") return scene.batteryFlow !== "discharge";
      if (path.mode === "discharge") return scene.batteryFlow === "discharge";
      return true;
    })
    .map((path) => ({ ...path, active: active[path.mode] ?? false }));
}
