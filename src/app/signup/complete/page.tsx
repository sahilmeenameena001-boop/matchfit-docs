"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CompleteInner() {
  const params = useSearchParams();
  const playerId = params.get("player");

  return (
    <main className="page">
      <div className="card center">
        <div className="success-icon">✓</div>
        <h1 className="title">You&rsquo;re all set!</h1>
        <p className="subtitle">
          Your MatchFIT profile has been created and you&rsquo;re registered for
          today&rsquo;s session.
        </p>
        {playerId && (
          <Link
            href={`/player/${playerId}`}
            className="btn btn-primary"
            style={{ display: "block", textDecoration: "none", paddingTop: 13 }}
          >
            View my profile
          </Link>
        )}
        <p className="foot-note">
          Show your QR code at check-in when you arrive.
        </p>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <CompleteInner />
    </Suspense>
  );
}
