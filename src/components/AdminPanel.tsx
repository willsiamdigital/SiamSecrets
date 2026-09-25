import {useCallback, useEffect, useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {closeReport, getOpenReports, getReviewQueue, reviewListing} from '../lib/api';
import type {Listing, Report} from '../lib/types';
import {Modal, errorMessage} from './Modal';

const reasonText: Record<Report['reason'], string> = {
  underage: 'Possibly under 18',
  trafficking_or_coercion: 'Possible coercion / trafficking',
  fake_or_stolen_photos: 'Fake or stolen photos',
  spam_or_scam: 'Spam or scam',
  other: 'Other',
};

export function AdminPanel({userId, onClose, onChanged}: {userId: string; onClose: () => void; onChanged: () => void}) {
  const [tab, setTab] = useState<'queue' | 'reports'>('queue');
  const [queue, setQueue] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([getReviewQueue(), getOpenReports()]).then(([q, r]) => {
      setQueue(q);
      setReports(r);
    }, e => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function act(fn: () => Promise<void>) {
    setError('');
    try {
      await fn();
      load();
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const reject = (l: Listing) => {
    const note = prompt(`Reason for rejecting ${l.name} (shown to the advertiser):`);
    if (note !== null) act(() => reviewListing(l.id, userId, 'rejected', {note}));
  };

  return (
    <Modal icon={<ShieldCheck />} eyebrow="MODERATION" title="Admin" onClose={onClose} wide>
      <div className="tabs">
        <button className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>Review queue ({queue.length})</button>
        <button className={tab === 'reports' ? 'active' : ''} onClick={() => setTab('reports')}>Open reports ({reports.length})</button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {tab === 'queue' && (
        <div className="rows">
          {queue.length === 0 && <p>Nothing waiting for review.</p>}
          {queue.map(l => (
            <div className="row" key={l.id}>
              <a href={l.image_url} target="_blank" rel="noreferrer"><img src={l.image_url} alt="" /></a>
              <div>
                <b>{l.name}, {l.age}</b>
                <small>{l.area} · <span className={`pill ${l.status}`}>{l.status}</span></small>
                {l.bio && <small className="bio">{l.bio}</small>}
              </div>
              <div className="actions">
                <button onClick={() => act(() => reviewListing(l.id, userId, 'approved', {tier: 'directory'}))}>Approve</button>
                <button onClick={() => act(() => reviewListing(l.id, userId, 'approved', {tier: 'featured'}))}>Approve as featured</button>
                <button className="danger" onClick={() => reject(l)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'reports' && (
        <div className="rows">
          {reports.length === 0 && <p>No open reports.</p>}
          {reports.map(r => (
            <div className="row" key={r.id}>
              {r.listings && <img src={r.listings.image_url} alt="" />}
              <div>
                <b>{reasonText[r.reason]}</b>
                <small>{r.listings ? `${r.listings.name} · ${r.listings.area} · ${r.listings.status}` : `Listing #${r.listing_id}`}</small>
                {r.details && <small className="bio">{r.details}</small>}
              </div>
              <div className="actions">
                {r.listings?.status !== 'suspended' && (
                  <button className="danger" onClick={() => act(async () => {
                    await reviewListing(r.listing_id, userId, 'suspended', {note: reasonText[r.reason]});
                    await closeReport(r.id, userId, 'resolved');
                  })}>Suspend listing</button>
                )}
                {r.listings?.status === 'suspended' && (
                  <button onClick={() => act(async () => {
                    await reviewListing(r.listing_id, userId, 'approved');
                    await closeReport(r.id, userId, 'dismissed');
                  })}>Reinstate listing</button>
                )}
                <button onClick={() => act(() => closeReport(r.id, userId, 'resolved'))}>Mark resolved</button>
                <button onClick={() => act(() => closeReport(r.id, userId, 'dismissed'))}>Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
