"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Eye, X } from "lucide-react";
import {
  LIST_PATH,
  type SubmissionPreviewData,
} from "@/lib/contact-submissions-preview/model";
import { SubmissionContent } from "./submission-content";
import { DownloadMenu } from "./download-menu";
import styles from "./preview.module.css";

export function ModalPreview({
  id,
  email,
  pageHref,
}: {
  id: string;
  email: string;
  pageHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<SubmissionPreviewData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropDown = useRef(false);
  const titleId = useId();

  useEffect(() => {
    if (!open || !dialog.current) return;
    const modal = dialog.current;
    const opener = trigger.current;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    modal.showModal();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      modal.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    async function load() {
      try {
        const response = await fetch(`${LIST_PATH}/${id}/data`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "Submission not found."
              : "We couldn’t load this preview. Please try again.",
          );
        const data: SubmissionPreviewData = await response.json();
        if (data.submission?.id !== id || !data.imageUrls)
          throw new Error("Unexpected preview response.");
        if (!cancelled) setSaved(data);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error &&
              reason.message === "Submission not found."
              ? reason.message
              : "We couldn’t load this preview. Please try again.",
          );
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, id, attempt]);

  function refresh() {
    setSaved(null);
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }
  return (
    <>
      <button
        ref={trigger}
        className={styles.button}
        type="button"
        aria-haspopup="dialog"
        aria-label={`Quick preview submission from ${email}`}
        onClick={() => {
          setSaved(null);
          setError("");
          setLoading(true);
          setOpen(true);
        }}
      >
        <Eye size={15} aria-hidden="true" />
        Quick preview
      </button>
      {open && (
        <dialog
          ref={dialog}
          className={styles.modal}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          onPointerDown={(event) => {
            backdropDown.current = event.target === event.currentTarget;
          }}
          onClick={(event) => {
            if (backdropDown.current && event.target === event.currentTarget)
              setOpen(false);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              !event.defaultPrevented &&
              !event.currentTarget.querySelector(
                '[role="menu"][data-state="open"]',
              )
            ) {
              event.preventDefault();
              setOpen(false);
              return;
            }
            if (event.key !== "Tab" || event.defaultPrevented) return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], [tabindex="0"]',
              ),
            ).filter((item) => item.getClientRects().length);
            const first = items[0],
              last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
        >
          <div className={styles.modalHeader}>
            <div>
              <p className={styles.eyebrow}>SAVED MESSAGE</p>
              <h2 id={titleId}>Submission preview</h2>
            </div>
            <button
              ref={closeButton}
              type="button"
              className={styles.button}
              aria-label="Close preview"
              onClick={() => setOpen(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.modalBody} aria-busy={loading}>
            {loading ? (
              <p role="status">Loading saved message…</p>
            ) : error ? (
              <div role="alert">
                <h3>{error}</h3>
                <p>Your saved submission has not been changed.</p>
              </div>
            ) : saved ? (
              <SubmissionContent saved={saved} />
            ) : null}
          </div>
          <div className={styles.modalFooter}>
            <DownloadMenu id={id} />
            <button
              type="button"
              className={styles.button}
              disabled={loading}
              onClick={refresh}
            >
              {error ? "Try again" : "Refresh preview"}
            </button>
            <a
              className={styles.button}
              href={pageHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab ↗
            </a>
          </div>
        </dialog>
      )}
    </>
  );
}
