import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "MatchFIT PlayLab",
  description:
    "Design, permutate, validate and score gamified football drills as structured game systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
