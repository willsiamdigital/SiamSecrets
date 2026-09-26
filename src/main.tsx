import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import type {Session} from '@supabase/supabase-js';
import {Search, MapPin, ShieldCheck, ChevronRight, Menu, X, Gavel, Sparkles} from 'lucide-react';
import {isConfigured, supabase} from './lib/supabase';
import {euros, getAuctionSlots, getFavouriteIds, isAdmin, listAreas, searchListings, setFavourite} from './lib/api';
import type {AuctionSlot, Listing} from './lib/types';
import {Card} from './components/Card';
import {AuthModal} from './components/AuthModal';
import {ListingForm} from './components/ListingForm';
import {MyListings} from './components/MyListings';
import {AuctionModal} from './components/AuctionModal';
import {ReportModal} from './components/ReportModal';
import {AdminPanel} from './components/AdminPanel';
import {errorMessage} from './components/Modal';
import './styles.css';

type ModalState =
  | {kind: 'auth'; reason?: string; then?: ModalState}
  | {kind: 'list'}
  | {kind: 'mine'}
  | {kind: 'auction'; position: number}
  | {kind: 'report'; listing: Listing}
  | {kind: 'admin'}
  | null;

function Sakura(){const [petals,setPetals]=useState<number[]>([]);useEffect(()=>{setPetals(Array.from({length:22},(_,i)=>i));},[]);return <div className="sakura" aria-hidden>{petals.map(i=><span key={i} style={{left:`${(i*17)%100}%`,animationDelay:`${(i%9)*1.4}s`,animationDuration:`${9+(i%6)}s`,transform:`rotate(${i*31}deg)`}}>✿</span>)}</div>}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function App() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('All areas');
  const [menu, setMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [slots, setSlots] = useState<AuctionSlot[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const afterAuth = useRef<ModalState>(null);
  const userId = session?.user.id ?? null;
  const query = useDebounced(search.trim(), 250);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data} = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' && afterAuth.current) {
        setModal(afterAuth.current);
        afterAuth.current = null;
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setSaved([]); setAdmin(false); return; }
    getFavouriteIds().then(setSaved, () => setSaved([]));
    isAdmin().then(setAdmin, () => setAdmin(false));
  }, [userId]);

  const loadDirectory = useCallback(async () => {
    try {
      const [ls, ss] = await Promise.all([searchListings(query, area === 'All areas' ? null : area), getAuctionSlots()]);
      setListings(ls);
      setSlots(ss);
      setLoadError('');
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [query, area]);
  useEffect(() => { loadDirectory(); }, [loadDirectory]);

  const refreshAll = useCallback(() => {
    loadDirectory();
    listAreas().then(setAreas, () => {});
  }, [loadDirectory]);
  useEffect(() => { listAreas().then(setAreas, () => {}); }, []);

  const {spotlight, featured, compact} = useMemo(() => {
    const byId = new Map(listings.map(l => [l.id, l]));
    const holders = new Set(slots.map(s => s.listing_id));
    const rest = listings.filter(l => !holders.has(l.id));
    return {
      spotlight: slots.map(s => ({slot: s, holder: s.listing_id === null ? undefined : byId.get(s.listing_id)})),
      featured: rest.filter(l => l.tier === 'featured'),
      compact: rest.filter(l => l.tier === 'directory'),
    };
  }, [listings, slots]);
  const filtering = query !== '' || area !== 'All areas';

  function requireAuth(next: ModalState, reason: string) {
    if (userId) return setModal(next);
    afterAuth.current = next;
    setModal({kind: 'auth', reason});
  }

  async function toggleSave(id: number) {
    if (!userId) return requireAuth(null, 'Sign in to save profiles to your favourites.');
    const isSaved = saved.includes(id);
    setSaved(s => isSaved ? s.filter(x => x !== id) : [...s, id]);
    try {
      await setFavourite(id, !isSaved);
    } catch {
      setSaved(s => isSaved ? [...s, id] : s.filter(x => x !== id));
    }
  }

  const listProfile = () => requireAuth({kind: 'list'}, 'Create an account or sign in to list a profile.');
  const cardProps = (p: Listing) => ({
    p,
    saved: saved.includes(p.id),
    onSave: () => toggleSave(p.id),
    onReport: () => setModal({kind: 'report', listing: p}),
  });
  const auctionSlot = modal?.kind === 'auction' ? slots.find(s => s.position === modal.position) : undefined;
  const lowestStart = slots.length ? Math.min(...slots.map(s => s.starting_bid_cents)) : 5000;

  return <div className="app"><Sakura/>
   <header><div className="brand"><div className="logo-mark">✦</div><div><div className="brand-name">Siam Secrets</div><div className="brand-sub">Bangkok's private directory</div></div></div>
    <nav className={menu?'open':''} onClick={()=>setMenu(false)}>
     <a href="#directory">Directory</a><a href="#featured">Featured</a><a href="#how">How it works</a>
     {admin && <button className="navlink" onClick={()=>setModal({kind:'admin'})}>Admin</button>}
     {userId
      ? <><button className="navlink" onClick={()=>setModal({kind:'mine'})}>My listings</button><button className="navlink" onClick={()=>supabase.auth.signOut()}>Sign out</button></>
      : <button className="navlink" onClick={()=>setModal({kind:'auth'})}>Sign in</button>}
     <button className="sell" onClick={listProfile}>List a profile</button>
    </nav>
    <button className="menu" onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?<X/>:<Menu/>}</button>
   </header>
   <main>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkles size={14}/> CURATED • DISCREET • BANGKOK</span><h1>Discover the <em>secrets</em><br/>of Siam.</h1><p>A premium directory experience with elegant listings, featured placement and a transparent marketplace for visibility.</p><div className="searchbar"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search names or areas..."/><select value={area} onChange={e=>setArea(e.target.value)}><option>All areas</option>{areas.map(a=><option key={a}>{a}</option>)}</select></div></div><div className="hero-tree"><div className="moon"></div><div className="tree">🌸</div><div className="tree-caption">A little privacy<br/><span>goes a long way.</span></div></div></section>
    <section className="trust"><span><ShieldCheck/> Every listing is reviewed • 18+ only</span><span><MapPin/> Bangkok directory</span><span><Gavel/> Featured placement auctions</span></section>
    {loadError && <div className="load-error">Couldn't load the directory: {loadError}</div>}
    <section id="featured" className="section"><div className="section-head"><div><span className="eyebrow">THE SPOTLIGHT</span><h2>Featured <em>Secrets</em></h2></div><span className="auction-note">Top 3 placements start at <b>{euros(lowestStart)}</b></span></div>
     <div className="grid">{spotlight.map(({slot,holder})=>holder
      ? <Card key={slot.position} {...cardProps(holder)} slot={slot} onAuction={()=>setModal({kind:'auction',position:slot.position})}/>
      : !filtering && <article key={slot.position} className="card open-slot"><div><Gavel/><h3>Spotlight #{slot.position} is open</h3><p>Bid from {euros(slot.starting_bid_cents)}</p><button className="sell" onClick={()=>setModal({kind:'auction',position:slot.position})}>Place a bid</button></div></article>)}</div>
    </section>
    <section id="directory" className="section"><div className="section-head"><div><span className="eyebrow">THE DIRECTORY</span><h2>More <em>profiles</em></h2></div><span className="count">{loading?'Loading…':`${listings.length} profiles`}</span></div>
     {!loading && listings.length===0 && <p className="empty">No profiles match your search.</p>}
     <div className="grid normal">{featured.map(p=><Card key={p.id} {...cardProps(p)}/>)}</div>
     <div className="grid compact">{compact.map(p=><Card key={p.id} {...cardProps(p)} compact/>)}</div>
    </section>
    <section id="how" className="business"><div><span className="eyebrow">MONETISATION ENGINE</span><h2>Make visibility <em>valuable.</em></h2><p>The first three positions are premium inventory, sold by live auction. Advertisers bid with an approved listing; the highest bid at the close of each round holds the spotlight.</p></div><div className="money-grid"><div><b>{euros(lowestStart)}</b><span>Starting bid</span></div><div><b>{slots.length||3}</b><span>Auction slots</span></div><div><b>Featured</b><span>Large listings</span></div><div><b>Directory</b><span>Compact listings</span></div></div></section>
    <section className="footer-cta"><h2>Want the top of the page?</h2><p>Featured placement is sold by auction. Every bid is validated server-side — no fake verification, no fake bidding.</p><button onClick={()=>setModal({kind:'auction',position:1})}>Bid for a spotlight slot <ChevronRight size={17}/></button></section>
   </main>
   <footer><b>Siam Secrets</b><span>All advertisers must be 18+. Report any listing that looks wrong.</span><span>© 2026</span></footer>
   {modal?.kind==='auth' && <AuthModal reason={modal.reason} onClose={()=>setModal(null)}/>}
   {modal?.kind==='list' && userId && <ListingForm userId={userId} areas={areas} onClose={()=>setModal(null)} onSubmitted={refreshAll}/>}
   {modal?.kind==='mine' && userId && <MyListings userId={userId} onClose={()=>setModal(null)} onNew={()=>setModal({kind:'list'})}/>}
   {modal?.kind==='report' && <ReportModal listing={modal.listing} onClose={()=>setModal(null)} onReported={refreshAll}/>}
   {modal?.kind==='admin' && userId && <AdminPanel userId={userId} onClose={()=>setModal(null)} onChanged={refreshAll}/>}
   {auctionSlot && <AuctionModal slot={auctionSlot} holder={listings.find(l=>l.id===auctionSlot.listing_id)} userId={userId}
     onClose={()=>setModal(null)} onBid={loadDirectory}
     onSignIn={()=>requireAuth({kind:'auction',position:auctionSlot.position},'Sign in to bid for a featured slot.')}
     onListProfile={()=>setModal({kind:'list'})}/>}
  </div>
}

function SetupNotice() {
  return <div className="app setup"><div className="modal"><span className="eyebrow">SETUP</span><h2>Connect Supabase</h2><p>Copy <code>.env.example</code> to <code>.env.local</code> and fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server. See the README for the full setup.</p></div></div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode>{isConfigured ? <App/> : <SetupNotice/>}</React.StrictMode>);
