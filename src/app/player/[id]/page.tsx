import Link from "next/link";
import { PlayerQR } from "@/components/PlayerQR";
import { getPublicPlayer } from "@/lib/players";

/**
 * Public player profile — the page a QR code opens.
 * Route: /player/{playerId}
 *
 * Shows PUBLIC info only (name, photo, position, division, category) + the player's
 * own QR code. Private data (contact, injury, medical) is never fetched or shown here.
 */
export default async function PlayerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const player = await getPublicPlayer(params.id);

  // Respect the player's privacy toggle.
  const isPrivate = player && player.public_profile_enabled === false;

  return (
    <main className="page">
      <div className="card center">
        <div className="brand" style={{ justifyContent: "center" }}>
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>

        {player && !isPrivate ? (
          <>
            <div className="avatar">
              {player.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.profile_photo_url} alt={player.full_name} />
              ) : (
                <span>{initials(player.full_name)}</span>
              )}
            </div>

            <h1 className="title">{player.full_name}</h1>
            <p className="subtitle">
              {[
                cap(player.preferred_position),
                cap(player.playing_category),
                player.divisions?.name,
              ]
                .filter(Boolean)
                .join(" · ") || "MatchFIT player"}
            </p>

            <div className="profile-meta">
              {player.divisions && (
                <div className="meta-item">
                  <span className="meta-label">Division</span>
                  <span className="meta-value">{player.divisions.name}</span>
                </div>
              )}
              {player.preferred_foot && (
                <div className="meta-item">
                  <span className="meta-label">Foot</span>
                  <span className="meta-value">{cap(player.preferred_foot)}</span>
                </div>
              )}
              {player.playing_category && (
                <div className="meta-item">
                  <span className="meta-label">Category</span>
                  <span className="meta-value">{cap(player.playing_category)}</span>
                </div>
              )}
            </div>

            <div className="divider" />
            <p className="qr-heading">Player QR code</p>
            <PlayerQR playerId={player.id} />
          </>
        ) : isPrivate ? (
          <>
            <h1 className="title">Profile is private</h1>
            <p className="subtitle">
              This player has turned off their public profile.
            </p>
          </>
        ) : (
          // No data yet (player not found OR backend/Supabase not configured).
          // We still render the QR from the id so the feature is testable.
          <>
            <div className="avatar">
              <span>?</span>
            </div>
            <h1 className="title">Player profile</h1>
            <p className="subtitle">
              Profile details will appear here once the database is connected.
            </p>
            <div className="divider" />
            <p className="qr-heading">Player QR code</p>
            <PlayerQR playerId={params.id} />
          </>
        )}

        <p className="foot-note">
          <Link href="/">← Back to MatchFIT</Link>
        </p>
      </div>
    </main>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function cap(s: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
