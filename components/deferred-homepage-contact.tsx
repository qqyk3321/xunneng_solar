"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import styles from "./home-contact.module.css";

const Contact = lazy(async () => {
  const contactModule = await import("./homepage-contact");
  return { default: contactModule.HomepageContact };
});

function ContactPlaceholder({ variant }: { variant: "contact" | "question" }) {
  const question = variant === "question";
  return (
    <section
      id={question ? "ask-question" : "contact-us"}
      className={styles.section}
      aria-labelledby="deferred-contact-heading"
    >
      <div className={styles.layout}>
        <div className={styles.intro}>
          <h2 id="deferred-contact-heading">
            {question ? "Ask a question" : "Contact us"}
          </h2>
          <p>
            {question
              ? "Can’t find the answer you need? Send our team your question."
              : "Have a question about solar, storage, or your property? Leave us a message."}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Loads the full form shortly before this below-the-fold section is reached. */
export function DeferredHomepageContact({
  variant = "contact",
}: { variant?: "contact" | "question" } = {}) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!root.current || !("IntersectionObserver" in window)) {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root}>
      {active ? (
        <Suspense fallback={<ContactPlaceholder variant={variant} />}>
          <Contact variant={variant} />
        </Suspense>
      ) : (
        <ContactPlaceholder variant={variant} />
      )}
    </div>
  );
}
