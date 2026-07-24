"use client";

/**
 * PlayerQR — generates a unique QR code for a player.
 *
 * The QR encodes the player's PUBLIC profile URL:  {APP_URL}/player/{playerId}
 * Because every player has a unique id, every QR is automatically unique, and
 * scanning it opens that player's profile page.
 *
 * The QR contains a URL only — never phone, email, or any personal data.
 *
 * Usage:  <PlayerQR playerId={player.id} />
 */
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function PlayerQR({
  playerId,
  size = 220,
  showLink = true,
}: {
  playerId: string;
  size?: number;
  showLink?: boolean;
}) {
  const [url, setUrl] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Build the absolute profile URL on the client.
  // Prefers NEXT_PUBLIC_APP_URL (set in .env.local), falls back to the current origin.
  useEffect(() => {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;
    setUrl(`${origin}/player/${playerId}`);
  }, [playerId]);

  const download = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `matchfit-qr-${playerId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (!url) return null;

  return (
    <div className="qr-box">
      <div ref={wrapRef} className="qr-canvas">
        <QRCodeCanvas
          value={url}
          size={size}
          level="M"
          marginSize={2}
          bgColor="#ffffff"
          fgColor="#0f2a43"
        />
      </div>

      <button type="button" className="btn btn-ghost qr-download" onClick={download}>
        Download QR
      </button>

      {showLink && (
        <p className="qr-link">
          Scan to open <br />
          <code>{url}</code>
        </p>
      )}
    </div>
  );
}
