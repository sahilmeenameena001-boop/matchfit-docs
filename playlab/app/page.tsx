import { redirect } from "next/navigation";
import { db } from "@/lib/db";

/** Default route opens the primary demo session. */
export default async function Home() {
  const session = await db.session.findFirst({ orderBy: { date: "desc" } });
  redirect(session ? `/sessions/${session.id}` : "/sessions");
}
