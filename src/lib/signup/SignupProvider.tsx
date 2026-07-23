"use client";

/**
 * Holds signup form state across the multi-page flow.
 * Data is mirrored to sessionStorage so a refresh on Page 2 does not lose Page 1.
 * (sessionStorage clears when the tab closes — fine for an in-progress signup.)
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AccountInput, ProfileInput } from "@/lib/validation/signup";

type AccountData = Omit<AccountInput, "confirmPassword"> | null;

type SignupState = {
  account: AccountData;
  profile: Partial<ProfileInput>;
  setAccount: (a: AccountData) => void;
  setProfile: (p: Partial<ProfileInput>) => void;
  reset: () => void;
};

const KEY = "matchfit.signup";
const SignupContext = createContext<SignupState | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<AccountData>(null);
  const [profile, setProfileState] = useState<Partial<ProfileInput>>({});

  // hydrate once on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAccountState(parsed.account ?? null);
        setProfileState(parsed.profile ?? {});
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = (account: AccountData, profile: Partial<ProfileInput>) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ account, profile }));
    } catch {
      /* storage may be unavailable */
    }
  };

  const setAccount = (a: AccountData) => {
    setAccountState(a);
    persist(a, profile);
  };
  const setProfile = (p: Partial<ProfileInput>) => {
    const next = { ...profile, ...p };
    setProfileState(next);
    persist(account, next);
  };
  const reset = () => {
    setAccountState(null);
    setProfileState({});
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <SignupContext.Provider
      value={{ account, profile, setAccount, setProfile, reset }}
    >
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup must be used inside <SignupProvider>");
  return ctx;
}
