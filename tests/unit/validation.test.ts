import { describe, it, expect } from "vitest";
import { validateNIK } from "../../src/lib/validation";

describe("NIK Validation Utility (validateNIK)", () => {
  it("rejects NIK with less than 16 digits", () => {
    const res = validateNIK("123456789012345");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("NIK harus terdiri dari 16 digit angka");
  });

  it("rejects NIK with more than 16 digits", () => {
    const res = validateNIK("12345678901234567");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("NIK harus terdiri dari 16 digit angka");
  });

  it("rejects NIK containing non-numeric characters", () => {
    const res = validateNIK("317101150890000a");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("NIK harus terdiri dari 16 digit angka");
  });

  it("accepts valid NIK for male (day <= 31)", () => {
    // 317101 15 08 90 0001 (born 15 August 1990)
    const res = validateNIK("3171011508900001");
    expect(res.valid).toBe(true);
    expect(res.reason).toBe("Format dasar NIK lolos pemeriksaan");
  });

  it("accepts valid NIK for female (day > 40, day - 40 <= 31)", () => {
    // 317101 55 08 90 0001 (born 15 August 1990, 15 + 40 = 55)
    const res = validateNIK("3171015508900001");
    expect(res.valid).toBe(true);
    expect(res.reason).toBe("Format dasar NIK lolos pemeriksaan");
  });

  it("rejects NIK with invalid month (> 12)", () => {
    // month 13
    const res = validateNIK("3171011513900001");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Bagian tanggal lahir tidak valid");
  });

  it("rejects NIK with invalid month (00)", () => {
    // month 00
    const res = validateNIK("3171011500900001");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Bagian tanggal lahir tidak valid");
  });

  it("rejects NIK with invalid day (> 31 for male)", () => {
    // day 32
    const res = validateNIK("3171013208900001");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Bagian tanggal lahir tidak valid");
  });

  it("rejects NIK with invalid day (> 71 for female, dayCode - 40 > 31)", () => {
    // day 72 (72 - 40 = 32)
    const res = validateNIK("3171017208900001");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Bagian tanggal lahir tidak valid");
  });

  it("rejects NIK with invalid day (00)", () => {
    // day 00
    const res = validateNIK("3171010008900001");
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("Bagian tanggal lahir tidak valid");
  });
});
