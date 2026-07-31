import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "MatchFIT — Five-Pillar Football Programme",
  description:
    "Gamified drills, fair-minutes rotations and competitive small-sided matches — plan, run and track football sessions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
