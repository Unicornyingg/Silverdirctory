import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="top-nav page-enter">
      <Link href="/" className="brand-chip">
        <span className="brand-badge">RN</span>
        <span className="brand-name">Caregiver Network</span>
      </Link>

      <nav className="nav-links">
        <Link href="/" className="nav-link">
          Home
        </Link>
        <Link href="/directory" className="nav-link">
          Look For a Caregiver
        </Link>
        <Link href="/for-nurses" className="nav-link">
          For Nurses
        </Link>
      </nav>
    </header>
  );
}
