"use client";

/**
 * STEP 1 of 2 — Account.
 * Collects: full name, email, phone, password (+confirm), consent.
 * On valid submit, saves to the shared signup context and routes to /signup/profile.
 * No network call happens here — the DB write occurs at the end of Step 2.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { accountSchema } from "@/lib/validation/signup";
import { useSignup } from "@/lib/signup/SignupProvider";

type Errors = Record<string, string>;

export default function AccountStep() {
  const router = useRouter();
  const { account, setAccount } = useSignup();

  const [form, setForm] = useState({
    fullName: account?.fullName ?? "",
    email: account?.email ?? "",
    phone: account?.phone ?? "",
    password: "",
    confirmPassword: "",
    consentGiven: account?.consentGiven ?? false,
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = accountSchema.safeParse(form);
    if (!result.success) {
      const errs: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    // strip confirmPassword before storing
    const { confirmPassword, ...account } = result.data;
    setAccount(account);
    router.push("/signup/profile");
  };

  const cls = (k: string) => (errors[k] ? "invalid" : "");

  return (
    <main className="page">
      <form className="card" onSubmit={onSubmit} noValidate>
        <div className="brand">
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>

        <div className="stepper">
          <span className="step active" />
          <span className="step" />
        </div>
        <div className="step-label">Step 1 of 2 · Create your account</div>

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            className={cls("fullName")}
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Aman Sharma"
          />
          {errors.fullName && <div className="err">{errors.fullName}</div>}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className={cls("email")}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
          />
          {errors.email && <div className="err">{errors.email}</div>}
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            className={cls("phone")}
            value={form.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="9876543210"
          />
          {errors.phone ? (
            <div className="err">{errors.phone}</div>
          ) : (
            <div className="hint">10-digit Indian mobile number</div>
          )}
        </div>

        <div className="row">
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className={cls("password")}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
            />
            {errors.password && <div className="err">{errors.password}</div>}
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm</label>
            <input
              id="confirmPassword"
              type="password"
              className={cls("confirmPassword")}
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <div className="err">{errors.confirmPassword}</div>
            )}
          </div>
        </div>

        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => set("consentGiven", e.target.checked)}
            />
            <span>
              I agree to the MatchFIT terms and consent to my data being used for
              the activation session.
            </span>
          </label>
          {errors.consentGiven && (
            <div className="err">{errors.consentGiven}</div>
          )}
        </div>

        <button type="submit" className="btn btn-primary">
          Continue
        </button>

        <p className="foot-note">
          Already registered? <Link href="/login">Log in</Link>
        </p>
      </form>
    </main>
  );
}
