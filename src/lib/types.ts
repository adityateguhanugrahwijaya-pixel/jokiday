export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export type UserRole = "CUSTOMER" | "DESIGNER";

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "REVISION"
  | "DISPUTED"
  | "COMPLETED"
  | "REFUNDED"
  | "CANCELLED";

export type DisputeResolution = "REFUND_FULL" | "RELEASE_FULL" | "SPLIT";
