"use client";

/**
 * STEP 2 of 2 — Profile.
 * Collects the physical + playing profile, computes BMI/age live, then submits
 * the full payload (account + profile) to POST /api/signup, which creates the
 * auth user, writes the players row, and registers today's session.
 *
 * If Step 1 was skipped (no account in context), the user is sent back to /signup.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENDERS,
  PLAYING_CATEGORIES,
  POSITIONS,
  FEET,
  EXPERIENCE_LEVELS,
  LIMITS,
  toCm,
  lbToKg,
  calcBmi,
  ageFromDob,
} from "@/lib/constants";
import { profileSchema, type SignupPayload } from "@/lib/validation/signup";
import { useSignup } from "@/lib/signup/SignupProvider";

type Errors = Record<string, string>;

export default function ProfileStep() {
  const router = useRouter();
  const { account, profile, setProfile, reset } = useSignup();

  // Guard: must have completed Step 1.
  useEffect(() => {
    if (account === null) {
      const t = setTimeout(() => {
        // account may still be hydrating from sessionStorage on first paint
        if (useSignupHasNoAccount()) router.replace("/signup");
      }, 50);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const [form, setForm] = useState({
    dateOfBirth: profile.dateOfBirth ?? "",
    gender: profile.gender ?? "",
    heightCm: profile.heightCm ?? "",
    weightKg: profile.weightKg ?? "",
    playingCategory: profile.playingCategory ?? "",
    preferredPosition: profile.preferredPosition ?? "",
    preferredFoot: profile.preferredFoot ?? "",
    experienceLevel: profile.experienceLevel ?? "",
    experienceYears: profile.experienceYears ?? "",
    existingInjury: profile.existingInjury ?? "",
    jointPainMovement: profile.jointPainMovement ?? "",
    medicalCondition: profile.medicalCondition ?? "",
    emergencyContactName: profile.emergencyContactName ?? "",
    emergencyContactPhone: profile.emergencyContactPhone ?? "",
  });
  const [heightUnit, setHeightUnit] = useState<"cm" | "ftin">("cm");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [lb, setLb] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (k: string, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Keep metric height in sync when using ft/in.
  const applyFtIn = (feet: string, inches: string) => {
    setFt(feet);
    setInch(inches);
    const f = parseFloat(feet) || 0;
    const i = parseFloat(inches) || 0;
    set("heightCm", f || i ? Math.round(toCm(f, i) * 10) / 10 : "");
  };
  const applyLb = (val: string) => {
    setLb(val);
    const n = parseFloat(val);
    set("weightKg", isNaN(n) ? "" : Math.round(lbToKg(n) * 10) / 10);
  };

  const age = useMemo(() => ageFromDob(form.dateOfBirth), [form.dateOfBirth]);
  const bmi = useMemo(
    () => calcBmi(Number(form.weightKg), Number(form.heightCm)),
    [form.weightKg, form.heightCm]
  );

  const cls = (k: string) => (errors[k] ? "invalid" : "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // coerce numeric fields
    const candidate = {
      ...form,
      heightCm: form.heightCm === "" ? undefined : Number(form.heightCm),
      weightKg: form.weightKg === "" ? undefined : Number(form.weightKg),
      experienceYears:
        form.experienceYears === "" ? undefined : Number(form.experienceYears),
      preferredPosition: form.preferredPosition || undefined,
      preferredFoot: form.preferredFoot || undefined,
      experienceLevel: form.experienceLevel || undefined,
      existingInjury: form.existingInjury || undefined,
      jointPainMovement: form.jointPainMovement || undefined,
      medicalCondition: form.medicalCondition || undefined,
    };

    const result = profileSchema.safeParse(candidate);
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
    setProfile(result.data);

    if (!account) {
      router.replace("/signup");
      return;
    }

    const payload: SignupPayload = { account, profile: result.data };

    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSubmitError(
          json?.error?.message ?? "Something went wrong. Please try again."
        );
        setSubmitting(false);
        return;
      }
      reset();
      const playerId = json.data?.playerId ?? "";
      router.push(`/signup/complete${playerId ? `?player=${playerId}` : ""}`);
    } catch {
      // Backend not wired yet? Surface a clear message for the dev.
      setSubmitError(
        "Could not reach /api/signup. If the backend isn't built yet, this is expected — the form data is valid and ready to send."
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

        <div className="stepper">
          <span className="step active" />
          <span className="step active" />
        </div>
        <div className="step-label">Step 2 of 2 · Your player profile</div>

        {submitError && <div className="form-error">{submitError}</div>}

        {/* Date of birth */}
        <div className="field">
          <label htmlFor="dob">Date of birth</label>
          <input
            id="dob"
            type="date"
            className={cls("dateOfBirth")}
            value={form.dateOfBirth}
            onChange={(e) => set("dateOfBirth", e.target.value)}
          />
          {errors.dateOfBirth && (
            <div className="err">{errors.dateOfBirth}</div>
          )}
        </div>

        {/* Gender */}
        <div className="field">
          <label>Gender</label>
          <div className="segmented">
            {GENDERS.map((g) => (
              <button
                type="button"
                key={g.value}
                className={form.gender === g.value ? "selected" : ""}
                onClick={() => set("gender", g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
          {errors.gender && <div className="err">{errors.gender}</div>}
        </div>

        {/* Height + Weight */}
        <div className="row">
          <div className="field">
            <div className="label-row">
              <label htmlFor="height">Height</label>
              <span className="unit-toggle">
                <button
                  type="button"
                  className={heightUnit === "cm" ? "on" : ""}
                  onClick={() => setHeightUnit("cm")}
                >
                  cm
                </button>
                <button
                  type="button"
                  className={heightUnit === "ftin" ? "on" : ""}
                  onClick={() => setHeightUnit("ftin")}
                >
                  ft/in
                </button>
              </span>
            </div>
            {heightUnit === "cm" ? (
              <input
                id="height"
                type="number"
                inputMode="decimal"
                className={cls("heightCm")}
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                placeholder={`${LIMITS.heightCm.min}–${LIMITS.heightCm.max}`}
              />
            ) : (
              <div className="row">
                <input
                  type="number"
                  className={cls("heightCm")}
                  value={ft}
                  onChange={(e) => applyFtIn(e.target.value, inch)}
                  placeholder="ft"
                />
                <input
                  type="number"
                  className={cls("heightCm")}
                  value={inch}
                  onChange={(e) => applyFtIn(ft, e.target.value)}
                  placeholder="in"
                />
              </div>
            )}
            {errors.heightCm && <div className="err">{errors.heightCm}</div>}
          </div>

          <div className="field">
            <div className="label-row">
              <label htmlFor="weight">Weight</label>
              <span className="unit-toggle">
                <button
                  type="button"
                  className={weightUnit === "kg" ? "on" : ""}
                  onClick={() => setWeightUnit("kg")}
                >
                  kg
                </button>
                <button
                  type="button"
                  className={weightUnit === "lb" ? "on" : ""}
                  onClick={() => setWeightUnit("lb")}
                >
                  lb
                </button>
              </span>
            </div>
            {weightUnit === "kg" ? (
              <input
                id="weight"
                type="number"
                inputMode="decimal"
                className={cls("weightKg")}
                value={form.weightKg}
                onChange={(e) => set("weightKg", e.target.value)}
                placeholder={`${LIMITS.weightKg.min}–${LIMITS.weightKg.max}`}
              />
            ) : (
              <input
                type="number"
                inputMode="decimal"
                className={cls("weightKg")}
                value={lb}
                onChange={(e) => applyLb(e.target.value)}
                placeholder="lb"
              />
            )}
            {errors.weightKg && <div className="err">{errors.weightKg}</div>}
          </div>
        </div>

        {/* Derived readout */}
        {(age !== null || bmi !== null) && (
          <div className="readout">
            {age !== null && (
              <span>
                Age: <b>{age}</b>
              </span>
            )}
            {bmi !== null && (
              <span>
                BMI: <b>{bmi}</b>
              </span>
            )}
          </div>
        )}

        {/* Playing category */}
        <div className="field">
          <label>Playing category</label>
          <div className="segmented">
            {PLAYING_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.value}
                className={form.playingCategory === c.value ? "selected" : ""}
                onClick={() => set("playingCategory", c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.playingCategory && (
            <div className="err">{errors.playingCategory}</div>
          )}
        </div>

        {/* Position + Foot */}
        <div className="row">
          <div className="field">
            <label htmlFor="position">
              Preferred position <span className="opt">(optional)</span>
            </label>
            <select
              id="position"
              value={form.preferredPosition}
              onChange={(e) => set("preferredPosition", e.target.value)}
            >
              <option value="">Select…</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="foot">
              Preferred foot <span className="opt">(optional)</span>
            </label>
            <select
              id="foot"
              value={form.preferredFoot}
              onChange={(e) => set("preferredFoot", e.target.value)}
            >
              <option value="">Select…</option>
              {FEET.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Experience */}
        <div className="row">
          <div className="field">
            <label htmlFor="exp">
              Experience level <span className="opt">(optional)</span>
            </label>
            <select
              id="exp"
              value={form.experienceLevel}
              onChange={(e) => set("experienceLevel", e.target.value)}
            >
              <option value="">Select…</option>
              {EXPERIENCE_LEVELS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="years">
              Years playing <span className="opt">(optional)</span>
            </label>
            <input
              id="years"
              type="number"
              inputMode="numeric"
              value={form.experienceYears}
              onChange={(e) => set("experienceYears", e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Health & injury — structured, optional, private */}
        <div className="section-label">
          Health &amp; injury <span className="opt">(optional · private, shared only with your coach)</span>
        </div>

        <div className="field">
          <label htmlFor="existingInjury">Existing injury</label>
          <textarea
            id="existingInjury"
            className={cls("existingInjury")}
            value={form.existingInjury}
            maxLength={LIMITS.healthNoteMax}
            onChange={(e) => set("existingInjury", e.target.value)}
            placeholder="e.g. Recovering from a hamstring strain (left leg), 3 weeks ago"
          />
          {errors.existingInjury && (
            <div className="err">{errors.existingInjury}</div>
          )}
        </div>

        <div className="field">
          <label htmlFor="jointPain">Current pain / movement in joints</label>
          <textarea
            id="jointPain"
            className={cls("jointPainMovement")}
            value={form.jointPainMovement}
            maxLength={LIMITS.healthNoteMax}
            onChange={(e) => set("jointPainMovement", e.target.value)}
            placeholder="e.g. Mild pain in right knee when bending; stiff ankle in the morning"
          />
          {errors.jointPainMovement && (
            <div className="err">{errors.jointPainMovement}</div>
          )}
        </div>

        <div className="field">
          <label htmlFor="medicalCondition">Medical condition</label>
          <textarea
            id="medicalCondition"
            className={cls("medicalCondition")}
            value={form.medicalCondition}
            maxLength={LIMITS.healthNoteMax}
            onChange={(e) => set("medicalCondition", e.target.value)}
            placeholder="e.g. Asthma (carry inhaler), mild hypertension — anything the coach should know"
          />
          {errors.medicalCondition && (
            <div className="err">{errors.medicalCondition}</div>
          )}
        </div>

        {/* Emergency contact */}
        <div className="row">
          <div className="field">
            <label htmlFor="ecName">Emergency contact name</label>
            <input
              id="ecName"
              className={cls("emergencyContactName")}
              value={form.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
              placeholder="Riya Sharma"
            />
            {errors.emergencyContactName && (
              <div className="err">{errors.emergencyContactName}</div>
            )}
          </div>
          <div className="field">
            <label htmlFor="ecPhone">Emergency contact phone</label>
            <input
              id="ecPhone"
              type="tel"
              inputMode="numeric"
              className={cls("emergencyContactPhone")}
              value={form.emergencyContactPhone}
              onChange={(e) =>
                set(
                  "emergencyContactPhone",
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              placeholder="9876500000"
            />
            {errors.emergencyContactPhone && (
              <div className="err">{errors.emergencyContactPhone}</div>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.push("/signup")}
          >
            Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create profile"}
          </button>
        </div>
      </form>
    </main>
  );
}

/** Reads the persisted flag without a hook (used inside a timeout). */
function useSignupHasNoAccount() {
  try {
    const raw = sessionStorage.getItem("matchfit.signup");
    if (!raw) return true;
    return !JSON.parse(raw).account;
  } catch {
    return true;
  }
}
