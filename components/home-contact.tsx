"use client";

/* eslint-disable @next/next/no-img-element -- Local compressed photo thumbnails. */
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { FloatingQuestionButton } from "./floating-question-button";
import { ScrollQuestionButton } from "./scroll-question-button";
import {
  Check,
  ArrowUpRight,
  ImagePlus,
  LoaderCircle,
  Mail,
  X,
} from "lucide-react";
import type { InquiryEditorHandle } from "./inquiry-rich-editor";
import {
  compressInquiryImage,
  type InquiryImage,
} from "@/lib/anonymous-inquiry/compress";
import {
  MAX_IMAGES,
  MAX_TEXT,
  UUID_PATTERN,
  validEmail,
  type InquiryReceipt,
} from "@/lib/anonymous-inquiry/config";
import {
  EMPTY_DOCUMENT,
  richImageIds,
  richTextPlainText,
  textDocument,
  validateRichDocument,
  type RichDocument,
} from "@/lib/anonymous-inquiry/rich-text";
import styles from "./home-contact.module.css";
import { SupportEmail } from "./support-email";
import { useSiteRegion } from "./site-region";
import { regionPath } from "@/lib/site-region-routing";
import { RegionLinks } from "./region-links";

// Tiptap is sizeable and is only needed after the user opens the photo/rich
// editor. Keeping it behind React.lazy removes it from the homepage entry JS.
const InquiryRichEditor = lazy(async () => {
  const editorModule = await import("./inquiry-rich-editor");
  return { default: editorModule.InquiryRichEditor };
});

type Photo = InquiryImage & { id: string };
function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function photoError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("10 MB"))
    return "Please choose photos smaller than 10 MB each.";
  if (/JPEG|GIF|HEIC/.test(message))
    return "Please use JPG, PNG or WebP photos. GIF, HEIC and video are not supported.";
  if (message.includes("150 KB"))
    return "This photo is still too large after compression. Please crop to the important area and try again.";
  if (message.includes("12000"))
    return "This photo is too large to process. Please use an image under 25 megapixels and 12,000 pixels per side.";
  return "We couldn't process this photo. Please try a different image or browser.";
}

