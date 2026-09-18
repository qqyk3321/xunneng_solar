import styles from "./submission-reference.module.css";

export function SubmissionReference({ id }: { id: string | null }) {
  return (
    <div className={styles.reference}>
      <p className={styles.label}>Submission ID</p>
      {id ? (
        <>
          <div className={styles.value}>
            <strong>{id}</strong>
          </div>
        </>
      ) : (
        <p className={styles.hint}>
          Please check your confirmation email for your submission ID.
        </p>
      )}
    </div>
  );
}
