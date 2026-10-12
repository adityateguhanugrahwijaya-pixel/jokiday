import { describe, it, expect } from "vitest";
import { verifyWaroengPaySignature } from "../../src/lib/crypto";
import crypto from "node:crypto";

describe("WaroengPay Payment Gateway - Signature Verification", () => {
  const secret = "whsec_test_secret_123456789";

  it("verifies valid HMAC-SHA256 signature successfully", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({
      id: "evt_test123",
      event: "payment.paid",
      data: {
        id: "WRG-TEST12345",
        status: "paid",
        base_amount: 50000,
        amount: 50137,
      },
    });

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const isValid = verifyWaroengPaySignature(timestamp, rawBody, expectedSignature, secret);
    expect(isValid).toBe(true);
  });

  it("rejects tampered body or invalid signature", () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify({ event: "payment.paid", data: { id: "WRG-TEST" } });
    const wrongSignature = "bad_signature_deadbeef1234567890abcdef1234567890abcdef1234567890abcdef";

    const isValid = verifyWaroengPaySignature(timestamp, rawBody, wrongSignature, secret);
    expect(isValid).toBe(false);
  });

  it("rejects expired timestamp (more than 300 seconds ago)", () => {
    const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 301);
    const rawBody = JSON.stringify({ event: "payment.paid" });

    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${expiredTimestamp}.${rawBody}`)
      .digest("hex");

    const isValid = verifyWaroengPaySignature(expiredTimestamp, rawBody, signature, secret);
    expect(isValid).toBe(false);
  });
});
