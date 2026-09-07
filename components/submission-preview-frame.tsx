"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";

type SubmissionPreviewFrameProps = {
  previewUrl: string;
};

export function SubmissionPreviewFrame({ previewUrl }: SubmissionPreviewFrameProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="submission-preview-frame-wrap">
      {isLoading && (
        <div className="submission-preview-loading" aria-live="polite">
          <div className="submission-preview-loading-icon">
            <ShieldCheck aria-hidden="true" />
          </div>
          <p>Securely loading your consultation record</p>
          <span>This usually takes only a few seconds.</span>
          <div className="submission-preview-skeleton-lines" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
      <iframe
        className="submission-preview-frame"
        src={previewUrl}
        title="Consultation record preview"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}
