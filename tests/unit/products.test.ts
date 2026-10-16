import { describe, it, expect } from "vitest";
import {
  MIN_PAID_PRODUCT_PRICE,
  PRODUCT_CATEGORIES,
  PRODUCT_ALLOWED_EXTENSIONS,
  validateProductPrice,
  validateProductExternalUrl,
  isAllowedProductFileExtension,
} from "@/lib/constants/products";
import { LedgerService } from "@/server/ledger/ledger.service";

describe("Premade Products Constants & Validators", () => {
  it("should have MIN_PAID_PRODUCT_PRICE set to 1000", () => {
    expect(MIN_PAID_PRODUCT_PRICE).toBe(1000);
  });

  describe("validateProductPrice", () => {
    it("accepts Rp0 when isFree is true", () => {
      const result = validateProductPrice(0, true);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
    });

    it("accepts string representation '0' when isFree is true", () => {
      const result = validateProductPrice("0", true);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(0);
    });

    it("accepts exact minimum price (Rp1.000) for paid product", () => {
      const result = validateProductPrice(1000, false);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(1000);
    });

    it("accepts higher price (e.g. Rp25.000) for paid product", () => {
      const result = validateProductPrice(25000, false);
      expect(result.isValid).toBe(true);
      expect(result.value).toBe(25000);
    });

    it("rejects prices between Rp1 and Rp999 (under minimum threshold)", () => {
      const result500 = validateProductPrice(500, false);
      expect(result500.isValid).toBe(false);
      expect(result500.error).toContain("Rp1.000");

      const result999 = validateProductPrice("999", false);
      expect(result999.isValid).toBe(false);
      expect(result999.error).toContain("Rp1.000");
    });

    it("rejects negative prices", () => {
      const result = validateProductPrice(-1000, false);
      expect(result.isValid).toBe(false);
    });

    it("rejects non-integer / floating prices", () => {
      const result = validateProductPrice(1500.75, false);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("angka bulat");
    });

    it("rejects empty or non-numeric values for paid product", () => {
      expect(validateProductPrice("", false).isValid).toBe(false);
      expect(validateProductPrice("abc", false).isValid).toBe(false);
      expect(validateProductPrice(null, false).isValid).toBe(false);
      expect(validateProductPrice(undefined, false).isValid).toBe(false);
    });
  });

  describe("validateProductExternalUrl", () => {
    it("accepts valid HTTPS Google Drive links", () => {
      const res = validateProductExternalUrl(
        "https://drive.google.com/file/d/1a2b3c4d5e/view?usp=sharing"
      );
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toContain("drive.google.com");
    });

    it("accepts valid Canva template sharing links", () => {
      const res = validateProductExternalUrl(
        "https://www.canva.com/design/DAFabc123/view"
      );
      expect(res.isValid).toBe(true);
    });

    it("accepts valid Dropbox and Mega links", () => {
      expect(
        validateProductExternalUrl("https://www.dropbox.com/s/123/file.zip?dl=0").isValid
      ).toBe(true);
      expect(
        validateProductExternalUrl("https://mega.nz/file/abc123#key").isValid
      ).toBe(true);
    });

    it("rejects non-HTTP/HTTPS protocols like ftp and javascript", () => {
      expect(validateProductExternalUrl("ftp://dropbox.com/file.zip").isValid).toBe(false);
      expect(validateProductExternalUrl("javascript:alert(1)").isValid).toBe(false);
    });

    it("rejects malformed URLs or plain text", () => {
      expect(validateProductExternalUrl("not a url").isValid).toBe(false);
      expect(validateProductExternalUrl("").isValid).toBe(false);
    });
  });

  describe("isAllowedProductFileExtension", () => {
    it("allows standard digital asset and archive extensions", () => {
      expect(isAllowedProductFileExtension("zip")).toBe(true);
      expect(isAllowedProductFileExtension("rar")).toBe(true);
      expect(isAllowedProductFileExtension("7z")).toBe(true);
      expect(isAllowedProductFileExtension("psd")).toBe(true);
      expect(isAllowedProductFileExtension("ai")).toBe(true);
      expect(isAllowedProductFileExtension("eps")).toBe(true);
      expect(isAllowedProductFileExtension("pdf")).toBe(true);
      expect(isAllowedProductFileExtension("fig")).toBe(true);
      expect(isAllowedProductFileExtension("png")).toBe(true);
    });

    it("case-insensitively checks extensions", () => {
      expect(isAllowedProductFileExtension("ZIP")).toBe(true);
      expect(isAllowedProductFileExtension("PSD")).toBe(true);
    });

    it("rejects dangerous or unsupported executable extensions", () => {
      expect(isAllowedProductFileExtension("exe")).toBe(false);
      expect(isAllowedProductFileExtension("sh")).toBe(false);
      expect(isAllowedProductFileExtension("bat")).toBe(false);
      expect(isAllowedProductFileExtension("php")).toBe(false);
      expect(isAllowedProductFileExtension("js")).toBe(false);
    });
  });

  describe("Ledger Calculation for Digital Products", () => {
    it("calculates exactly 5% fee and 95% net to designer", () => {
      const { fee, designerNet } = LedgerService.calculatePlatformFee(25000);
      expect(fee).toBe(1250);
      expect(designerNet).toBe(23750);
      expect(fee + designerNet).toBe(25000);
    });

    it("calculates correctly for minimum price of Rp1.000", () => {
      const { fee, designerNet } = LedgerService.calculatePlatformFee(1000);
      expect(fee).toBe(50);
      expect(designerNet).toBe(950);
      expect(fee + designerNet).toBe(1000);
    });

    it("returns zero for Rp0 (free) products", () => {
      const { fee, designerNet } = LedgerService.calculatePlatformFee(0);
      expect(fee).toBe(0);
      expect(designerNet).toBe(0);
    });
  });
});
