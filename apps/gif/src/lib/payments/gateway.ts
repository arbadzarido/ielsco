// Gateway abstraction. Midtrans is the only online gateway integrated today; a second gateway (for USD settlement) plugs
// in here once its eligibility for PT English Space Berkah Indonesia is verified (docs/gif/PAYMENTS.md §5).
// Manual payments (bank transfer verified by finance) are not a gateway: they are recorded by staff in the admin.
import { classify, createSnap, getStatus, midtransConfig, modifyTransaction, refund, type ModifyResult, type Normalized } from "./midtrans.ts";

export type GatewayStatus = { result: Normalized; amount: number | null; currency: string | null; transactionId: string | null;
  paymentType: string | null; transactionStatus: string | null; fraudStatus: string | null; statusCode: string | null; raw: Record<string, unknown> };

export interface PaymentGateway {
  id: "midtrans";
  currencies: readonly ("IDR" | "USD")[];
  createCheckout(i: { orderId: string; amount: number; currency: "IDR"; itemId: string; itemName: string;
    customer: { name: string; email: string; phone?: string }; finishUrl: string; notificationUrl: string; expiryMinutes: number }): Promise<{ redirectUrl: string; token: string }>;
  fetchStatus(orderId: string): Promise<GatewayStatus | null>;
  refund(orderId: string, refundKey: string, amount: number, reason: string): Promise<{ ok: boolean; raw: Record<string, unknown> }>;
  cancel(orderId: string): Promise<ModifyResult>;
  expire(orderId: string): Promise<ModifyResult>;
  // Public by design (Snap JS needs it in the browser); never the server key.
  snap: { clientKey: string; scriptUrl: string };
}

export function midtransGateway(): PaymentGateway | null {
  const { config } = midtransConfig();
  if (!config) return null;
  return {
    id: "midtrans",
    currencies: ["IDR"],
    async createCheckout(i) {
      const r = await createSnap(config, { orderId: i.orderId, amountIdr: i.amount, itemId: i.itemId, itemName: i.itemName, customer: i.customer,
        finishUrl: i.finishUrl, notificationUrl: i.notificationUrl, expiryMinutes: i.expiryMinutes });
      return { redirectUrl: r.redirectUrl, token: r.token };
    },
    async fetchStatus(orderId) {
      const s = await getStatus(config, orderId);
      if (!s) return null;
      const amount = s.gross_amount != null ? Number(s.gross_amount) : null;
      return { result: classify(s), amount: Number.isFinite(amount) ? amount : null, currency: (s.currency as string) || "IDR",
        transactionId: s.transaction_id ?? null, paymentType: s.payment_type ?? null, transactionStatus: s.transaction_status ?? null,
        fraudStatus: s.fraud_status ?? null, statusCode: s.status_code ?? null, raw: s };
    },
    async refund(orderId, refundKey, amount, reason) {
      const r = await refund(config, orderId, refundKey, amount, reason);
      return { ok: r.ok, raw: r.body };
    },
    cancel: (orderId) => modifyTransaction(config, orderId, "cancel"),
    expire: (orderId) => modifyTransaction(config, orderId, "expire"),
    snap: { clientKey: config.clientKey, scriptUrl: `${config.snapBase}/snap/snap.js` },
  };
}

export function paymentsState(): { ready: boolean; env: string | null; reason?: string } {
  const { config, reason } = midtransConfig();
  return config ? { ready: true, env: config.env } : { ready: false, env: null, reason };
}
