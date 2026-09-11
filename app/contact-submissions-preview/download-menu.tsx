"use client";

import { useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Download } from "lucide-react";
import { LIST_PATH } from "@/lib/contact-submissions-preview/model";
import styles from "./preview.module.css";

export function DownloadMenu({ id }: { id: string }) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  async function download(format: "json" | "text") {
    if (controller.current) return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => active.abort(), 65_000);
    try {
      const response = await fetch(
        `${LIST_PATH}/${id}/download?format=${format}`,
        { cache: "no-store", signal: active.signal },
      );
      if (!response.ok) throw new Error("Download failed");
      const mime = format === "json" ? "application/json" : "text/plain";
      if (!response.headers.get("content-type")?.startsWith(mime))
        throw new Error("Unexpected file type");
      const blob = await response.blob();
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contact-${id}.${format === "json" ? "json" : "txt"}`;
      (trigger?.closest("dialog") ?? document.body).append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (mounted.current)
        setError(
          "Download unavailable. Please try again. If photo links are unavailable, choose Original JSON.",
        );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <div className={styles.downloadControl}>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            ref={setTrigger}
            className={styles.button}
            disabled={busy}
            aria-label={busy ? "Preparing download" : "Download submission"}
          >
            <Download size={15} aria-hidden="true" />
            {busy ? "Preparing…" : "Download"}
            <ChevronDown size={13} aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={trigger?.closest("dialog")}>
          <DropdownMenu.Content
            className={styles.downloadMenu}
            align="end"
            sideOffset={6}
            aria-label="Download options"
            aria-labelledby={undefined}
          >
            <DropdownMenu.Item
              className={styles.downloadItem}
              onSelect={() => {
                void download("json");
              }}
            >
              Original JSON (.json)
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={styles.downloadItem}
              onSelect={() => {
                void download("text");
              }}
            >
              Text &amp; image links (.txt)
            </DropdownMenu.Item>
            <div className={styles.downloadHint}>
              Line breaks are preserved. Image links last about one hour.
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {busy && (
        <span className={styles.srOnly} role="status">
          Preparing download…
        </span>
      )}
      {error && (
        <p className={styles.downloadError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
