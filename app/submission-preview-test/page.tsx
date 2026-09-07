import { redirect } from "next/navigation";
import Link from "next/link";
import { SubmissionPreviewFrame } from "@/components/submission-preview-frame";
import {
  ArrowLeft,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  SunMedium,
} from "lucide-react";

export const metadata = {
  title: "Consultation Preview | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ id?: string | string[] }>;
};

const TALLY_ID_LENGTH = 7;
const COMBINED_ID_LENGTH = TALLY_ID_LENGTH * 3;

type SubmissionRecord = {
  submission_preview_url: string | null;
};

function splitCombinedId(id: string) {
  if (!new RegExp(`^[A-Za-z0-9]{${COMBINED_ID_LENGTH}}$`).test(id)) {
    return undefined;
  }

  return {
    submissionId: id.slice(0, TALLY_ID_LENGTH),
    responseId: id.slice(TALLY_ID_LENGTH, TALLY_ID_LENGTH * 2),
    respondentId: id.slice(TALLY_ID_LENGTH * 2),
  };
}

async function findSubmissionPreview(id: string) {
  const idParts = splitCombinedId(id);
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!idParts || !supabaseUrl || !supabaseServiceRoleKey) {
    return undefined;
  }

  const requestUrl = new URL("/rest/v1/tally_form_submissions", supabaseUrl);
  requestUrl.search = new URLSearchParams({
    select: "submission_preview_url",
    submission_id: `eq.${idParts.submissionId}`,
    response_id: `eq.${idParts.responseId}`,
    respondent_id: `eq.${idParts.respondentId}`,
    limit: "1",
  }).toString();

  try {
    const response = await fetch(requestUrl, {
      cache: "no-store",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    });

    if (!response.ok) return undefined;

    const records = (await response.json()) as SubmissionRecord[];
    return records[0]?.submission_preview_url ?? undefined;
  } catch {
    return undefined;
  }
}

export default async function SubmissionPreviewTestPage({ searchParams }: PageProps) {
  const { id } = await searchParams;
  const requestedId = typeof id === "string" ? id : undefined;
  const previewUrl = requestedId ? await findSubmissionPreview(requestedId) : undefined;

  if (!previewUrl) {
    redirect("/");
  }

  try {
    const url = new URL(previewUrl);
    if (url.protocol !== "https:" || url.hostname !== "tally.so") redirect("/");
  } catch {
    redirect("/");
  }

  return (
    <main className="submission-preview-shell">
      <header className="submission-preview-header">
        <Link className="submission-preview-brand" href="/">
          <img
            alt="Sol & Tide Energy"
            className="submission-preview-logo"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbS8SD9uPuJ5oxCAL-RJJYy4PJNDQFY3xV9WHKaMH9Q_M2uybLvcarG1oNgRWumbDugyMKzO7kWf77rLewrR_bAsufLojx8HGGi6ikOBYgCykXNdTXHsRsIiEeUm67MZvMdfrwn4QwBjQnGU-QQz3lmm46U8vH7x3plpudCYwjma8xniYAqIYInsmjerw5Z34E612xkIEgtnZqAlFlD-DHulboZyyNjEnAu9edC1uyxvzTnIuMuCca"
          />
          <span>
            <strong>Sol &amp; Tide Energy</strong>
            <small>Caribbean Solar &amp; Storage Solutions</small>
          </span>
        </Link>
          <span className="submission-preview-status">
          <ShieldCheck aria-hidden="true" /> Verified consultation record
        </span>
      </header>

      <div className="submission-preview-layout">
        <aside className="submission-preview-sidebar">
          <Link className="submission-preview-back" href="/">
            <ArrowLeft aria-hidden="true" /> Back to home
          </Link>
          <span className="submission-preview-kicker">
            <SunMedium aria-hidden="true" /> CONSULTATION OVERVIEW
          </span>
          <h1>Your preliminary energy consultation</h1>
          <p>
            This record includes the location, energy requirements, and contact
            details you submitted. Our engineering team will use it to prepare
            your initial assessment.
          </p>

          <div className="submission-preview-steps">
            <span><b>01</b> Installation location confirmed</span>
            <span><b>02</b> Consultation submitted</span>
            <span className="current"><b>03</b> Viewing your record</span>
          </div>

          <div className="submission-preview-note">
            <ClipboardCheck aria-hidden="true" />
            <span>Your record has been verified with its unique identifier.</span>
          </div>
          <div className="submission-preview-note">
            <MapPin aria-hidden="true" />
            <span>Need to update your location or details? Please contact us.</span>
          </div>
        </aside>

        <section className="submission-preview-content">
          <div className="submission-preview-content-heading">
            <div>
              <p>CONSULTATION RECORD</p>
              <h2>Your submitted details</h2>
            </div>
            <span><ShieldCheck aria-hidden="true" /> Verified</span>
          </div>
          <SubmissionPreviewFrame previewUrl={previewUrl} />
        </section>
      </div>
    </main>
  );
}
