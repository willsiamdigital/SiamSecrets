import {supabase} from './supabase';
import type {AuctionSlot, Listing, ListingStatus, ListingTier, Report, ReportReason} from './types';

const PHOTO_BUCKET = 'listing-photos';

function unwrap<T = unknown>({data, error}: {data: unknown; error: {message: string} | null}): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const euros = (cents: number) => `€${(cents / 100).toLocaleString('en-IE', {maximumFractionDigits: 2})}`;

export const minNextBid = (slot: AuctionSlot) =>
  slot.current_bid_cents === null ? slot.starting_bid_cents : slot.current_bid_cents + slot.increment_cents;

// Directory -----------------------------------------------------------------

export async function searchListings(query: string, area: string | null) {
  return unwrap<Listing[]>(await supabase.rpc('search_listings', {p_query: query, p_area: area}));
}

export async function listAreas() {
  const rows = unwrap<{area: string}[]>(await supabase.from('listings').select('area').eq('status', 'approved'));
  return [...new Set(rows.map(r => r.area))].sort();
}

export async function getAuctionSlots() {
  return unwrap<AuctionSlot[]>(await supabase.from('auction_slots').select('*').order('position'));
}

// Favourites ----------------------------------------------------------------

export async function getFavouriteIds() {
  const rows = unwrap<{listing_id: number}[]>(await supabase.from('favourites').select('listing_id'));
  return rows.map(r => r.listing_id);
}

export async function setFavourite(listingId: number, saved: boolean) {
  if (saved) unwrap(await supabase.from('favourites').insert({listing_id: listingId}));
  else unwrap(await supabase.from('favourites').delete().eq('listing_id', listingId));
}

// Listings owned by the signed-in user --------------------------------------

export async function getMyListings(userId: string) {
  return unwrap<Listing[]>(
    await supabase.from('listings').select('*').eq('owner_id', userId).order('created_at', {ascending: false}),
  );
}

export async function uploadListingPhoto(userId: string, file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  unwrap(await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {contentType: file.type}));
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export type NewListing = {name: string; area: string; age: number; bio: string; image_url: string};

export async function submitListing(listing: NewListing) {
  // Status, tier and owner are forced server-side; new listings always start as pending.
  return unwrap<Listing>(
    await supabase.from('listings').insert({...listing, adult_declared_at: new Date().toISOString()}).select().single(),
  );
}

// Auction -------------------------------------------------------------------

export async function placeBid(slot: number, listingId: number, amountCents: number) {
  return unwrap<AuctionSlot>(
    await supabase.rpc('place_bid', {p_slot: slot, p_listing_id: listingId, p_amount_cents: amountCents}),
  );
}

// Reports -------------------------------------------------------------------

export async function reportListing(listingId: number, reason: ReportReason, details: string) {
  unwrap(await supabase.from('reports').insert({listing_id: listingId, reason, details}));
}

// Admin ---------------------------------------------------------------------

export async function isAdmin() {
  return unwrap<boolean>(await supabase.rpc('is_admin'));
}

export async function getReviewQueue() {
  return unwrap<Listing[]>(
    await supabase.from('listings').select('*').in('status', ['pending', 'suspended']).order('created_at'),
  );
}

export async function reviewListing(
  id: number,
  reviewerId: string,
  status: ListingStatus,
  opts: {tier?: ListingTier; note?: string} = {},
) {
  unwrap(
    await supabase
      .from('listings')
      .update({
        status,
        ...(opts.tier ? {tier: opts.tier} : {}),
        review_note: opts.note || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id),
  );
}

export async function getOpenReports() {
  return unwrap<Report[]>(
    await supabase
      .from('reports')
      .select('id, listing_id, reason, details, status, created_at, listings(id, name, area, status, image_url)')
      .eq('status', 'open')
      .order('created_at'),
  );
}

export async function closeReport(id: number, reviewerId: string, status: 'resolved' | 'dismissed') {
  unwrap(
    await supabase
      .from('reports')
      .update({status, resolved_by: reviewerId, resolved_at: new Date().toISOString()})
      .eq('id', id),
  );
}
