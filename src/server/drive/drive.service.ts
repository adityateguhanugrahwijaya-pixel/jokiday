import { decryptToken } from "@/lib/crypto";
import { AppError } from "@/lib/errors";

export interface DriveUploadParams {
  refreshTokenEnc: string;
  folderId?: string;
  fileName: string;
  mimeType: string;
  streamOrBuffer: Buffer;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink?: string;
  webContentLink?: string;
  sizeBytes?: number;
}

export interface DesignerFoldersResult {
  rootFolderId: string;
  portfolioFolderId?: string;
  previewsFolderId?: string;
  ordersFolderId?: string;
}

export class DriveService {
  private static clientId = process.env.GOOGLE_CLIENT_ID || "";
  private static clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  /**
   * Menukar refresh_token desainer dengan access_token segar dari Google OAuth2
   */
  static async getAccessToken(refreshToken: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new AppError(
        "Kredensial GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di server",
        "GOOGLE_CONFIG_MISSING",
        500
      );
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new AppError(
        `Gagal memperbarui access_token Google Drive: ${response.statusText} (${errBody})`,
        "DRIVE_TOKEN_REFRESH_FAILED",
        502
      );
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Mencari folder berdasarkan nama di dalam parent tertentu, atau membuatnya jika belum ada
   */
  static async ensureFolder(
    accessToken: string,
    folderName: string,
    parentId?: string
  ): Promise<string> {
    // 1. Cari apakah folder dengan nama ini sudah ada
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    // 2. Jika belum ada, buat folder baru
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new AppError(
        `Gagal membuat folder Google Drive '${folderName}': ${errText}`,
        "DRIVE_FOLDER_CREATE_FAILED",
        502
      );
    }

    const createData = await createRes.json();
    return createData.id;
  }

  /**
   * Menyiapkan struktur folder JokiDay di Google Drive milik desainer:
   * JokiDay/
   * ├── portfolio/
   * ├── previews/
   * └── orders/
   */
  static async setupDesignerFolders(refreshTokenEnc: string): Promise<DesignerFoldersResult> {
    const refreshToken = decryptToken(refreshTokenEnc);
    const accessToken = await this.getAccessToken(refreshToken);

    // Buat folder root "JokiDay"
    const rootFolderId = await this.ensureFolder(accessToken, "JokiDay");

    // Buat subfolder terstruktur
    const [portfolioFolderId, previewsFolderId, ordersFolderId] = await Promise.all([
      this.ensureFolder(accessToken, "portfolio", rootFolderId),
      this.ensureFolder(accessToken, "previews", rootFolderId),
      this.ensureFolder(accessToken, "orders", rootFolderId),
    ]);

    return {
      rootFolderId,
      portfolioFolderId,
      previewsFolderId,
      ordersFolderId,
    };
  }

  /**
   * Mengunggah file langsung ke Google Drive milik desainer menggunakan Multipart Upload v3
   */
  static async uploadFile(params: DriveUploadParams): Promise<DriveUploadResult> {
    try {
      const refreshToken = decryptToken(params.refreshTokenEnc);
      const accessToken = await this.getAccessToken(refreshToken);

      const metadata: Record<string, any> = {
        name: params.fileName,
      };
      if (params.folderId) {
        metadata.parents = [params.folderId];
      }

      const boundary = `-------jokiday_${Date.now()}`;
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}`;
      const mediaHeader = `${delimiter}Content-Type: ${params.mimeType}\r\n\r\n`;

      const multipartBody = Buffer.concat([
        Buffer.from(metadataPart, "utf8"),
        Buffer.from(mediaHeader, "utf8"),
        params.streamOrBuffer,
        Buffer.from(closeDelimiter, "utf8"),
      ]);

      const uploadUrl =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size";

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": String(multipartBody.length),
        },
        body: multipartBody,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new AppError(
          `Gagal mengunggah file ke Google Drive: ${res.statusText} (${errText})`,
          "DRIVE_UPLOAD_FAILED",
          502
        );
      }

      const uploaded = await res.json();
      return {
        fileId: uploaded.id,
        webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
        webContentLink: uploaded.webContentLink,
        sizeBytes: uploaded.size ? Number(uploaded.size) : params.streamOrBuffer.length,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(
        `Kesalahan saat memproses upload Google Drive: ${err?.message || "Unknown error"}`,
        "DRIVE_UPLOAD_FAILED",
        502,
        err
      );
    }
  }

  /**
   * Mengambil stream atau buffer file dari Google Drive untuk diserahkan ke pelanggan (proxy download)
   */
  static async downloadFile(
    refreshTokenEnc: string,
    fileId: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const refreshToken = decryptToken(refreshTokenEnc);
    const accessToken = await this.getAccessToken(refreshToken);

    // 1. Ambil metadata file (nama & mimeType)
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaRes.ok) {
      throw new AppError(
        `File tidak ditemukan di Google Drive desainer: ${metaRes.statusText}`,
        "DRIVE_FILE_NOT_FOUND",
        404
      );
    }

    const meta = await metaRes.json();

    // 2. Ambil binary file
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!contentRes.ok) {
      throw new AppError(
        `Gagal mengunduh konten file dari Google Drive: ${contentRes.statusText}`,
        "DRIVE_DOWNLOAD_FAILED",
        502
      );
    }

    const arrayBuffer = await contentRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: meta.mimeType || "application/octet-stream",
      fileName: meta.name || "download",
    };
  }

  /**
   * Menghapus file dari Google Drive desainer jika diperlukan
   */
  static async deleteFile(refreshTokenEnc: string, fileId: string): Promise<void> {
    const refreshToken = decryptToken(refreshTokenEnc);
    const accessToken = await this.getAccessToken(refreshToken);

    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
