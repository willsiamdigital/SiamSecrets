import {useEffect, useState} from 'react';
import {User} from 'lucide-react';
import {getMyListings} from '../lib/api';
import type {Listing} from '../lib/types';
import {Modal, errorMessage} from './Modal';

const statusText: Record<Listing['status'], string> = {
  pending: 'Awaiting review',
  approved: 'Live',
  rejected: 'Not approved',
  suspended: 'Suspended pending review',
};

export function MyListings({userId, onClose, onNew}: {userId: string; onClose: () => void; onNew: () => void}) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyListings(userId).then(setListings, e => setError(errorMessage(e)));
  }, [userId]);

  return (
    <Modal icon={<User />} eyebrow="YOUR ACCOUNT" title="My listings" onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      {listings?.length === 0 && <p>You haven’t submitted any listings yet.</p>}
      <div className="rows">
        {listings?.map(l => (
          <div className="row" key={l.id}>
            <img src={l.image_url} alt="" />
            <div>
              <b>{l.name}, {l.age}</b>
              <small>{l.area}</small>
              {l.review_note && <small>Moderator note: {l.review_note}</small>}
            </div>
            <span className={`pill ${l.status}`}>{statusText[l.status]}</span>
          </div>
        ))}
      </div>
      <button className="primary" onClick={onNew}>List a new profile</button>
    </Modal>
  );
}
