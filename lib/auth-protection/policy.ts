export const AUTH_ACTIONS = ["sign-in", "sign-up", "forgot", "resend"] as const;
export type AuthAction = (typeof AUTH_ACTIONS)[number];

export function isAuthAction(value: unknown): value is AuthAction {
  return (
    typeof value === "string" && AUTH_ACTIONS.includes(value as AuthAction)
  );
}

export type AuthInput = {
  action: AuthAction;
  email: string;
  password?: string;
};

export type LimitDecision = { allowed: boolean; retryAfter: number };

// Local prototype: every browser shares one source bucket. No client-provided
// IP, cookie, header or JSON field can select a different source.
export const LOCAL_SOURCE = "local-test-source";

export const POLICY_RULES = {
  loginSource: { count: 30, window: "10 m", algorithm: "sliding" },
  loginEmail: { count: 10, window: "10 m", algorithm: "sliding" },
  signupSource: { count: 5, window: "1 h", algorithm: "sliding" },
  mailSource: { count: 10, window: "10 m", algorithm: "sliding" },
  mailCooldown: { count: 1, window: "60 s", algorithm: "bucket" },
  mailHourly: { count: 5, window: "1 h", algorithm: "sliding" },
} as const;

export type PolicyName = keyof typeof POLICY_RULES;

export const ACTION_POLICIES: Record<AuthAction, readonly PolicyName[]> = {
  "sign-in": ["loginSource", "loginEmail"],
  "sign-up": ["mailSource", "signupSource", "mailCooldown", "mailHourly"],
  forgot: ["mailSource", "mailCooldown", "mailHourly"],
  resend: ["mailSource", "mailCooldown", "mailHourly"],
};
