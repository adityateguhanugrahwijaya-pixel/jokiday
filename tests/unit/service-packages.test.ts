import { describe, it, expect } from "vitest";
import {
  MIN_SERVICE_PACKAGE_PRICE,
  validateServicePackagePrice,
  getLowestActivePackagePrice,
} from "@/lib/constants/packages";

describe("Service Package Constants & Validation", () => {
  it("should have MIN_SERVICE_PACKAGE_PRICE set to 10.000", () => {
    expect(MIN_SERVICE_PACKAGE_PRICE).toBe(10000);
  });

  describe("validateServicePackagePrice", () => {
    it("accepts valid price of Rp10.000 (minimum threshold)", () => {
      const result = validateServicePackagePrice(10000);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(10000);
      expect(result.error).toBeUndefined();
    });

    it("accepts valid price greater than Rp10.000", () => {
      const result = validateServicePackagePrice(150000);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(150000);
    });

    it("accepts string representations of valid integer prices", () => {
      const result = validateServicePackagePrice("50000");
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(50000);
    });

    it("rejects price below Rp10.000 (e.g., Rp9.999)", () => {
      const result = validateServicePackagePrice(9999);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Rp10.000");
    });

    it("rejects zero or negative prices", () => {
      const zero = validateServicePackagePrice(0);
      expect(zero.isValid).toBe(false);

      const negative = validateServicePackagePrice(-5000);
      expect(negative.isValid).toBe(false);
    });

    it("rejects empty or non-numeric values", () => {
      expect(validateServicePackagePrice("").isValid).toBe(false);
      expect(validateServicePackagePrice(null).isValid).toBe(false);
      expect(validateServicePackagePrice(undefined).isValid).toBe(false);
      expect(validateServicePackagePrice("abc").isValid).toBe(false);
    });
  });

  describe("getLowestActivePackagePrice", () => {
    it("returns null when package list is empty or null/undefined", () => {
      expect(getLowestActivePackagePrice(null)).toBeNull();
      expect(getLowestActivePackagePrice(undefined)).toBeNull();
      expect(getLowestActivePackagePrice([])).toBeNull();
    });

    it("returns the lowest price among active packages", () => {
      const packages = [
        { price: 150000, isActive: true },
        { price: 25000, isActive: true },
        { price: 75000, isActive: true },
      ];
      expect(getLowestActivePackagePrice(packages)).toBe(25000);
    });

    it("ignores inactive packages even if their price is lower", () => {
      const packages = [
        { price: 5000, isActive: false }, // Inactive, must be ignored
        { price: 50000, isActive: true },
        { price: 100000, isActive: true },
      ];
      expect(getLowestActivePackagePrice(packages)).toBe(50000);
    });

    it("returns null if all packages are inactive", () => {
      const packages = [
        { price: 50000, isActive: false },
        { price: 100000, isActive: false },
      ];
      expect(getLowestActivePackagePrice(packages)).toBeNull();
    });

    it("ignores packages with invalid prices (<= 0)", () => {
      const packages = [
        { price: 0, isActive: true },
        { price: -10000, isActive: true },
        { price: 30000, isActive: true },
      ];
      expect(getLowestActivePackagePrice(packages)).toBe(30000);
    });
  });
});
