"use client";

/**
 * Phone OTP verification screen.
 * Two steps: (1) enter phone -> send code, (2) enter 6-digit code -> verify.
 *
 * Query params (both optional):
 *   ?phone=9876543210   pre-fills the phone and jumps straight to the code step
 *   ?next=/some/path    where to go after a successful verify (default "/")
 *
 * Talks to /api/otp/send and /api/otp/verify (Supabase built-in SMS OTP).
 */
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { sendOtpSchema, verifyOtpSchema } from "@/lib/validation/otp";

const RESEND_SECONDS = 30;

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const initialPhone = params.get("phone") || "";

  const [step, setStep] = useState<"phone" | "code">(
    initialPhone ? "code" : "phone"
  );
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(initialPhone ? RESEND_SECONDS : 0);
  const sentOnce = useRef(false);

  // countdown for the resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = async (targetPhone: string) => {
    setError("");
    setInfo("");
    const parsed = sendOtpSchema.safeParse({ phone: targetPhone });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Could not send the code.");
        setBusy(false);
        return;
      }
      setStep("code");
      setCooldown(RESEND_SECONDS);
      setInfo(`We sent a 6-digit code to +91 ${targetPhone}.`);
    } catch {
      setError("Could not reach /api/otp/send. Is the backend configured?");
    }
    setBusy(false);
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = verifyOtpSchema.safeParse({ phone, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "The code is incorrect or has expired.");
        setBusy(false);
        return;
      }
      router.push(next);
    } catch {
      setError("Could not reach /api/otp/verify. Is the backend configured?");
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className="card">
        <div className="brand">
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>

        {step === "phone" ? (
          <>
            <h1 className="title">Verify your phone</h1>
            <p className="subtitle">
              We&rsquo;ll text you a 6-digit code to confirm your number.
            </p>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="9876543210"
              />
              <div className="hint">10-digit Indian mobile number</div>
            </div>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => sendCode(phone)}
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </>
        ) : (
          <>
            <h1 className="title">Enter the code</h1>
            <p className="subtitle">
              {info || `Enter the 6-digit code sent to +91 ${phone}.`}
            </p>
            {error && <div className="form-error">{error}</div>}
            <form onSubmit={verifyCode}>
              <div className="field">
                <label htmlFor="code">Verification code</label>
                <input
                  id="code"
                  className="otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Verifying…" : "Verify"}
              </button>
            </form>

            <p className="foot-note">
              Didn&rsquo;t get it?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => sendCode(phone)}
                >
                  Resend code
                </button>
              )}
              {" · "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError("");
                }}
              >
                Change number
              </button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <VerifyInner />
    </Suspense>
  );
}
