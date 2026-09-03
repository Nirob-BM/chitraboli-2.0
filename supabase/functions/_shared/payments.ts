// Shared configuration + helpers for the bKash / Nagad payment gateways.
// Credentials are read from environment secrets. When they are missing the
// checkout falls back to the manual "send money + paste transaction ID" flow.

export type Provider = "bkash" | "nagad";

export const PAYMENT_ENV = (Deno.env.get("PAYMENT_ENV") || "sandbox").toLowerCase() === "live"
  ? "live"
  : "sandbox";

export interface BkashConfig {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
}

export interface NagadConfig {
  baseUrl: string;
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
}

const DEFAULT_BKASH_BASE = PAYMENT_ENV === "live"
  ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
  : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";

const DEFAULT_NAGAD_BASE = PAYMENT_ENV === "live"
  ? "https://api.mynagad.com/api/dfs"
  : "https://sandbox-ssl.mynagad.com/api/dfs";

export function getBkashConfig(): BkashConfig | null {
  const appKey = Deno.env.get("BKASH_APP_KEY");
  const appSecret = Deno.env.get("BKASH_APP_SECRET");
  const username = Deno.env.get("BKASH_USERNAME");
  const password = Deno.env.get("BKASH_PASSWORD");
  if (!appKey || !appSecret || !username || !password) return null;
  return {
    baseUrl: (Deno.env.get("BKASH_BASE_URL") || DEFAULT_BKASH_BASE).replace(/\/$/, ""),
    appKey,
    appSecret,
    username,
    password,
  };
}

export function getNagadConfig(): NagadConfig | null {
  const merchantId = Deno.env.get("NAGAD_MERCHANT_ID");
  const merchantNumber = Deno.env.get("NAGAD_MERCHANT_NUMBER");
  const publicKey = Deno.env.get("NAGAD_PUBLIC_KEY");
  const privateKey = Deno.env.get("NAGAD_PRIVATE_KEY");
  if (!merchantId || !merchantNumber || !publicKey || !privateKey) return null;
  return {
    baseUrl: (Deno.env.get("NAGAD_BASE_URL") || DEFAULT_NAGAD_BASE).replace(/\/$/, ""),
    merchantId,
    merchantNumber,
    publicKey,
    privateKey,
  };
}

export function isConfigured(provider: Provider): boolean {
  return provider === "bkash" ? getBkashConfig() !== null : getNagadConfig() !== null;
}

/** Base URL of this project's edge functions, used to build gateway callback URLs. */
export function functionsBaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL")!;
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

export function invoiceNumber(): string {
  return `CB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Grants a bKash tokenized-checkout id_token. */
export async function bkashGrantToken(cfg: BkashConfig): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      username: cfg.username,
      password: cfg.password,
    },
    body: JSON.stringify({ app_key: cfg.appKey, app_secret: cfg.appSecret }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.id_token) {
    throw new Error(`bKash token grant failed [${res.status}]: ${JSON.stringify(body)}`);
  }
  return body.id_token as string;
}

export function bkashHeaders(cfg: BkashConfig, token: string) {
  return {
    "Content-Type": "application/json",
    accept: "application/json",
    Authorization: token,
    "X-APP-Key": cfg.appKey,
  };
}

/** Nagad requires a timestamp in this exact format. */
export function nagadTimestamp(): string {
  const now = new Date();
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}`
  );
}

export function normalizePem(key: string, type: "PUBLIC" | "PRIVATE"): string {
  const trimmed = key.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  const header = type === "PUBLIC" ? "PUBLIC KEY" : "PRIVATE KEY";
  const wrapped = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${header}-----\n${wrapped}\n-----END ${header}-----`;
}
