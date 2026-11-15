/**
 * A4: PaymentProvider interface. MockProvider (dev) marks the order PAID immediately.
 * PAY-2: adapters must record payer name/account for reconciliation.
 */
export type PaymentStart = { orderRef: string; amountInr: number; payerName: string; returnUrl: string };
export type PaymentSession = { provider: string; sessionId: string; redirectUrl?: string; immediatelyPaid?: boolean; payerAccount?: string };
export type PaymentWebhookResult = { orderRef: string; paid: boolean; reference: string; payerName?: string; payerAccount?: string };

export interface PaymentProvider {
  name: string;
  start(p: PaymentStart): Promise<PaymentSession>;
  /** parse + verify a provider webhook */
  verifyWebhook(req: Request): Promise<PaymentWebhookResult | null>;
}

export class MockProvider implements PaymentProvider {
  name = "mock";
  async start(p: PaymentStart): Promise<PaymentSession> {
    return { provider: this.name, sessionId: `mock_${p.orderRef}_${Date.now()}`, immediatelyPaid: true, payerAccount: "MOCK-ACCOUNT" };
  }
  async verifyWebhook(req: Request) {
    if (process.env.NODE_ENV === "production") return null;
    const body = (await req.json().catch(() => null)) as { orderRef?: string; reference?: string } | null;
    if (!body?.orderRef) return null;
    return { orderRef: body.orderRef, paid: true, reference: body.reference ?? `mock_${Date.now()}` };
  }
}

/** Razorpay adapter stub - implement with the Razorpay Orders API + webhook signature check. */
export class RazorpayProvider implements PaymentProvider {
  name = "razorpay";
  async start(): Promise<PaymentSession> {
    throw new Error("Razorpay adapter not implemented yet. See README > Payments.");
  }
  async verifyWebhook(): Promise<PaymentWebhookResult | null> {
    // TODO: verify X-Razorpay-Signature (HMAC-SHA256 of raw body with webhook secret)
    return null;
  }
}

export function paymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    case "razorpay":
      return new RazorpayProvider();
    default:
      return new MockProvider();
  }
}
