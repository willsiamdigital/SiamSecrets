import {useState, type FormEvent} from 'react';
import {Camera} from 'lucide-react';
import {submitListing, uploadListingPhoto} from '../lib/api';
import {Modal, errorMessage} from './Modal';

export function ListingForm({userId, areas, onClose, onSubmitted}: {
  userId: string;
  areas: string[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [area, setArea] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [declared, setDeclared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!photo) return setError('Add a photo');
    if (photo.size > 5 * 1024 * 1024) return setError('Photos must be 5 MB or smaller');
    if (Number(age) < 18) return setError('Everyone listed must be 18 or older');
    setBusy(true);
    setError('');
    try {
      const image_url = await uploadListingPhoto(userId, photo);
      await submitListing({name: name.trim(), area: area.trim(), age: Number(age), bio: bio.trim(), image_url});
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Modal icon={<Camera />} eyebrow="SUBMITTED" title="Under review" onClose={onClose}>
        <p>Thanks. Your listing is now in the review queue and will appear in the directory once a moderator approves it. You can check its status under “My listings”.</p>
      </Modal>
    );
  }

  return (
    <Modal icon={<Camera />} eyebrow="LIST A PROFILE" title="New listing" onClose={onClose}>
      <p>Every listing is reviewed before it goes live.</p>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label>Display name<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="narrow">Age<input required type="number" min={18} max={99} value={age} onChange={e => setAge(e.target.value)} /></label>
        </div>
        <label>Area
          <input required maxLength={60} list="area-options" value={area} onChange={e => setArea(e.target.value)} />
          <datalist id="area-options">{areas.map(a => <option key={a} value={a} />)}</datalist>
        </label>
        <label>About<textarea maxLength={2000} rows={4} value={bio} onChange={e => setBio(e.target.value)} /></label>
        <label>Photo (JPEG, PNG or WebP, max 5 MB)
          <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <label className="check">
          <input type="checkbox" required checked={declared} onChange={e => setDeclared(e.target.checked)} />
          <span>I confirm the person in this listing is 18 or older, is advertising of their own free will, and that I own or have permission to use these photos.</span>
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary" disabled={busy || !declared}>{busy ? 'Submitting…' : 'Submit for review'}</button>
      </form>
    </Modal>
  );
}
