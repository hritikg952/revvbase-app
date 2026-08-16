"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListingFilters } from "@/components/listing-filters";
import { ListingCard } from "@/components/listing-card";
import {
  DEFAULT_DISCOVERY_QUERY,
  fetchPublicListings,
  fetchPublicListingFacets,
  normalizeListingDiscoveryQuery,
  parseListingDiscoveryQuery,
  serializeListingDiscoveryQuery,
  type ListingDiscoveryQuery,
} from "@/lib/listing-discovery";
import {
  getPublicListingCards,
  type ListingCardView,
} from "@/lib/listing-image-consumers";
import { createBrowserListingImageStorage } from "@/lib/storage/browser-listing-image-storage";
import type { ListingImage } from "@/lib/storage/listing-image-storage";

export function ListingsFeed() {
  const [query, setQuery] = useState<ListingDiscoveryQuery>(() =>
    typeof window === "undefined" ? DEFAULT_DISCOVERY_QUERY : parseListingDiscoveryQuery(window.location.search),
  );
  const [cards, setCards] = useState<ListingCardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<{ cities: string[]; makes: string[] }>({ cities: [], makes: [] });
  const requestSequence = useRef(0);

  const load = useCallback(async (requestedQuery: ListingDiscoveryQuery, append = false) => {
    const requestId = ++requestSequence.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const { listings, hasMore: nextHasMore } = await fetchPublicListings(requestedQuery);
      const storage = createBrowserListingImageStorage();
      const imageEntries = await Promise.all(
        listings.map(async (listing) => {
          try {
            return [listing.id, await storage.list(listing.id)] as const;
          } catch {
            return [listing.id, [] as ListingImage[]] as const;
          }
        }),
      );
      const nextCards = getPublicListingCards(listings, new Map(imageEntries));
      if (requestId !== requestSequence.current) return;
      setCards((current) => append ? [...current, ...nextCards] : nextCards);
      setHasMore(nextHasMore);
    } catch (queryError) {
      if (requestId !== requestSequence.current) return;
      setError(queryError instanceof Error ? queryError.message : "Listings could not load.");
      if (!append) setCards([]);
    } finally {
      if (requestId !== requestSequence.current) return;
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(query, (query.page ?? 1) > 1);
  }, [load, query]);

  useEffect(() => {
    const handlePopState = () => setQuery(parseListingDiscoveryQuery(window.location.search));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchPublicListingFacets().then((nextFacets) => {
      if (active) setFacets(nextFacets);
    }).catch(() => {
      // The current page-derived values remain a useful fallback if facets fail.
    });
    return () => { active = false; };
  }, []);

  const availableCities = useMemo(() => facets.cities.length ? facets.cities : [...new Set(cards.map((card) => card.listing.city))].sort(), [cards, facets.cities]);
  const availableMakes = useMemo(() => facets.makes.length ? facets.makes : [...new Set(cards.map((card) => card.listing.make))].sort(), [cards, facets.makes]);

  const applyQuery = (nextQuery: ListingDiscoveryQuery) => {
    const normalized = normalizeListingDiscoveryQuery({ ...nextQuery, page: 1 });
    const search = serializeListingDiscoveryQuery(normalized);
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    window.history.pushState({}, "", nextUrl);
    setQuery(normalized);
  };

  const clearQuery = () => applyQuery(DEFAULT_DISCOVERY_QUERY);

  const loadMore = () => {
    const nextQuery = { ...query, page: (query.page ?? 1) + 1 };
    setQuery(nextQuery);
  };

  if (loading) {
    return <div className="listing-grid" aria-busy="true" aria-label="Loading listings">{[0, 1, 2].map((item) => <div key={item} className="listing-skeleton" />)}</div>;
  }

  if (error) {
    return <div className="state-panel compact" role="alert"><h3>Listings couldn&apos;t load</h3><p>Check your connection and try again.</p><button className="button button-secondary" type="button" onClick={() => void load(query)}>Try again</button></div>;
  }

  return (
    <div className="discovery-layout">
      <ListingFilters appliedQuery={query} availableCities={availableCities} availableMakes={availableMakes} onApply={applyQuery} onClear={clearQuery} onPopularApply={applyQuery} />
      <div className="discovery-results">
        <div className={`results-heading ${query.text ? "has-search-heading" : "sort-only"}`}>
          {query.text && <div><p className="eyebrow">Search results</p><h2>“{query.text}”</h2></div>}
          <label className="sort-control">Sort<select value={query.sort ?? "newest"} onChange={(event) => applyQuery({ ...query, sort: event.target.value as ListingDiscoveryQuery["sort"] })}><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
        </div>
        {!cards.length ? <div className="state-panel compact"><h3>No vehicles match these filters</h3><p>Try clearing one or more filters to see more listings.</p><button className="button" type="button" onClick={clearQuery}>Clear filters</button></div> : <><div className="listing-grid">{cards.map((card) => <ListingCard key={card.listing.id} card={card} />)}</div>{hasMore && <button className="button button-secondary load-more-button" type="button" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more listings"}</button>}</>}
      </div>
    </div>
  );
}
