import { MockGateway } from "./mock.gateway";
import { WaroengPayGateway } from "./waroengpay.gateway";
import { PaymentGateway } from "./gateway.interface";

export function getPaymentGateway(): PaymentGateway {
  const driver = process.env.PAYMENT_GATEWAY || "mock";
  if (driver === "waroengpay") {
    return new WaroengPayGateway();
  }
  return new MockGateway();
}

export * from "./gateway.interface";
export * from "./mock.gateway";
export * from "./waroengpay.gateway";
