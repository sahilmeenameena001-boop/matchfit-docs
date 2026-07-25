import { NextResponse } from "next/server";

/** Standard success envelope: { success: true, data }. */
export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ success: true, data }, { status });

/** Standard error envelope: { success: false, error: { code, message } }. */
export const fail = (code: string, message: string, status = 400) =>
  NextResponse.json({ success: false, error: { code, message } }, { status });