export function HomeContact({
  initialEmail = "",
  variant = "contact",
}: {
  initialEmail?: string;
  variant?: "contact" | "question" | "floating";
}) {
  const { country } = useSiteRegion();
  const isQuestion = variant === "question";
  const floating = variant === "floating";
  const [email, setEmail] = useState(initialEmail);
  const [text, setText] = useState("");
  const [rich, setRich] = useState(false);
  const [content, setContent] = useState<RichDocument>(EMPTY_DOCUMENT);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [privacyError, setPrivacyError] = useState(false);
  const [invalid, setInvalid] = useState<"email" | "message" | null>(null);
  const [receipt, setReceipt] = useState<
    (InquiryReceipt & { email: string }) | null
  >(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const success = useRef<HTMLHeadingElement>(null);
  const modalSuccess = useRef<HTMLHeadingElement>(null);
  const plainEmail = useRef<HTMLInputElement>(null);
  const modalEmail = useRef<HTMLInputElement>(null);
  const plainMessage = useRef<HTMLTextAreaElement>(null);
  const plainPrivacy = useRef<HTMLInputElement>(null);
  const modalPrivacy = useRef<HTMLInputElement>(null);
  const editor = useRef<InquiryEditorHandle>(null);
  const files = useRef<HTMLInputElement>(null);
  const retainedPhotos = useRef<Photo[]>([]);
  const alive = useRef(false);
  const locked = useRef(false);
  const requestId = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const activeIds = richImageIds(content);
  const activePhotos = activeIds.flatMap((id) =>
    photos.filter((photo) => photo.id === id),
  );
  const message = rich ? richTextPlainText(content) : text;
  const busy = processing || sending;
  const cannotSend = !country || !ready || busy || (rich && !editorReady);

  useEffect(() => {
    alive.current = true;
    setReady(true);
    return () => {
      alive.current = false;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      abort.current?.abort();
      retainedPhotos.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    };
  }, []);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const opener = openButton.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    dialogTitle.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (receipt) (open ? modalSuccess : success).current?.focus();
  }, [receipt, open]);

  function edited() {
    requestId.current = null;
    setError("");
    setInvalid(null);
  }
  function updatePhotos(next: Photo[]) {
    retainedPhotos.current = next;
    setPhotos(next);
  }
  function openPhotos() {
    if (busy) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    if (!rich) {
      setContent(textDocument(text));
      setRich(true);
      setEditorReady(false);
      edited();
    }
    setOpen(true);
  }
  function closeDialog(afterClose?: () => void) {
    if (busy || closing) return;
    if (
      !floating ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setOpen(false);
      afterClose?.();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      afterClose?.();
      closeTimer.current = null;
    }, 200);
  }
  function reset() {
    if (busy) return;
    setPrivacyAccepted(false);
    setPrivacyError(false);
    setOpen(false);
    retainedPhotos.current.forEach((photo) => URL.revokeObjectURL(photo.url));
    updatePhotos([]);
    setRich(false);
    setText("");
    setContent(EMPTY_DOCUMENT);
    setEditorReady(false);
    setReceipt(null);
    edited();
  }
  async function addPhotos(selected: File[]) {
    if (!selected.length || locked.current || !editorReady) return;
    if (activeIds.length + selected.length > MAX_IMAGES) {
      setError("You can add up to 3 photos. Please remove a photo first.");
      return;
    }
    if (retainedPhotos.current.length + selected.length > 10) {
      setError(
        "This draft has processed many photos. Please keep your text and refresh before adding more.",
      );
      return;
    }
    locked.current = true;
    setProcessing(true);
    setError("");
    const added: Photo[] = [];
    try {
      for (const file of selected) {
        added.push({ ...(await compressInquiryImage(file)), id: newId() });
        if (!alive.current) throw new Error("Page left");
      }
      updatePhotos([...retainedPhotos.current, ...added]);
      editor.current?.insertImages(added.map((photo) => photo.id));
      edited();
    } catch (error) {
      added.forEach((photo) => URL.revokeObjectURL(photo.url));
      if (alive.current) setError(photoError(error));
    } finally {
      locked.current = false;
      if (alive.current) setProcessing(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || cannotSend || receipt) return;
    if (!country) return;
    setError("");
    setInvalid(null);
    if (!privacyAccepted) {
      setPrivacyError(true);
      (open ? modalPrivacy : plainPrivacy).current?.focus();
      return;
    }
    if (!validEmail(email.trim())) {
      setError("Please enter a valid email address, such as name@example.com.");
      setInvalid("email");
      (open ? modalEmail : plainEmail).current?.focus();
      return;
    }
    if (
      message.trim().length < 5 ||
      message.trim().length > MAX_TEXT ||
      message.includes("\0")
    ) {
      setError("Please enter a message between 5 and 5,000 characters.");
      setInvalid("message");
      if (rich) {
        setOpen(true);
        editor.current?.focus();
      } else plainMessage.current?.focus();
      return;
    }
    let validated;
    try {
      validated = validateRichDocument(rich ? content : textDocument(text));
    } catch {
      setError(
        "We couldn't read part of your message. Please simplify the formatting and try again.",
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    const submittedEmail = email.trim();
    form.set("email", submittedEmail);
    form.set("content", JSON.stringify(validated.document));
    form.set("format", rich ? "rich" : "plain");
    form.set("country_code", country);
    if (!requestId.current) requestId.current = newId();
    form.set("requestId", requestId.current);
    for (const id of validated.imageIds) {
      const photo = retainedPhotos.current.find((photo) => photo.id === id);
      if (!photo) {
        setError(
          "A photo is no longer available. Please remove it and add it again.",
        );
        return;
      }
      form.append("images", photo.file);
    }
    locked.current = true;
    setSending(true);
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          typeof result?.error === "string" &&
            !/[\u3400-\u9fff]/.test(result.error)
            ? result.error
            : "We couldn't send your message. Please try again.",
        );
      if (
        !UUID_PATTERN.test(result?.reference ?? "") ||
        !Number.isFinite(Date.parse(result?.receivedAt))
      )
        throw new Error(
          "We couldn't confirm your submission. Your draft is still here; please try again.",
        );
      if (alive.current) setReceipt({ ...result, email: submittedEmail });
    } catch (error) {
      if (alive.current)
        setError(
          controller.signal.aborted
            ? "This is taking longer than expected. Your draft is still here; retrying the same message won't create a duplicate."
            : error instanceof Error && error.name !== "TypeError"
              ? error.message
              : "We couldn't send your message. Please check your connection and try again.",
        );
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      if (alive.current) setSending(false);
    }
  }
  function emailField(modal: boolean) {
    const id = modal ? "contact-modal-email" : "contact-email";
    return (
      <div className={styles.field}>
        <label htmlFor={id}>
          Email address <span>*</span>
        </label>
        <input
          ref={modal ? modalEmail : plainEmail}
          id={id}
          type="email"
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          placeholder="you@example.com"
          value={email}
          aria-invalid={invalid === "email"}
          aria-describedby={
            invalid === "email"
              ? modal
                ? "contact-modal-error"
                : "contact-error"
              : undefined
          }
          onChange={(event) => {
            setEmail(event.target.value);
            edited();
          }}
        />
      </div>
    );
  }
  function trap(modal: boolean) {
    return (
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor={modal ? "contact-modal-website" : "contact-website"}>
          Website (leave empty)
        </label>
        <input
          id={modal ? "contact-modal-website" : "contact-website"}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
    );
  }
  function privacyChoice(modal: boolean) {
    const id = modal ? "contact-modal-privacy" : "contact-privacy";
    return (
      <div className={styles.privacy}>
        <label className={styles.privacyChoice} htmlFor={id}>
          <input
            id={id}
            ref={modal ? modalPrivacy : plainPrivacy}
            type="checkbox"
            required
            checked={privacyAccepted}
            disabled={!country || busy || !ready}
            aria-invalid={privacyError || undefined}
            aria-describedby={privacyError ? `${id}-error` : undefined}
            onChange={(event) => {
              setPrivacyAccepted(event.target.checked);
              setPrivacyError(false);
            }}
          />
          <span>
            I have read the{" "}
            <Link
              href={regionPath(country, "/privacy")}
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy policy
            </Link>{" "}
            and agree to be contacted about my enquiry.
          </span>
        </label>
        {privacyError && (
          <p id={`${id}-error`} role="alert" className={styles.privacyError}>
            Please tick the privacy checkbox before sending your message.
          </p>
        )}
      </div>
    );
  }
  function sendButton() {
    return (
      <button type="submit" className={styles.primary} disabled={cannotSend}>
        {sending ? (
          <LoaderCircle size={18} className={styles.spin} />
        ) : (
          <ArrowUpRight size={18} />
        )}
        {sending ? "Sending…" : "Send message"}
      </button>
    );
  }
  function successMessage(modal: boolean) {
    return (
      <div className={styles.success} role="status">
        <span className={styles.check}>
          <Check size={32} />
        </span>
        <h3 ref={modal ? modalSuccess : success} tabIndex={-1}>
          We’ve received your request.
        </h3>
        <p>
          Thank you for reaching out. We’ll reply to your email as soon as
          possible, within <strong>48 hours</strong>.
        </p>
        <p className={styles.email}>{receipt?.email}</p>
        <p className={styles.hint}>Please check your inbox and spam folder.</p>
        <button
          type="button"
          className={modal ? styles.primary : styles.secondary}
          onClick={
            modal
              ? () => {
                  closeDialog(floating ? reset : undefined);
                }
              : reset
          }
        >
          {modal ? "Done" : "Send another message"}
        </button>
      </div>
    );
  }
  return (
    <section
      id={floating ? undefined : isQuestion ? "ask-question" : "contact-us"}
      className={`${styles.section} ${floating ? styles.floating : ""}`}
      aria-labelledby={floating ? undefined : "contact-heading"}
      aria-label={floating ? "Ask our team a question" : undefined}
      tabIndex={-1}
    >
      {floating ? (
        <FloatingQuestionButton
          onOpen={openPhotos}
          disabled={!country || !ready || busy}
        />
      ) : (
        <div className={styles.layout}>
          <div className={styles.intro}>
            {isQuestion && (
              <span className={styles.eyebrow}>WE’RE HERE TO HELP</span>
            )}
            <h2 id="contact-heading">
              {isQuestion ? "Ask a question" : "Contact us"}
              {isQuestion ? (
                <span>Still have a question?</span>
              ) : (
                <span>
                  Let’s talk about
                  <br />
                  your next step.
                </span>
              )}
            </h2>
            <p>
              {isQuestion
                ? "Can’t find the answer you need? Send us your question. You can add photos to help explain it."
                : "Have a question about solar, storage, or your property? Leave us a message. A photo can help us understand the details."}
            </p>
            <div className={styles.promise}>
              <Mail size={21} />
              <div>
                <strong>A real reply, by email.</strong>
                <span>We’ll get back to you within 48 hours.</span>
              </div>
            </div>
            <SupportEmail />
          </div>
          <div className={styles.card}>
            {!country && (
              <div>
                <p>
                  Choose your installation location before writing your message.
                </p>
                <RegionLinks
                  suffix={isQuestion ? "/faq#ask-question" : "#contact-us"}
                />
              </div>
            )}
            {receipt ? (
              successMessage(false)
            ) : (
              <form
                onSubmit={submit}
                noValidate
                aria-label={isQuestion ? "Ask a question" : "Contact us"}
                aria-busy={busy}
              >
                <fieldset
                  disabled={!country || busy || !ready}
                  className={styles.fields}
                >
                  {emailField(false)}
                  {!rich ? (
                    <div className={styles.field}>
                      <label htmlFor="contact-message">
                        Your message <span>*</span>
                      </label>
                      <textarea
                        ref={plainMessage}
                        id="contact-message"
                        rows={5}
                        required
                        maxLength={MAX_TEXT}
                        value={text}
                        placeholder="Tell us a little about what you need…"
                        aria-invalid={invalid === "message"}
                        aria-describedby={
                          invalid === "message" ? "contact-error" : undefined
                        }
                        onChange={(event) => {
                          setText(event.target.value);
                          edited();
                        }}
                      />
                      <span className={styles.count}>
                        {text.length.toLocaleString("en-US")} / 5,000
                      </span>
                    </div>
                  ) : (
                    <div className={styles.draft}>
                      <strong>Message draft ready</strong>
                      <p>
                        {message.trim() || "Add a few details to your message."}
                      </p>
                      <span>
                        {activePhotos.length}{" "}
                        {activePhotos.length === 1 ? "photo" : "photos"}{" "}
                        attached · Your draft stays on this page
                      </span>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={openPhotos}
                        ref={openButton}
                      >
                        Continue editing
                      </button>
                    </div>
                  )}
                  {trap(false)}
                </fieldset>
                {error && !open && (
                  <p id="contact-error" className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                {privacyChoice(false)}
                <div className={styles.actions}>
                  {!rich && (
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={!country || !ready || busy}
                      onClick={openPhotos}
                      ref={openButton}
                    >
                      <ImagePlus size={18} />
                      Add photos
                    </button>
                  )}
                  {sendButton()}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {!floating && (
        <ScrollQuestionButton
          showImmediately={isQuestion}
          targetId={isQuestion ? "ask-question" : "contact-us"}
        />
      )}
      <dialog
        data-closing={closing || undefined}
        ref={dialog}
        className={styles.dialog}
        onKeyDownCapture={(event) => {
          // Without a formatting menu, Escape belongs to the modal, not the
          // editor's node-selection shortcut (which can consume it after Undo).
          if (
            event.key === "Escape" &&
            !event.currentTarget.querySelector(
              '[role="menu"][data-state="open"]',
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (!busy) closeDialog();
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || event.defaultPrevented) return;
          const items = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), [tabindex], [contenteditable="true"]',
            ),
          ).filter(
            (item) => item.tabIndex >= 0 && item.getClientRects().length > 0,
          );
          const first = items[0],
            last = items[items.length - 1];
          if (!first) {
            event.preventDefault();
            return;
          }
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialogTitle.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        aria-labelledby="contact-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!busy) closeDialog();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !busy) closeDialog();
        }}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="contact-dialog-title" ref={dialogTitle} tabIndex={-1}>
              A little more detail.
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Close message window"
            disabled={busy}
            onClick={() => closeDialog()}
          >
            <X size={22} />
          </button>
        </div>
        {receipt ? (
          successMessage(true)
        ) : (
          <form
            onSubmit={submit}
            noValidate
            aria-label="Message with photos"
            aria-busy={busy}
            className={styles.modalForm}
          >
            <fieldset disabled={busy || !ready} className={styles.fields}>
              {emailField(true)}
              <div className={styles.field}>
                <label htmlFor="contact-rich-message">
                  Your message <span>*</span>
                </label>
                <div className={styles.editor}>
                  {rich && (
                    <Suspense
                      fallback={
                        <div className={styles.editorLoading} role="status">
                          <LoaderCircle
                            className={styles.spin}
                            size={22}
                            aria-hidden="true"
                          />
                          <span>Preparing your message editor…</span>
                        </div>
                      }
                    >
                      <InquiryRichEditor
                        variant="contact"
                        initialContent={content}
                        ref={editor}
                        disabled={busy || !ready || !editorReady}
                        invalid={invalid === "message"}
                        onChange={(value) => {
                          setContent(value);
                          edited();
                        }}
                        onReady={setEditorReady}
                        resolveImage={(id) =>
                          retainedPhotos.current.find(
                            (photo) => photo.id === id,
                          )?.url
                        }
                        onPickImages={() => files.current?.click()}
                        canAddImage={activePhotos.length < MAX_IMAGES}
                        onFiles={(selected) => {
                          void addPhotos(selected);
                        }}
                      />
                    </Suspense>
                  )}
                </div>
                <span className={styles.count}>
                  {message.trim().length.toLocaleString("en-US")} / 5,000
                </span>
              </div>
              {activePhotos.length > 0 && (
                <ul className={styles.photos} aria-label="Attached photos">
                  {activePhotos.map((photo, index) => (
                    <li key={photo.id}>
                      <img
                        src={photo.url}
                        alt={`Attached photo ${index + 1}`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => editor.current?.removeImage(photo.id)}
                      >
                        <X size={15} />
                      </button>
                      <span>{Math.round(photo.file.size / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={files}
                className={styles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                aria-label="Choose photos"
                onChange={(event) => {
                  const selected = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  void addPhotos(selected);
                }}
              />
              {trap(true)}
            </fieldset>
            {processing && (
              <p className={styles.progress} role="status">
                <LoaderCircle size={17} className={styles.spin} />
                Preparing photos on your device…
              </p>
            )}
            {error && (
              <p id="contact-modal-error" className={styles.error} role="alert">
                {error}
              </p>
            )}
            {privacyChoice(true)}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondary}
                disabled={busy}
                onClick={() => closeDialog()}
              >
                Keep draft &amp; close
              </button>
              {sendButton()}
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}
