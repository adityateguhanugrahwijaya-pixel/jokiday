import { AppError } from "@/lib/errors";
import { getAppUrl } from "@/lib/app-url";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  id: string;
  success: boolean;
}

export class EmailService {
  private static apiKey = process.env.EMAIL_API_KEY || "";
  private static fromEmail =
    process.env.EMAIL_FROM || "JokiDay <noreply@jokiday.agentkikir.cloud>";

  /**
   * Mengirim email transaksional melalui Resend REST API
   */
  static async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const key = this.apiKey || process.env.EMAIL_API_KEY || "";
    if (!key || key.startsWith("mock-")) {
      console.warn("[EmailService] Kunci EMAIL_API_KEY belum disetel atau masih bernilai mock");
      return { id: `mock_${Date.now()}`, success: false };
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const fromAddress = this.fromEmail || process.env.EMAIL_FROM || "JokiDay <noreply@jokiday.agentkikir.cloud>";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[EmailService] Gagal mengirim email via Resend:", response.status, errText);
        throw new AppError(
          `Gagal mengirim email: ${response.statusText} (${errText})`,
          "EMAIL_SEND_FAILED",
          response.status
        );
      }

      const data = await response.json();
      return {
        id: data.id,
        success: true,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Kesalahan saat memproses pengiriman email: ${err?.message || "Unknown error"}`,
        "EMAIL_SERVICE_ERROR",
        500,
        err
      );
    }
  }

  /**
   * Template email: Notifikasi Pesanan Baru & Lunas ke Desainer
   */
  static async sendOrderPaidNotification(data: {
    designerEmail: string;
    designerName: string;
    customerName: string;
    orderId: string;
    briefTitle: string;
    price: number;
    durationDays: number;
  }) {
    const appUrl = getAppUrl();
    const orderUrl = `${appUrl}/orders/${data.orderId}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <span style="font-size: 20px; font-weight: 800; color: #1d4ed8;">JokiDay</span>
        </div>
        <h2 style="font-size: 18px; color: #0b1f4a; margin-top: 0;">Halo kak ${data.designerName}!</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Pelanggan <strong>${data.customerName}</strong> telah menyelesaikan pembayaran untuk pesanan:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #0f172a;">${data.briefTitle}</p>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Nominal: <strong>Rp${data.price.toLocaleString("id-ID")}</strong> (Escrow Terlindungi)</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Durasi Pengerjaan: ${data.durationDays} hari</p>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Tenggat waktu pengerjaan telah dimulai. Silakan koordinasikan detail konsep melalui ruang obrolan dan serahkan hasil desain sebelum batas waktu.
        </p>
        <div style="margin: 24px 0;">
          <a href="${orderUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 10px 20px; border-radius: 6px; display: inline-block;">
            Buka Halaman Pesanan
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Email ini dikirim otomatis oleh sistem escrow JokiDay (AgentKikir). Jangan membagikan file di luar platform untuk melindungi hak pembayaran Anda.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.designerEmail,
      subject: `[JokiDay] Pembayaran Diterima: Pesanan "${data.briefTitle}" Siap Dikerjakan`,
      html,
    });
  }

  /**
   * Template email: Notifikasi Hasil Desain Dikirim ke Pelanggan
   */
  static async sendDeliveryNotification(data: {
    customerEmail: string;
    customerName: string;
    designerName: string;
    orderId: string;
    briefTitle: string;
    round: number;
  }) {
    const appUrl = getAppUrl();
    const orderUrl = `${appUrl}/orders/${data.orderId}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <span style="font-size: 20px; font-weight: 800; color: #1d4ed8;">JokiDay</span>
        </div>
        <h2 style="font-size: 18px; color: #0b1f4a; margin-top: 0;">Halo kak ${data.customerName}!</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Desainer <strong>${data.designerName}</strong> telah mengirimkan hasil pengerjaan desain untuk putaran ke-${data.round} pada pesanan:
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a;">${data.briefTitle}</p>
        </div>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Silakan periksa pratinjau hasil desain yang telah dilindungi watermark di platform. Anda memiliki waktu 3 hari untuk menyetujui hasil atau mengajukan catatan revisi.
        </p>
        <div style="margin: 24px 0;">
          <a href="${orderUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 10px 20px; border-radius: 6px; display: inline-block;">
            Periksa Hasil Desain
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Jika tidak ada respons dalam 3x24 jam, sistem escrow akan secara otomatis menyetujui pesanan sesuai Syarat dan Ketentuan JokiDay.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.customerEmail,
      subject: `[JokiDay] Hasil Desain Putaran ${data.round} Siap Ditinjau: "${data.briefTitle}"`,
      html,
    });
  }

  /**
   * Template email: Undangan Pendaftaran Desainer Eksklusif (Invite-Only)
   */
  static async sendInviteEmail(data: {
    toEmail: string;
    inviteeName: string;
    inviteUrl: string;
    expiresAt: string;
  }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <span style="font-size: 20px; font-weight: 800; color: #1d4ed8;">JokiDay</span>
        </div>
        <h2 style="font-size: 18px; color: #0b1f4a; margin-top: 0;">Undangan Bergabung sebagai Desainer JokiDay</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Halo <strong>${data.inviteeName}</strong>, Anda telah menerima undangan khusus satu kali pakai untuk bergabung dan membuka jasa desain di JokiDay.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Di JokiDay, setiap transaksi dilindungi sistem escrow otomatis, dan file master hasil karya Anda tersimpan langsung di Google Drive pribadi Anda.
        </p>
        <div style="margin: 24px 0;">
          <a href="${data.inviteUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            Buka Akun Desainer Sekarang
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b;">
          Tautan ini berlaku hingga: <strong>${new Date(data.expiresAt).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Jika Anda tidak merasa meminta undangan ini, silakan abaikan pesan ini.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.toEmail,
      subject: `[JokiDay] Undangan Eksklusif Desainer untuk ${data.inviteeName}`,
      html,
    });
  }

  /**
   * Template email: Permintaan Reset Kata Sandi
   */
  static async sendPasswordResetEmail(data: {
    toEmail: string;
    userName: string;
    resetUrl: string;
    expiresMinutes?: number;
  }) {
    const minutes = data.expiresMinutes || 30;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="margin-bottom: 20px;">
          <span style="font-size: 20px; font-weight: 800; color: #1d4ed8;">JokiDay</span>
        </div>
        <h2 style="font-size: 18px; color: #0b1f4a; margin-top: 0;">Permintaan Atur Ulang Kata Sandi</h2>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Halo <strong>${data.userName}</strong>, kami menerima permintaan untuk mengatur ulang kata sandi akun JokiDay Anda.
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Silakan klik tombol di bawah ini untuk membuat kata sandi baru. Tautan ini hanya berlaku selama <strong>${minutes} menit</strong> demi keamanan akun Anda.
        </p>
        <div style="margin: 24px 0;">
          <a href="${data.resetUrl}" style="background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 24px; border-radius: 6px; display: inline-block;">
            Atur Ulang Kata Sandi
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5;">
          Atau salin tautan berikut ke browser Anda:<br/>
          <a href="${data.resetUrl}" style="color: #1d4ed8; word-break: break-all;">${data.resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          Jika Anda tidak merasa melakukan permintaan ini, Anda dapat mengabaikan email ini dengan aman. Kata sandi Anda tidak akan berubah sampai Anda membuat kata sandi baru melalui tautan di atas.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.toEmail,
      subject: "[JokiDay] Atur Ulang Kata Sandi Akun Anda",
      html,
    });
  }
}
