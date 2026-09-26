import {Flag, Gavel, Heart, MapPin} from 'lucide-react';
import {euros, minNextBid} from '../lib/api';
import type {AuctionSlot, Listing} from '../lib/types';

export function Card({p, slot, compact, saved, onSave, onReport, onAuction}: {
  p: Listing;
  slot?: AuctionSlot;
  compact?: boolean;
  saved: boolean;
  onSave: () => void;
  onReport: () => void;
  onAuction?: () => void;
}) {
  return (
    <article className={`card ${slot ? 'auction-card' : ''} ${compact ? 'compact-card' : ''}`}>
      <div className="photo">
        <img src={p.image_url} alt={p.is_demo ? 'Demo profile placeholder' : p.name} loading="lazy" />
        <div className="shade"></div>
        <span className="badge">{slot ? 'AUCTION FEATURE' : p.tier === 'featured' ? 'FEATURED' : 'DIRECTORY'}{p.is_demo ? ' · DEMO' : ''}</span>
        <button className={`heart ${saved ? 'active' : ''}`} onClick={onSave} aria-label={saved ? 'Remove from saved' : 'Save profile'}>
          <Heart fill={saved ? 'currentColor' : 'none'} />
        </button>
        {slot && onAuction && <button className="bid" onClick={onAuction}><Gavel size={14} /> Bid from {euros(minNextBid(slot))}</button>}
      </div>
      <div className="card-body">
        <div><h3>{p.name}, {p.age}</h3><p><MapPin size={14} />{p.area}</p></div>
        <div className="card-side">
          <span className="status"><i></i>{p.availability}</span>
          <button className="report" onClick={onReport} aria-label={`Report ${p.name}`} title="Report this listing"><Flag size={13} /></button>
        </div>
      </div>
    </article>
  );
}
