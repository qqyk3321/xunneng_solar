import "server-only";
import { loadNativePreview } from "./native-consultation/storage";




import type { ProfileKey } from "./solution-suggest/optimizer";

export type ConsultationPreview = {
  consultation_id?: string;
  revision?: number;
  updated_at?: string;
  phone_country?: string | null;
  native?: boolean;
  answers?: Record<string, unknown>;
  submission_id: string;
  country_code: "AG" | "DM";
  name: string;
  email: string;
  phone: string;
  address: Record<string, string | null>;
  preview_url: string | null;
  submitted_at: string;
  monthly_kwh: number | null;
  consumption_profile: ProfileKey | null;
};

export async function loadConsultationPreview(token: string) {
  const row = await loadNativePreview(token);
  return row ? { ...row, native: true, preview_url: null } as ConsultationPreview : null;
}
