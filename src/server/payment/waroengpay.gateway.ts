import {
  ChargeResult,
  CreateChargeParams,
  PaymentGateway,
  PaymentStatusResult,
  WebhookValidationResult,
} from "./gateway.interface";
import { AppError } from "@/lib/errors";
import { verifyWaroengPaySignature } from "@/lib/crypto";
import crypto from "node:crypto";

export class WaroengPayGateway implements PaymentGateway {
  private apiKey: string;
  private baseUrl: string;
  private webhookSecret: string;

  constructor() {
    this.apiKey = process.env.WAROENGPAY_API_KEY || "";
    this.baseUrl = (process.env.WAROENGPAY_BASE_URL || "https://waroengpay.com").replace(/\/$/, "");
    this.webhookSecret = process.env.WAROENGPAY_WEBHOOK_SECRET || "";
  }

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    if (!this.apiKey) {
      throw new AppError("WAROENGPAY_API_KEY belum dikonfigurasi di environment", "GATEWAY_CONFIG_MISSING", 500);
    }

    const payload = {
      amount: params.amount,
      reference: params.orderId,
      description: params.description || `Pembayaran JokiDay Order #${params.orderId}`,
      callback_url: params.callbackUrl,
      redirect_url: params.redirectUrl,
      expires_in: 60, // Sesuai aturan WaroengPay: bilangan bulat 5 sampai 60 menit
    };

    const res = await fetch(`${this.baseUrl}/api/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.orderId,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = res.statusText;
      try {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorBody = await res.json();
          errorMessage = errorBody.error || errorBody.message || res.statusText;
        } else {
          const rawText = await res.text();
          errorMessage = rawText.slice(0, 150);
        }
      } catch {}
      throw new AppError(
        `WaroengPay createCharge error: ${errorMessage}`,
        "GATEWAY_ERROR",
        502
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const rawText = await res.text();
      throw new AppError(`Format respons gateway tidak valid: ${rawText.slice(0, 100)}`, "GATEWAY_ERROR", 502);
    }

    const data = await res.json();
    return {
      paymentId: crypto.randomUUID(),
      gatewayRef: data.id, // WRG-...
      checkoutUrl: data.pay_url,
      qris: data.qris,
      amount: data.amount, // sudah termasuk kode unik jika ada
      baseAmount: data.base_amount,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    };
  }

  async checkStatus(gatewayRef: string): Promise<PaymentStatusResult> {
    if (!this.apiKey) {
      throw new AppError("WAROENGPAY_API_KEY belum dikonfigurasi di environment", "GATEWAY_CONFIG_MISSING", 500);
    }

    const res = await fetch(`${this.baseUrl}/api/payments/${gatewayRef}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      throw new AppError(`Gagal mengambil status tagihan WaroengPay: ${gatewayRef}`, "GATEWAY_FETCH_ERROR", 502);
    }

    const data = await res.json();
    return {
      status: data.status, // pending | paid | expired | cancelled
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      amount: data.amount,
      issuer: data.payment?.issuer,
      payer: data.payment?.payer,
    };
  }

  verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): WebhookValidationResult {
    const timestamp =
      headers["x-waroengpay-timestamp"] || headers["X-WaroengPay-Timestamp"] || "";
    const signature = headers["x-signature"] || headers["X-Signature"] || "";

    const isValid = verifyWaroengPaySignature(
      timestamp,
      rawBody,
      signature,
      this.webhookSecret
    );

    if (!isValid) {
      return { isValid: false };
    }

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

  /**
   * Mengambil saldo akun merchant langsung dari API WaroengPay:
   * GET /api/balance
   * Header: Authorization: Bearer $WAROENGPAY_API_KEY
   */
  async getBalance(): Promise<{
    available: number;
    held: number;
    inProcess: number;
    withdrawn: number;
    totalReceived: number;
    settled: number;
    gross: number;
    fee: number;
    currency: string;
    raw: any;
  }> {
    if (!this.apiKey) {
      throw new AppError("WAROENGPAY_API_KEY belum dikonfigurasi di environment", "GATEWAY_CONFIG_MISSING", 500);
    }

    const res = await fetch(`${this.baseUrl}/api/balance`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const json = await res.json();
        errorMsg = json.message || json.error || res.statusText;
      } catch {}
      throw new AppError(`Gagal mengambil saldo dari WaroengPay: ${errorMsg}`, "GATEWAY_ERROR", 502);
    }

    const data = await res.json();
    return {
      available: data.available || 0,
      held: data.held || 0,
      inProcess: data.in_process || 0,
      withdrawn: data.withdrawn || 0,
      totalReceived: data.total_received || 0,
      settled: data.settled || 0,
      gross: data.gross || 0,
      fee: data.fee || 0,
      currency: data.currency || "IDR",
      raw: data,
    };
  }
}
