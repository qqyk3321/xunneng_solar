import styles from "./tide-edge.module.css";

export function TideEdge({ position = "bottom", color = "#edf2ef" }: { position?: "top" | "bottom"; color?: string }) {
  return <svg className={styles.edge} data-position={position} viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path fill={color} d="M0 16C240 46 410 2 720 18S1210 47 1440 10V40H0Z" />
  </svg>;
}
