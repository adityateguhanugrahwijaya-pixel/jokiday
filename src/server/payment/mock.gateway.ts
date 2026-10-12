import {
  ChargeResult,
  CreateChargeParams,
  PaymentGateway,
  PaymentStatusResult,
  WebhookValidationResult,
} from "./gateway.interface";
import crypto from "node:crypto";

export class MockGateway implements PaymentGateway {
  private static store = new Map<string, { status: "pending" | "paid" | "expired" | "cancelled"; amount: number; paidAt?: Date }>();

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    const gatewayRef = `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const paymentId = crypto.randomUUID();

    MockGateway.store.set(gatewayRef, {
      status: "pending",
      amount: params.amount,
    });

    return {
      paymentId,
      gatewayRef,
      checkoutUrl: params.redirectUrl || `/orders/${params.orderId}`,
      qris: "0002010102122650014ID.WAROENGPAY.WWW01189360099900000000015204581253033605802ID5911JokiDay QRIS6007JAKARTA61051234062230719WRG-TEST00016304A1B2",
      amount: params.amount,
      baseAmount: params.amount,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  async checkStatus(gatewayRef: string): Promise<PaymentStatusResult> {
    const item = MockGateway.store.get(gatewayRef);
    if (!item) {
      return { status: "pending", amount: 0 };
    }
    return {
      status: item.status,
      paidAt: item.paidAt,
      amount: item.amount,
    };
  }

  // Simulate payment for test suites
  static simulatePayment(gatewayRef: string) {
    const item = this.store.get(gatewayRef);
    if (item) {
      item.status = "paid";
      item.paidAt = new Date();
    }
  }

  verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): WebhookValidationResult {
    try {
      const parsed = JSON.parse(rawBody);
      return {
        isValid: true,
        event: parsed,
      };
    } catch {
      return { isValid: false };
    }
  }
}
