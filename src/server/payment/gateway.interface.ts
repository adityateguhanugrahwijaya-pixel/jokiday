export interface CreateChargeParams {
  orderId: string;
  amount: number;
  description?: string;
  redirectUrl?: string;
  callbackUrl?: string;
}

export interface ChargeResult {
  paymentId: string;
  gatewayRef: string;
  checkoutUrl: string;
  qris?: string;
  amount: number;
  baseAmount: number;
  expiresAt?: Date;
}

export interface PaymentStatusResult {
  status: "pending" | "paid" | "expired" | "cancelled";
  paidAt?: Date | null;
  amount: number;
  issuer?: string;
  payer?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  event?: {
    id: string;
    event: "payment.paid" | "payment.expired" | "payment.cancelled" | "ping";
    data: {
      id: string; // WRG-...
      reference?: string;
      status: string;
      baseAmount: number;
      amount: number;
      paidAt?: string | null;
      late?: boolean;
    };
  };
}

export interface PaymentGateway {
  createCharge(params: CreateChargeParams): Promise<ChargeResult>;
  checkStatus(gatewayRef: string): Promise<PaymentStatusResult>;
  verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): WebhookValidationResult;
}
