"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addDrillToSessionAction } from "@/lib/actions";

export function AddToSessionButton({
  sessionId,
  drillId,
  children,
}: {
  sessionId: string;
  drillId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="btn-primary !px-3 !py-1.5 !text-[12px]"
      onClick={() =>
        start(async () => {
          await addDrillToSessionAction(sessionId, drillId);
          router.push(`/sessions/${sessionId}`);
        })
      }
    >
      {pending ? "Adding…" : children}
    </button>
  );
}
