import Image from "next/image";
import type { CSSProperties } from "react";
import { SOLAR_PACKAGES as PACKAGES } from "@/lib/solar-packages";
import styles from "./solar-packages.module.css";

export function SolarEquipmentScene({ plan }: { plan: typeof PACKAGES[number] }) {
  const modulesPerGroup = plan.panels === 8 ? 4 : 6;
  const panelGroups = plan.panels / modulesPerGroup;
  const batteryModules = plan.battery / 5;
  const panelSpacing = {
    "--panel-step": `${13 / (panelGroups - 1)}%`,
    "--panel-rise": `${5 / (panelGroups - 1)}%`,
  } as CSSProperties;

  return (
    <div className={styles["equipment-scene"]} style={panelSpacing} role="img" aria-label={`${plan.name} equipment illustration: ${plan.panels} solar panels clustered on the left, inverter and ${batteryModules} battery ${batteryModules === 1 ? "module" : "modules"} on one thin base behind central tablet and phone control dashboards`}>
      {Array.from({ length: panelGroups }, (_, group) => (
        <div key={group} className={styles["panel-group"]} data-panel-group data-panel-count={modulesPerGroup} style={{ "--panel-group": group } as CSSProperties}>
          <Image src={`/images/packages/panel-group-${modulesPerGroup === 4 ? "four" : "six"}-v3.webp`} alt="" width={1536} height={1024} sizes="160px" quality={90} draggable={false} />
        </div>
      ))}
      <div className={styles["equipment-inverter"]} data-equipment-device="inverter">
        <Image src="/images/packages/equipment-common-v3.webp" alt="" width={1536} height={1024} sizes="640px" quality={90} draggable={false} />
      </div>
      <div className={styles["battery-stack"]} data-battery-stack>
        {Array.from({ length: batteryModules }, (_, module) => (
          <div key={module} className={styles["battery-module"]} data-battery-module>
            <Image src="/images/packages/battery-module-v3.webp" alt="" width={1760} height={880} sizes="140px" quality={90} draggable={false} />
          </div>
        ))}
        <div className={styles["battery-base"]} data-battery-base />
      </div>
      <div className={styles["equipment-controls"]} data-equipment-device="controls">
        <Image src="/images/packages/equipment-common-v3.webp" alt="" width={1536} height={1024} sizes="640px" quality={90} draggable={false} />
      </div>
    </div>
  );
}

