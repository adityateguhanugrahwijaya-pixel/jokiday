import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/server/auth/auth.service";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Berhasil keluar" });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
