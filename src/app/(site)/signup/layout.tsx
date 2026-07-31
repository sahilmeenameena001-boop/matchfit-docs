import { SignupProvider } from "@/lib/signup/SignupProvider";

/**
 * Wraps every step of the signup flow so form state is shared between
 * /signup (account) and /signup/profile (profile).
 */
export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SignupProvider>{children}</SignupProvider>;
}
