import {useState, type FormEvent} from 'react';
import {Flag} from 'lucide-react';
import {reportListing} from '../lib/api';
import type {Listing, ReportReason} from '../lib/types';
import {Modal, errorMessage} from './Modal';

const reasons: [ReportReason, string][] = [
  ['underage', 'The person may be under 18'],
  ['trafficking_or_coercion', 'The person may be coerced or trafficked'],
  ['fake_or_stolen_photos', 'Fake or stolen photos'],
  ['spam_or_scam', 'Spam or scam'],
  ['other', 'Something else'],
];

export function ReportModal({listing, onClose, onReported}: {listing: Listing; onClose: () => void; onReported: () => void}) {
  const [reason, setReason] = useState<ReportReason>('fake_or_stolen_photos');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await reportListing(listing.id, reason, details.trim());
      setDone(true);
      onReported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal icon={<Flag />} eyebrow="REPORT" title={`Report ${listing.name}`} onClose={onClose}>
      {done ? (
        <p>Thank you. A moderator will review this report. Reports that someone may be underage or coerced take the listing offline straight away.</p>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>Reason
            <select value={reason} onChange={e => setReason(e.target.value as ReportReason)}>
              {reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Details (optional)<textarea maxLength={1000} rows={3} value={details} onChange={e => setDetails(e.target.value)} /></label>
          <p>If someone is in immediate danger, contact the Thai police (191) or the anti-trafficking hotline (1300).</p>
          {error && <div className="form-error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
        </form>
      )}
    </Modal>
  );
}
