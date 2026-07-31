import { redirect } from "next/navigation";
import { db } from "@/playlab/lib/db";

/** Default route opens the primary demo session. */
export default async function Home() {
  const session = await db.session.findFirst({ orderBy: { date: "desc" } });
  redirect(session ? `/playlab/sessions/${session.id}` : "/playlab/sessions");
}
