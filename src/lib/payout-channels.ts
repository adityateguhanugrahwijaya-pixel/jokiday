export interface PayoutChannel {
  code: string;
  name: string;
  type: "BANK" | "EWALLET";
  category: "Bank Nasional" | "Bank Digital" | "Bank Syariah" | "Bank Swasta" | "E-Wallet / E-Money";
}

/**
 * Daftar resmi kanal perbankan dan uang elektronik (e-money) Indonesia
 * yang didukung untuk pencairan dana freelancer di JokiDay.
 */
export const PAYOUT_CHANNELS: PayoutChannel[] = [
  // Bank Nasional & Populer
  { code: "BCA", name: "Bank Central Asia (BCA)", type: "BANK", category: "Bank Nasional" },
  { code: "MANDIRI", name: "Bank Mandiri", type: "BANK", category: "Bank Nasional" },
  { code: "BRI", name: "Bank Rakyat Indonesia (BRI)", type: "BANK", category: "Bank Nasional" },
  { code: "BNI", name: "Bank Negara Indonesia (BNI)", type: "BANK", category: "Bank Nasional" },
  { code: "CIMB", name: "CIMB Niaga", type: "BANK", category: "Bank Nasional" },
  { code: "PERMATA", name: "Bank Permata", type: "BANK", category: "Bank Nasional" },
  { code: "DANAMON", name: "Bank Danamon", type: "BANK", category: "Bank Nasional" },
  { code: "BTN", name: "Bank Tabungan Negara (BTN)", type: "BANK", category: "Bank Nasional" },
  { code: "PANIN", name: "Panin Bank", type: "BANK", category: "Bank Swasta" },
  { code: "OCBC", name: "OCBC NISP", type: "BANK", category: "Bank Swasta" },
  { code: "SINARMAS", name: "Bank Sinarmas", type: "BANK", category: "Bank Swasta" },

  // Bank Syariah
  { code: "BSI", name: "Bank Syariah Indonesia (BSI)", type: "BANK", category: "Bank Syariah" },
  { code: "MUAMALAT", name: "Bank Muamalat", type: "BANK", category: "Bank Syariah" },

  // Bank Digital
  { code: "JAGO", name: "Bank Jago", type: "BANK", category: "Bank Digital" },
  { code: "SEABANK", name: "SeaBank Indonesia", type: "BANK", category: "Bank Digital" },
  { code: "JENIUS", name: "BTPN / Jenius", type: "BANK", category: "Bank Digital" },
  { code: "ALLO", name: "Allo Bank", type: "BANK", category: "Bank Digital" },
  { code: "BLU", name: "Blu by BCA Digital", type: "BANK", category: "Bank Digital" },
  { code: "LINE", name: "LINE Bank (KEB Hana)", type: "BANK", category: "Bank Digital" },

  // E-Wallet & E-Money
  { code: "GOPAY", name: "GoPay (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },
  { code: "DANA", name: "DANA (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },
  { code: "OVO", name: "OVO (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },
  { code: "SHOPEEPAY", name: "ShopeePay (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },
  { code: "LINKAJA", name: "LinkAja (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },
  { code: "ASTRAPAY", name: "AstraPay (Uang Elektronik)", type: "EWALLET", category: "E-Wallet / E-Money" },

  // Lainnya
  { code: "OTHER", name: "Bank Lainnya", type: "BANK", category: "Bank Swasta" },
];
