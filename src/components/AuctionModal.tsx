import {useEffect, useState, type FormEvent} from 'react';
import {Gavel} from 'lucide-react';
import {euros, getMyListings, minNextBid, placeBid} from '../lib/api';
import type {AuctionSlot, Listing} from '../lib/types';
import {Modal, errorMessage} from './Modal';

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Bidding closed';
  const h = Math.floor(ms / 3.6e6);
  return h >= 48 ? `Ends in ${Math.floor(h / 24)} days` : h >= 1 ? `Ends in ${h} h` : `Ends in ${Math.ceil(ms / 6e4)} min`;
}

export function AuctionModal({slot, holder, userId, onClose, onSignIn, onListProfile, onBid}: {
  slot: AuctionSlot;
  holder: Listing | undefined;
  userId: string | null;
  onClose: () => void;
  onSignIn: () => void;
  onListProfile: () => void;
  onBid: () => void;
}) {
  const min = minNextBid(slot);
  const closed = new Date(slot.round_ends_at).getTime() <= Date.now();
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [listingId, setListingId] = useState<number | null>(null);
  const [amount, setAmount] = useState(String(min / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!userId) return;
    getMyListings(userId).then(ls => {
      const approved = ls.filter(l => l.status === 'approved');
      setMine(approved);
      setListingId(approved[0]?.id ?? null);
    }, e => setError(errorMessage(e)));
  }, [userId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (listingId === null) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < min) return setError(`Minimum bid is ${euros(min)}`);
    setBusy(true);
    setError('');
    try {
      const updated = await placeBid(slot.position, listingId, cents);
      setSuccess(`You lead slot #${slot.position} at ${euros(updated.current_bid_cents!)}.`);
      onBid();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal icon={<Gavel />} eyebrow={`SPOTLIGHT SLOT #${slot.position}`} title="Featured placement" onClose={onClose}>
      <p>The highest bid when the round closes holds this position at the top of the directory. Payment for the winning bid is arranged when the round closes.</p>
      <div className="auction-box">
        <span>{slot.current_bid_cents === null ? 'No bids yet' : `Current bid${holder ? ` · ${holder.name}` : ''}`}</span>
        <strong>{euros(slot.current_bid_cents ?? slot.starting_bid_cents)}</strong>
        <small>Next bid from {euros(min)} • Increment {euros(slot.increment_cents)} • {timeLeft(slot.round_ends_at)}</small>
      </div>
      {success ? <div className="form-notice">{success}</div>
        : closed ? null
        : !userId ? <button className="primary" onClick={onSignIn}>Sign in to bid</button>
        : mine?.length === 0 ? (
          <>
            <p>You need an approved listing before you can bid for a featured slot.</p>
            <button className="primary" onClick={onListProfile}>List a profile</button>
          </>
        ) : mine && (
          <form onSubmit={submit}>
            {mine.length > 1 && (
              <label className="form">Bid with
                <select value={listingId ?? ''} onChange={e => setListingId(Number(e.target.value))}>
                  {mine.map(l => <option key={l.id} value={l.id}>{l.name} · {l.area}</option>)}
                </select>
              </label>
            )}
            <div className="bidrow">
              <input type="number" min={min / 100} step={1} value={amount} onChange={e => setAmount(e.target.value)} aria-label="Bid in euros" />
              <button disabled={busy}>{busy ? 'Placing…' : `Bid${mine.length === 1 ? ` for ${mine[0].name}` : ''}`}</button>
            </div>
          </form>
        )}
      {error && <div className="form-error">{error}</div>}
    </Modal>
  );
}
