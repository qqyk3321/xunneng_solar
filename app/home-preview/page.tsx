import type { Metadata } from "next";
import { DemoHomepage } from "@/components/demo-homepage";
import { HomeAccount } from "@/components/home-account-menu";
import { createClient } from "@/lib/supabase-auth/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase-auth/config";
import type { AuthIdentity } from "@/app/auth-preview/auth-panel";
import styles from "@/components/home-account-menu.module.css";
import { HomeContact } from "@/components/home-contact";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Homepage Account Preview | Sol & Tide Energy",
  robots: { index: false, follow: false },
};

export default async function HomePreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const configured = isSupabaseAuthConfigured();
  let identity: AuthIdentity | null = null;
  let unavailable = !configured;
  if (configured) {
    try {
      const client = await createClient();
      const { data, error } = await client.auth.getClaims();
      const claims = data?.claims;
      if (error) unavailable = true;
      if (claims?.sub)
        identity = {
          id: claims.sub,
          email: typeof claims.email === "string" ? claims.email : null,
        };
    } catch {
      unavailable = true;
    }
  }
  return (
    <div className={styles.preview}>
      <DemoHomepage
        contactSlot={
          process.env.NODE_ENV === "development" ? (
            <HomeContact initialEmail={identity?.email ?? ""} />
          ) : undefined
        }
        accountSlot={
          <HomeAccount
            initialIdentity={identity}
            configured={configured}
            unavailable={unavailable}
          />
        }
      />
    </div>
  );
}
