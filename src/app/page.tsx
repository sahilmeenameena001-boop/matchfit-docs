import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <div className="card center">
        <div className="brand" style={{ justifyContent: "center" }}>
          <span className="dot" />
          <strong>MATCHFIT</strong>
        </div>
        <h1 className="title">Welcome to MatchFIT</h1>
        <p className="subtitle">
          Create your player profile in two quick steps.
        </p>
        <Link href="/signup" className="btn btn-primary" style={{ display: "block", textDecoration: "none", paddingTop: 13 }}>
          Get started
        </Link>
        <p className="foot-note">
          Staff? <Link href="/dashboard">Open the dashboard</Link>
        </p>
      </div>
    </main>
  );
}
