import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JokiDay - Marketplace Freelancer Desain",
  description:
    "Marketplace freelancer desain terverifikasi. Pesan desain langsung, transaksi aman, dan hasil tersimpan rapi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased bg-background text-text selection:bg-primary-soft selection:text-primary">
        {children}
      </body>
    </html>
  );
}
