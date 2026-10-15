import { describe, it, expect } from "vitest";
import {
  MIN_WITHDRAWAL_AMOUNT,
  BI_FAST_TRANSFER_FEE,
  WITHDRAWAL_NOTICE_TEXT,
  generateWithdrawalNoticeText,
  isFreeTransferChannel,
  calculateWithdrawalFee,
  calculateNetAmount,
} from "../../src/lib/constants/withdrawal";

describe("Designer Withdrawal Constants & Business Rules", () => {
  it("enforces minimum withdrawal amount of Rp10.000", () => {
    expect(MIN_WITHDRAWAL_AMOUNT).toBe(10000);
  });

  it("enforces BI-FAST transfer fee of Rp4.000 for non-BCA/DANA channels", () => {
    expect(BI_FAST_TRANSFER_FEE).toBe(4000);
  });

  it("matches the exact required notice text without any paraphrasing", () => {
    expect(WITHDRAWAL_NOTICE_TEXT).toBe(
      "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
    );
  });

  it("identifies BCA and DANA as free transfer channels", () => {
    expect(isFreeTransferChannel("BCA")).toBe(true);
    expect(isFreeTransferChannel("Bank Central Asia (BCA)")).toBe(true);
    expect(isFreeTransferChannel("DANA")).toBe(true);
    expect(isFreeTransferChannel("DANA (Uang Elektronik)")).toBe(true);
  });

  it("identifies other banks and e-wallets as requiring transfer fee", () => {
    expect(isFreeTransferChannel("Bank Mandiri")).toBe(false);
    expect(isFreeTransferChannel("Bank Rakyat Indonesia (BRI)")).toBe(false);
    expect(isFreeTransferChannel("GoPay (Uang Elektronik)")).toBe(false);
    expect(isFreeTransferChannel("OVO (Uang Elektronik)")).toBe(false);
    expect(isFreeTransferChannel("SeaBank Indonesia")).toBe(false);
    expect(isFreeTransferChannel("Bank Jago")).toBe(false);
  });

  it("calculates correct transfer fees (Rp0 for BCA & DANA, Rp4.000 for others)", () => {
    expect(calculateWithdrawalFee("BCA")).toBe(0);
    expect(calculateWithdrawalFee("Bank Central Asia (BCA)")).toBe(0);
    expect(calculateWithdrawalFee("DANA")).toBe(0);
    expect(calculateWithdrawalFee("Bank Mandiri")).toBe(4000);
    expect(calculateWithdrawalFee("GOPAY")).toBe(4000);
    expect(calculateWithdrawalFee("ShopeePay (Uang Elektronik)")).toBe(4000);
  });

  it("calculates net amount accurately after deducting transfer fee", () => {
    // Penarikan Rp50.000 ke BCA -> Bersih Rp50.000
    expect(calculateNetAmount(50000, "BCA")).toBe(50000);
    // Penarikan Rp50.000 ke Mandiri -> Bersih Rp46.000
    expect(calculateNetAmount(50000, "Bank Mandiri")).toBe(46000);
    // Penarikan minimal Rp10.000 ke DANA -> Bersih Rp10.000
    expect(calculateNetAmount(10000, "DANA")).toBe(10000);
    // Penarikan minimal Rp10.000 ke bank lain -> Bersih Rp6.000
    expect(calculateNetAmount(10000, "Bank Rakyat Indonesia (BRI)")).toBe(6000);
  });

  it("detects zero or negative net amount if nominal is less than or equal to transfer fee", () => {
    expect(calculateNetAmount(4000, "Bank Mandiri")).toBe(0);
    expect(calculateNetAmount(3000, "Bank Mandiri")).toBe(-1000);
  });
});

describe("Dynamic Withdrawal Settings & Template Generation", () => {
  it("generates exact default notice text matching user requirement", () => {
    const generated = generateWithdrawalNoticeText();
    expect(generated).toBe(
      "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
    );
  });

  it("updates notice dynamically when min_withdrawal is changed to Rp20.000", () => {
    const generated = generateWithdrawalNoticeText({
      minWithdrawal: 20000,
    });
    expect(generated).toBe(
      "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp20.000. Ke BCA & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
    );
  });

  it("updates notice dynamically when free destination is changed from BCA to BRI", () => {
    const generated = generateWithdrawalNoticeText({
      minWithdrawal: 10000,
      defaultFee: 4000,
      freeDestinations: ["BRI", "DANA"],
      feeOverrides: [
        { destination: "BRI", fee: 0 },
        { destination: "DANA", fee: 0 },
      ],
    });
    expect(generated).toBe(
      "Penarikan dikirim manual oleh admin ke rekening pencairanmu, biasanya di hari yang sama. Minimal Rp10.000. Ke BRI & DANA gratis; ke bank/e-wallet lain biaya transfer BI-FAST Rp4.000"
    );
  });

  it("calculates fee based on custom fee_overrides per destination", () => {
    const customSettings = {
      minWithdrawal: 10000,
      defaultFee: 4000,
      freeDestinations: ["DANA"],
      feeOverrides: [
        { destination: "DANA", fee: 0 },
        { destination: "BRI", fee: 2500 },
        { destination: "BCA", fee: 1000 },
      ],
    };

    expect(calculateWithdrawalFee("DANA", customSettings)).toBe(0);
    expect(calculateWithdrawalFee("BRI (Bank Rakyat Indonesia)", customSettings)).toBe(2500);
    expect(calculateWithdrawalFee("BCA", customSettings)).toBe(1000);
    expect(calculateWithdrawalFee("Bank Mandiri", customSettings)).toBe(4000);
  });

  it("calculates net amount accurately with custom fee overrides", () => {
    const customSettings = {
      minWithdrawal: 10000,
      defaultFee: 4000,
      freeDestinations: ["DANA"],
      feeOverrides: [
        { destination: "BRI", fee: 2500 },
      ],
    };

    // Penarikan Rp50.000 ke BRI dengan fee Rp2.500 -> Rp47.500
    expect(calculateNetAmount(50000, "Bank Rakyat Indonesia (BRI)", customSettings)).toBe(47500);
  });
});
