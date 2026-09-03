// Starts an automated bKash / Nagad payment for an existing order and returns
// the gateway checkout URL. If gateway credentials are not configured yet, it
// responds with { configured: false } so checkout can fall back to the manual
// "send money + paste transaction ID" flow.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "https://esm.sh/node-forge@1.3.1";
import {
  PAYMENT_ENV,
  type Provider,
  bkashGrantToken,
  bkashHeaders,
  functionsBaseUrl,
  getBkashConfig,
  getNagadConfig,
  invoiceNumber,
  nagadTimestamp,
  normalizePem,
} from "../_shared/payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.order_id === "string" ? body.order_id : "";
    const provider = body?.provider as Provider;
    const returnOrigin = typeof body?.return_origin === "string" ? body.return_origin : "";

    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return json({ error: "A valid order_id is required" }, 400);
    }
    if (provider !== "bkash" && provider !== "nagad") {
      return json({ error: "provider must be bkash or nagad" }, 400);
    }
    if (!/^https?:\/\/[^\s]+$/.test(returnOrigin)) {
      return json({ error: "A valid return_origin is required" }, 400);
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_amount, payment_status, customer_phone")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Failed to load order:", orderError);
      return json({ error: "Failed to load order" }, 500);
    }
    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status === "verified") {
      return json({ error: "This order is already paid" }, 400);
    }

    const configured = provider === "bkash" ? getBkashConfig() : getNagadConfig();
    if (!configured) {
      console.log(`${provider} credentials are not configured; manual fallback required`);
      return json({
        configured: false,
        provider,
        environment: PAYMENT_ENV,
        message: `${provider === "bkash" ? "bKash" : "Nagad"} gateway is not connected yet.`,
      });
    }

    const invoice = invoiceNumber();
    const amount = Number(order.total_amount).toFixed(2);

    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .insert({
        order_id: order.id,
        provider,
        environment: PAYMENT_ENV,
        amount: order.total_amount,
        status: "created",
        invoice_number: invoice,
        payer_reference: order.customer_phone,
        return_url: returnOrigin.replace(/\/$/, ""),
      })
      .select("id")
      .single();

    if (txError || !tx) {
      console.error("Failed to create payment transaction:", txError);
      return json({ error: "Failed to start payment" }, 500);
    }

    const callbackUrl = `${functionsBaseUrl()}/payment-callback?tx=${tx.id}`;

    let redirectUrl: string;
    let gatewayPaymentId: string | null = null;
    let raw: unknown;

    if (provider === "bkash") {
      const cfg = getBkashConfig()!;
      const token = await bkashGrantToken(cfg);
      const res = await fetch(`${cfg.baseUrl}/tokenized/checkout/create`, {
        method: "POST",
        headers: bkashHeaders(cfg, token),
        body: JSON.stringify({
          mode: "0011",
          payerReference: order.customer_phone,
          callbackURL: callbackUrl,
          amount,
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: invoice,
        }),
      });
      raw = await res.json().catch(() => ({}));
      const created = raw as { bkashURL?: string; paymentID?: string; statusMessage?: string };
      if (!res.ok || !created?.bkashURL || !created?.paymentID) {
        console.error(`bKash create failed [${res.status}]:`, JSON.stringify(raw));
        await supabase.from("payment_transactions").update({
          status: "failed",
          failure_reason: created?.statusMessage || `bKash create failed (${res.status})`,
          raw_response: raw,
        }).eq("id", tx.id);
        return json({ error: created?.statusMessage || "bKash could not start this payment" }, 502);
      }
      redirectUrl = created.bkashURL;
      gatewayPaymentId = created.paymentID;
    } else {
      const cfg = getNagadConfig()!;
      const dateTime = nagadTimestamp();
      const privateKey = forge.pki.privateKeyFromPem(normalizePem(cfg.privateKey, "PRIVATE"));
      const publicKey = forge.pki.publicKeyFromPem(normalizePem(cfg.publicKey, "PUBLIC"));

      const encrypt = (payload: unknown) =>
        forge.util.encode64(
          publicKey.encrypt(forge.util.encodeUtf8(JSON.stringify(payload)), "RSAES-PKCS1-V1_5"),
        );
      const sign = (payload: unknown) => {
        const md = forge.md.sha256.create();
        md.update(forge.util.encodeUtf8(JSON.stringify(payload)), "utf8");
        return forge.util.encode64(privateKey.sign(md));
      };
      const signRaw = (value: string) => {
        const md = forge.md.sha256.create();
        md.update(value, "utf8");
        return forge.util.encode64(privateKey.sign(md));
      };

      const initRes = await fetch(
        `${cfg.baseUrl}/check-out/initialize/${cfg.merchantId}/${invoice}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
            "X-KM-IP-V4": "127.0.0.1",
            "X-KM-Client-Type": "PC_WEB",
          },
          body: JSON.stringify({
            accountNumber: cfg.merchantNumber,
            dateTime,
            sensitiveData: encrypt({
              merchantId: cfg.merchantId,
              datetime: dateTime,
              orderId: invoice,
              challenge: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
            }),
            signature: signRaw(
              JSON.stringify({
                merchantId: cfg.merchantId,
                datetime: dateTime,
                orderId: invoice,
                challenge: crypto.randomUUID().replace(/-/g, "").slice(0, 20),
              }),
            ),
          }),
        },
      );
      const initBody = await initRes.json().catch(() => ({}));
      const challenge = (initBody as { sensitiveData?: string })?.sensitiveData;
      if (!initRes.ok || !challenge) {
        console.error(`Nagad initialize failed [${initRes.status}]:`, JSON.stringify(initBody));
        await supabase.from("payment_transactions").update({
          status: "failed",
          failure_reason: `Nagad initialize failed (${initRes.status})`,
          raw_response: initBody,
        }).eq("id", tx.id);
        return json({ error: "Nagad could not start this payment" }, 502);
      }

      const decrypted = JSON.parse(
        forge.util.decodeUtf8(privateKey.decrypt(forge.util.decode64(challenge), "RSAES-PKCS1-V1_5")),
      ) as { paymentReferenceId: string; challenge: string };

      const completePayload = {
        merchantId: cfg.merchantId,
        orderId: invoice,
        currencyCode: "050",
        amount,
        challenge: decrypted.challenge,
      };

      const completeRes = await fetch(
        `${cfg.baseUrl}/check-out/complete/${decrypted.paymentReferenceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KM-Api-Version": "v-0.2.0",
            "X-KM-IP-V4": "127.0.0.1",
            "X-KM-Client-Type": "PC_WEB",
          },
          body: JSON.stringify({
            sensitiveData: encrypt(completePayload),
            signature: sign(completePayload),
            merchantCallbackURL: callbackUrl,
            additionalMerchantInfo: { orderReference: order.id },
          }),
        },
      );
      raw = await completeRes.json().catch(() => ({}));
      const completed = raw as { callBackUrl?: string; status?: string; message?: string };
      if (!completeRes.ok || !completed?.callBackUrl) {
        console.error(`Nagad complete failed [${completeRes.status}]:`, JSON.stringify(raw));
        await supabase.from("payment_transactions").update({
          status: "failed",
          failure_reason: completed?.message || `Nagad complete failed (${completeRes.status})`,
          raw_response: raw,
        }).eq("id", tx.id);
        return json({ error: completed?.message || "Nagad could not start this payment" }, 502);
      }
      redirectUrl = completed.callBackUrl;
      gatewayPaymentId = decrypted.paymentReferenceId;
    }

    await supabase.from("payment_transactions").update({
      status: "initiated",
      gateway_payment_id: gatewayPaymentId,
      raw_response: raw as Record<string, unknown>,
    }).eq("id", tx.id);

    await supabase.from("orders").update({
      payment_status: "pending_verification",
      payment_gateway: provider,
    }).eq("id", order.id);

    return json({
      configured: true,
      provider,
      environment: PAYMENT_ENV,
      transaction_id: tx.id,
      invoice_number: invoice,
      redirect_url: redirectUrl,
    });
  } catch (error) {
    console.error("Unexpected error in payment-initiate:", error);
    return json({ error: "An unexpected error occurred while starting the payment" }, 500);
  }
});
