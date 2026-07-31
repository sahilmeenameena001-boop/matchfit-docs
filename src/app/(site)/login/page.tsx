"use client";

/**
 * Login page.
 * Collects email + password, validates with loginSchema, then POSTs to /api/login.
 * On success it routes to the app (change `DEST` to your real post-login page).
 *
 * The backend (POST /api/login) is a STUB for now — see src/app/api/login/route.ts.
 * Krishay: replace it with Supabase `signInWithPassword`.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema } from "@/lib/validation/login";

type Errors = Record<string, string>;

// Where to send the user after a successful login.
const DEST = "/";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const cls = (k: string) => (errors[k] ? "invalid" : "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errs: Errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(
          json?.error?.message ?? "Incorrect email or password."
        );
        setSubmitting(false);
        return;
      }
      router.push(DEST);
    } catch {
      setFormError(
        "Could not reach /api/login. If the backend isn't built yet, this is expected."
      );
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <form className="card" onSubmit={onSubmit} noValidate>
        <div className="brand">
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>

        <h1 className="title">Welcome back</h1>
        <p className="subtitle">Log in to your MatchFIT account.</p>

        {formError && <div className="form-error">{formError}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={cls("email")}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
          />
          {errors.email && <div className="err">{errors.email}</div>}
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="password">Password</label>
            <button
              type="button"
              className="link-btn"
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            className={cls("password")}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••"
          />
          {errors.password && <div className="err">{errors.password}</div>}
        </div>

        <div className="field between">
          <label className="check">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) => set("rememberMe", e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <Link href="/forgot-password" className="link-inline">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>

        <p className="foot-note">
          New to MatchFIT? <Link href="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
