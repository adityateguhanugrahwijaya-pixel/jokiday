import { describe, it, expect } from "vitest";

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "login",
  "register",
  "chat",
  "orders",
  "profile",
  "market",
  "briefs",
  "terms",
  "privacy",
  "dashboard",
  "designer",
  "user",
  "help",
  "support",
  "jokiday",
  "agentkikir",
]);

function validateUsernameInput(rawUsername: string): { valid: boolean; reason?: string; cleanUsername?: string } {
  const clean = rawUsername.toLowerCase().trim().replace(/^@+/, "");

  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      reason: "Username hanya boleh berupa huruf kecil (a-z), angka (0-9), dan garis bawah (_), antara 3 hingga 30 karakter.",
    };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return {
      valid: false,
      reason: "Username ini dicadangkan oleh sistem dan tidak dapat digunakan.",
    };
  }

  return { valid: true, cleanUsername: clean };
}

describe("Username Validation", () => {
  it("accepts valid alphanumeric and underscore usernames", () => {
    expect(validateUsernameInput("budi_santoso").valid).toBe(true);
    expect(validateUsernameInput("designer_01").valid).toBe(true);
    expect(validateUsernameInput("jokiday").valid).toBe(false); // jokiday is reserved
    expect(validateUsernameInput("kikir_studio").valid).toBe(true);
  });

  it("strips leading @ sign automatically", () => {
    const res = validateUsernameInput("@alex_designer");
    expect(res.valid).toBe(true);
    expect(res.cleanUsername).toBe("alex_designer");
  });

  it("rejects usernames that are too short (< 3 chars)", () => {
    const res = validateUsernameInput("ab");
    expect(res.valid).toBe(false);
  });

  it("rejects usernames that are too long (> 30 chars)", () => {
    const res = validateUsernameInput("a".repeat(31));
    expect(res.valid).toBe(false);
  });

  it("rejects usernames with uppercase or special symbols", () => {
    expect(validateUsernameInput("budi-santoso").valid).toBe(false);
    expect(validateUsernameInput("budi santoso").valid).toBe(false);
    expect(validateUsernameInput("budi!@#").valid).toBe(false);
  });

  it("rejects reserved system usernames", () => {
    expect(validateUsernameInput("admin").valid).toBe(false);
    expect(validateUsernameInput("api").valid).toBe(false);
    expect(validateUsernameInput("profile").valid).toBe(false);
    expect(validateUsernameInput("dashboard").valid).toBe(false);
    expect(validateUsernameInput("designer").valid).toBe(false);
  });
});
