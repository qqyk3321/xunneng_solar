"use client";

import { useState } from "react";
import styles from "./submission-reference.module.css";

export function SubmissionReference({ id }: { id: string | null }) {
  const [message, setMessage] = useState("");
  return (
    <div className={styles.reference}>
      <p className={styles.label}>Submission ID</p>
      {id ? (
        <>
          <div className={styles.value}>
            <strong>{id}</strong>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(id);
                  setMessage("Submission ID copied.");
                } catch {
                  setMessage("Please select and copy the submission ID above.");
                }
              }}
            >
              Copy
            </button>
          </div>
          <p className={styles.hint}>
            Please include this ID when contacting our team.
          </p>
          <span className={styles.hint} role="status">
            {message}
          </span>
        </>
      ) : (
        <p className={styles.hint}>
          Please check your confirmation email for your submission ID.
        </p>
      )}
    </div>
  );
}
