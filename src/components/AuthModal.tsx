import {useState, type FormEvent} from 'react';
import {LogIn} from 'lucide-react';
import {supabase} from '../lib/supabase';
import {Modal, errorMessage} from './Modal';

export function AuthModal({reason, onClose}: {reason?: string; onClose: () => void}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) throw error;
        onClose();
      } else {
        const {data, error} = await supabase.auth.signUp({email, password});
        if (error) throw error;
        if (data.session) onClose();
        else setNotice('Check your inbox to confirm your email, then sign in.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal icon={<LogIn />} eyebrow="ACCOUNT" title={mode === 'signin' ? 'Sign in' : 'Create account'} onClose={onClose}>
      {reason && <p>{reason}</p>}
      <form className="form" onSubmit={submit}>
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <div className="form-error">{error}</div>}
        {notice && <div className="form-notice">{notice}</div>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      <button className="link" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </Modal>
  );
}
