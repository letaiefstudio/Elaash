import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Profile = { id: string; full_name: string | null; phone: string | null; email: string | null };
type Appointment = {
  id: string; appointment_date: string; appointment_time: string | null; status: string; notes: string | null;
  services?: { name_en?: string | null } | null;
  package_offers?: { name_en?: string | null } | null;
};
type CustomerPackage = {
  id: string; sessions_total: number; sessions_used: number; status: string; starts_on: string | null; expires_on: string | null;
  package_offers?: { name_en?: string | null; offer_price?: string | null } | null;
};

function niceDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerPortal() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [packages, setPackages] = useState<CustomerPackage[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'appointments' | 'packages'>('overview');

  const load = async (activeSession: Session) => {
    if (!supabase) return;
    setError('');
    const userId = activeSession.user.id;
    const [profileResult, appointmentResult, packageResult] = await Promise.all([
      supabase.from('profiles').select('id,full_name,phone,email').eq('id', userId).maybeSingle(),
      supabase.from('appointments').select('id,appointment_date,appointment_time,status,notes,services(name_en),package_offers(name_en)').eq('customer_id', userId).order('appointment_date', { ascending: true }),
      supabase.from('customer_packages').select('id,sessions_total,sessions_used,status,starts_on,expires_on,package_offers(name_en,offer_price)').eq('customer_id', userId).order('created_at', { ascending: false }),
    ]);
    const firstError = profileResult.error || appointmentResult.error || packageResult.error;
    if (firstError) setError(`${firstError.message} — Run supabase/phase4_customer_accounts.sql if you have not done so yet.`);
    setProfile((profileResult.data as Profile | null) || { id: userId, full_name: activeSession.user.user_metadata?.full_name || null, phone: activeSession.user.user_metadata?.phone || null, email: activeSession.user.email || null });
    setAppointments((appointmentResult.data || []) as Appointment[]);
    setPackages((packageResult.data || []) as CustomerPackage[]);
  };

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      const current = data.session;
      setSession(current);
      setReady(true);
      if (!current) window.location.replace('/login');
      else load(current);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) window.location.replace('/login');
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const upcoming = useMemo(() => appointments.filter((item) => item.status !== 'cancelled' && item.status !== 'completed'), [appointments]);
  const activePackages = useMemo(() => packages.filter((item) => item.status === 'active'), [packages]);

  if (!isSupabaseConfigured) return <div className="min-h-dvh bg-ivory p-8 text-charcoal"><div className="mx-auto max-w-xl rounded-3xl border border-blush bg-cream p-7"><h1 className="font-serif text-3xl text-burgundy">Supabase connection required</h1><p className="mt-3 text-sm text-muted">Add the project URL and anon key before using My Elaash.</p></div></div>;
  if (!ready || !session) return <div className="min-h-dvh bg-ivory" />;

  const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Client';

  return (
    <div className="min-h-dvh bg-ivory text-charcoal">
      <header className="sticky top-0 z-30 border-b border-blush bg-cream/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-20 sm:px-7">
          <a href="/" className="flex items-center gap-3"><img src="/images/logo.png" alt="Elaash" className="h-11 w-auto sm:h-12" /><span className="hidden border-l border-gold/30 pl-3 sm:block"><span className="block font-serif text-lg font-semibold text-burgundy">My Elaash</span><span className="block text-[9px] font-semibold uppercase tracking-[.24em] text-gold">Customer Portal</span></span></a>
          <div className="flex items-center gap-2"><a href="/" className="rounded-full border border-blush px-4 py-2 text-xs font-semibold text-burgundy">Website</a><button onClick={async () => { await supabase?.auth.signOut(); window.location.replace('/'); }} className="rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-cream">Sign out</button></div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-burgundy p-6 text-cream shadow-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Welcome back</p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><h1 className="font-serif text-4xl sm:text-5xl">{name}</h1><p className="mt-2 text-sm text-cream/70">Your Elaash appointments and packages.</p></div>
            <a href="/#services" className="inline-flex min-h-11 items-center justify-center rounded-full bg-cream px-5 text-sm font-bold text-burgundy">Book a treatment</a>
          </div>
        </section>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="My Elaash sections">
          {(['overview','appointments','packages'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold capitalize ${tab === item ? 'bg-burgundy text-cream' : 'border border-blush bg-cream text-burgundy'}`}>{item}</button>)}
        </nav>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {tab === 'overview' && <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-blush bg-cream p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Upcoming appointments</p><p className="mt-3 font-serif text-5xl text-burgundy">{upcoming.length}</p><button onClick={() => setTab('appointments')} className="mt-5 text-sm font-bold text-burgundy">View appointments →</button></article>
          <article className="rounded-3xl border border-blush bg-cream p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Active packages</p><p className="mt-3 font-serif text-5xl text-burgundy">{activePackages.length}</p><button onClick={() => setTab('packages')} className="mt-5 text-sm font-bold text-burgundy">View packages →</button></article>
          <article className="rounded-3xl border border-blush bg-cream p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-gold">Account</p><p className="mt-3 text-sm font-semibold text-charcoal">{profile?.email || session.user.email}</p><p className="mt-1 text-sm text-muted">{profile?.phone || 'No phone saved yet'}</p></article>
        </div>}

        {tab === 'appointments' && <section className="mt-5"><div className="mb-4"><h2 className="font-serif text-3xl text-burgundy">My Appointments</h2><p className="mt-1 text-sm text-muted">Your salon appointments will appear here automatically.</p></div>{appointments.length === 0 ? <Empty title="No appointments yet" text="Once a booking is saved, it will appear here." /> : <div className="grid gap-3">{appointments.map((item) => <article key={item.id} className="grid gap-3 rounded-3xl border border-blush bg-cream p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-serif text-xl text-burgundy">{item.services?.name_en || item.package_offers?.name_en || 'Elaash Appointment'}</p><p className="mt-1 text-sm text-muted">{niceDate(item.appointment_date)}{item.appointment_time ? ` · ${item.appointment_time.slice(0,5)}` : ''}</p>{item.notes && <p className="mt-2 text-sm text-charcoal/75">{item.notes}</p>}</div><span className="w-fit rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-bold text-burgundy">{statusLabel(item.status)}</span></article>)}</div>}</section>}

        {tab === 'packages' && <section className="mt-5"><div className="mb-4"><h2 className="font-serif text-3xl text-burgundy">My Packages</h2><p className="mt-1 text-sm text-muted">See active packages, usage and expiry dates.</p></div>{packages.length === 0 ? <Empty title="No packages yet" text="Packages assigned to your account will appear here." /> : <div className="grid gap-4 md:grid-cols-2">{packages.map((item) => { const remaining = Math.max(0, item.sessions_total - item.sessions_used); const percent = item.sessions_total ? Math.min(100, (item.sessions_used / item.sessions_total) * 100) : 0; return <article key={item.id} className="rounded-3xl border border-blush bg-cream p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-gold">Package</p><h3 className="mt-1 font-serif text-2xl text-burgundy">{item.package_offers?.name_en || 'Elaash Package'}</h3></div><span className="rounded-full bg-burgundy px-3 py-1.5 text-xs font-bold text-cream">{statusLabel(item.status)}</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-blush-light"><div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} /></div><div className="mt-3 flex justify-between text-sm"><span>{item.sessions_used} used</span><strong className="text-burgundy">{remaining} remaining</strong></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted">Starts</p><p className="mt-1 font-semibold">{niceDate(item.starts_on)}</p></div><div><p className="text-xs text-muted">Expires</p><p className="mt-1 font-semibold">{niceDate(item.expires_on)}</p></div></div></article>; })}</div>}</section>}
      </main>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border border-dashed border-gold/40 bg-cream p-10 text-center"><p className="font-serif text-2xl text-burgundy">{title}</p><p className="mt-2 text-sm text-muted">{text}</p><a href="/#services" className="mt-5 inline-flex rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-cream">Explore services</a></div>;
}
