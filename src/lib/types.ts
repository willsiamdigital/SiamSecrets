export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ListingTier = 'featured' | 'directory';

export type Listing = {
  id: number;
  owner_id: string | null;
  name: string;
  area: string;
  age: number;
  bio: string;
  image_url: string;
  availability: string;
  tier: ListingTier;
  status: ListingStatus;
  is_demo: boolean;
  review_note: string | null;
  created_at: string;
};

export type AuctionSlot = {
  position: number;
  listing_id: number | null;
  current_bid_cents: number | null;
  starting_bid_cents: number;
  increment_cents: number;
  round_ends_at: string;
};

export type ReportReason = 'underage' | 'trafficking_or_coercion' | 'fake_or_stolen_photos' | 'spam_or_scam' | 'other';

export type Report = {
  id: number;
  listing_id: number;
  reason: ReportReason;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  listings: Pick<Listing, 'id' | 'name' | 'area' | 'status' | 'image_url'> | null;
};
