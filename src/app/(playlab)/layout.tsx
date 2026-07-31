import type { Metadata } from "next";
import "./playlab.css";
import { Sidebar } from "@/playlab/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "MatchFIT PlayLab",
  description:
    "Design, permutate, validate and score gamified football drills as structured game systems.",
};

/**
 * PlayLab root layout — a second root layout beside the main site's (site)
 * group, so PlayLab keeps its own dark-glass design system without touching
 * the main site's CSS. Browser extensions (MetaMask, …) inject into pages
 * before React hydrates; suppressHydrationWarning + the inline listener keep
 * their noise out of the dev overlay while real app errors still surface.
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

export default function PlayLabLayout({ children }: { children: React.ReactNode }) {
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
