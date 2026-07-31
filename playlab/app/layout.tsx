import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "MatchFIT PlayLab",
  description:
    "Design, permutate, validate and score gamified football drills as structured game systems.",
};

/**
 * Browser extensions (MetaMask, Grammarly, …) inject attributes and scripts
 * into the page before React hydrates, which (a) triggers hydration-mismatch
 * warnings on <body> and (b) surfaces the extension's own errors in the dev
 * overlay. suppressHydrationWarning covers (a); the inline listener below
 * swallows errors whose stack originates in a chrome-extension:// script
 * before the overlay sees them — app errors still surface normally.
 */
const muteExtensionErrors = `(function () {
  var ext = function (s) { return typeof s === "string" && s.indexOf("chrome-extension://") !== -1; };
  window.addEventListener("error", function (e) {
    if (ext(e.filename) || (e.error && ext(String(e.error.stack || "")))) e.stopImmediatePropagation();
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var s = e.reason && (String(e.reason.stack || "") + String(e.reason.message || ""));
    if (ext(s) || /MetaMask/i.test(s || "")) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: muteExtensionErrors }} />
      </head>
      <body suppressHydrationWarning>
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
