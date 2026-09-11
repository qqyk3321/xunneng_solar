import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthInput } from "./policy";
import type { AuthOutcome } from "./handler";

export async function performSupabaseAction(
  client: SupabaseClient,
  input: AuthInput,
  origin: string,
): Promise<AuthOutcome> {
  const confirmation = origin + "/auth-preview/confirm?next=/auth-preview";
  if (input.action === "sign-in") {
    const { data, error } = await client.auth.signInWithPassword({
      email: input.email,
      password: input.password!,
    });
    return { authenticated: Boolean(data.session), error: error ?? undefined };
  }
  if (input.action === "sign-up") {
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password!,
      options: { emailRedirectTo: confirmation },
    });
    return { authenticated: Boolean(data.session), error: error ?? undefined };
  }
  if (input.action === "forgot") {
    const { error } = await client.auth.resetPasswordForEmail(input.email, {
      redirectTo:
        origin + "/auth-preview/confirm?next=/auth-preview/update-password",
    });
    return { error: error ?? undefined };
  }
  const { error } = await client.auth.resend({
    type: "signup",
    email: input.email,
    options: { emailRedirectTo: confirmation },
  });
  return { error: error ?? undefined };
}
