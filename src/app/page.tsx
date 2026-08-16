import Link from "next/link";
import { ListingsFeed } from "@/components/listings-feed";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow light">India's two-wheeler marketplace</p>
            <h1>Good rides deserve a second road.</h1>
            <p className="hero-copy">
              Discover pre-owned motorcycles, scooters, EVs, and bicycles—or list yours in minutes.
            </p>
            <div className="hero-actions">
              <a href="#listings" className="button">Browse listings</a>
              <Link href="/sell" className="button button-on-dark">Sell your two-wheeler</Link>
            </div>
          </div>
          <div className="hero-stat" aria-label="Marketplace principles">
            <span>One account</span>
            <strong>Browse. List. Move on.</strong>
            <p>No role selection, no complicated seller setup.</p>
          </div>
        </div>
      </section>
      <section id="listings" className="shell feed-section">
        <div className="section-heading">
          <div>
            <h2>Fresh listings</h2>
          </div>
          <Link href="/sell" className="inline-link">List a vehicle →</Link>
        </div>
        <ListingsFeed />
      </section>
    </>
  );
}
