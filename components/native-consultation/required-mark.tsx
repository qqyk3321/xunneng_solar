import styles from "./form.module.css";

export function RequiredMark() {
  return <span className={styles.required} aria-hidden="true">{"\u00a0*"}</span>;
}
