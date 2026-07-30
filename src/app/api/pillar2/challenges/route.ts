import { ok } from "@/lib/api";
import { CHALLENGE_CATALOG, checkEngagement } from "@/lib/pillar2";

/**
 * GET /api/pillar2/challenges   (public)
 *
 * The Pillar 2 challenge library (§5.1) with its §5.3 tags and a §5.4
 * engagement check per challenge. Read-only, like the other public GETs.
 */
export async function GET() {
  return ok(
    CHALLENGE_CATALOG.map((c) => ({ ...c, engagement: checkEngagement(c.mechanics) }))
  );
}
