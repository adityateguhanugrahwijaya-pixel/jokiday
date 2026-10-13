import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/server/auth/auth.service";
import { LedgerService } from "@/server/ledger/ledger.service";
import { WaroengPayGateway } from "@/server/payment/waroengpay.gateway";
import { prisma } from "@/lib/db";
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat melihat laporan rekonsiliasi keuangan");
    }

    const report = await LedgerService.getReconciliationReport();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getCurrentUser();
    if (!session) {
      throw new UnauthorizedError("Autentikasi administrator diperlukan");
    }
    if (!session.isAdmin) {
      throw new ForbiddenError("Hanya administrator yang dapat memperbarui audit saldo gateway");
    }

    const body = await req.json();
    const { actualBalance, resetAuto, fetchLive } = body;

    if (fetchLive) {
      const gateway = new WaroengPayGateway();
      const live = await gateway.getBalance();
      const totalLive = (live.available || 0) + (live.held || 0);

      await prisma.appConfig.upsert({
        where: { key: "waroengpay_actual_balance" },
        update: {
          value: totalLive.toString(),
          description: `Live balance ditarik otomatis dari API WaroengPay (available: ${live.available}, held: ${live.held}) pada ${new Date().toISOString()}`,
          updatedAt: new Date(),
        },
        create: {
          key: "waroengpay_actual_balance",
          value: totalLive.toString(),
          description: `Live balance ditarik otomatis dari API WaroengPay (available: ${live.available}, held: ${live.held}) pada ${new Date().toISOString()}`,
        },
      });

      const report = await LedgerService.getReconciliationReport();

      return NextResponse.json({
        success: true,
        message: `Saldo live berhasil ditarik dari WaroengPay API (${live.currency} ${totalLive.toLocaleString("id-ID")})`,
        live,
        report,
      });
    }

    if (resetAuto) {
      // Hapus override manual agar kembali membaca otomatis dari kas GATEWAY_CLEARING
      await prisma.appConfig.deleteMany({
        where: { key: "waroengpay_actual_balance" },
      });
    } else {
      const balanceNum = parseInt(actualBalance, 10);
      if (isNaN(balanceNum) || balanceNum < 0) {
        throw new ValidationError("Nominal saldo riil WaroengPay harus berupa angka positif");
      }

      await prisma.appConfig.upsert({
        where: { key: "waroengpay_actual_balance" },
        update: {
          value: balanceNum.toString(),
          description: `Saldo riil WaroengPay diinput oleh admin ${session.email} pada ${new Date().toISOString()}`,
          updatedAt: new Date(),
        },
        create: {
          key: "waroengpay_actual_balance",
          value: balanceNum.toString(),
          description: `Saldo riil WaroengPay diinput oleh admin ${session.email} pada ${new Date().toISOString()}`,
        },
      });
    }

    const report = await LedgerService.getReconciliationReport();

    return NextResponse.json({
      success: true,
      message: resetAuto
        ? "Audit dikembalikan ke sinkronisasi otomatis buku besar."
        : "Saldo riil kas WaroengPay berhasil diperbarui dan direkonsiliasi.",
      report,
    });
  } catch (err) {
    const { status, body } = handleApiError(err);
    return NextResponse.json(body, { status });
  }
}
