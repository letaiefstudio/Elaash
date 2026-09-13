import { useEffect, useMemo, useState } from 'react';
import { useCatalog } from './lib/catalog';
import type { Service } from './data/services';
import { supabase } from './lib/supabase';

const WA_NUMBER = '971545006642';

function priceLabel(value: Service['price'] | undefined) {
  if (value === undefined || value === null || value === '' || value === 0) return 'Confirm on WhatsApp';
  const raw = String(value);
  return raw.endsWith('+') ? `From AED ${raw.slice(0, -1)}` : `AED ${raw}`;
}

function serviceImage(service: Service) {
  return service.image || '';
}

export default function BookingPage() {
  const { services, categories, loading, error } = useCatalog();
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Service | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCategory && categories.length) setActiveCategory(categories[0].id);
  }, [activeCategory, categories]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let mounted = true;
    const load = async () => {
      const { data } = await client.auth.getSession();
      if (!mounted || !data.session) return;
      const session = data.session;
      const fallback = String(session.user.user_metadata?.full_name || session.user.email || '').split('@')[0];
      const { data: profile } = await client.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (!mounted) return;
      const name = String(profile?.full_name || fallback || '').trim();
      setAccountName(name || null);
      setCustomerName(name);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return services.filter((service) => `${service.name} ${service.nameAr} ${service.categoryName} ${service.categoryNameAr}`.toLowerCase().includes(q));
    return services.filter((service) => service.category === activeCategory);
  }, [services, search, activeCategory]);

  const continueWhatsApp = () => {
    if (!selected) return;
    const lines = [
      'Hello Elaash Beauty, I would like to book a treatment.',
      '',
      `Treatment: ${selected.name}`,
      `Price: ${priceLabel(selected.price)}`,
      customerName.trim() ? `Name: ${customerName.trim()}` : '',
      date ? `Preferred date: ${date}` : '',
      time ? `Preferred time: ${time}` : '',
      notes.trim() ? `Message: ${notes.trim()}` : '',
    ].filter(Boolean);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-dvh bg-ivory text-charcoal">
      <header className="sticky top-0 z-40 border-b border-blush bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Elaash" className="h-11 w-auto sm:h-13" />
            <span className="hidden border-l border-gold/30 pl-3 sm:block">
              <span className="block font-serif text-lg font-semibold text-burgundy">Book a Treatment</span>
              <span className="block text-[9px] font-semibold uppercase tracking-[.24em] text-gold">Elaash Beauty · Abu Dhabi</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/" className="rounded-full border border-blush px-4 py-2 text-xs font-semibold text-burgundy">Website</a>
            <a href={accountName ? '/account' : '/login'} className="max-w-[170px] truncate rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-cream">
              {accountName ? `Welcome, ${accountName}` : 'Sign in'}
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-10">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.28em] text-gold">Book at Elaash</p>
            <h1 className="mt-2 font-serif text-4xl text-burgundy sm:text-5xl">Choose your treatment</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Browse the same Elaash treatment catalogue, select what you want, then choose your preferred date and time.</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search treatments" className="h-11 rounded-full border border-blush bg-cream px-5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((category) => (
            <button key={category.id} onClick={() => { setActiveCategory(category.id); setSearch(''); }} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${activeCategory === category.id && !search ? 'bg-burgundy text-cream' : 'border border-blush bg-cream text-burgundy'}`}>
              {category.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-blush bg-cream p-10 text-center font-serif text-2xl text-burgundy">Loading treatments…</div>
        ) : error ? (
          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((service) => (
              <article key={service.id} className="group relative aspect-[1/0.82] overflow-hidden rounded-[16px] border border-cream/40 bg-gradient-to-br from-burgundy via-burgundy-dark to-charcoal shadow-[0_7px_18px_rgba(107,29,42,0.11)]">
                {serviceImage(service) && <img src={serviceImage(service)} alt={service.name} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />}
                <div className="absolute inset-0 bg-gradient-to-t from-burgundy-dark via-burgundy-dark/42 to-burgundy-dark/10" />
                <div className="absolute inset-x-2.5 top-2.5"><span className="border-l border-gold pl-2 text-[8px] font-semibold uppercase tracking-widest text-cream/80">{service.categoryName}</span></div>
                <div className="absolute inset-x-2.5 bottom-2.5">
                  <h2 className="line-clamp-2 font-serif text-[clamp(.78rem,1vw,.94rem)] leading-tight text-cream">{service.name}</h2>
                  <p className="mt-1 text-[clamp(.68rem,.9vw,.8rem)] font-bold text-gold">{priceLabel(service.price)}</p>
                  <button onClick={() => setSelected(service)} className="mt-2 inline-flex h-7 items-center rounded-full border border-cream/55 bg-burgundy-dark/30 px-3 text-[10px] font-semibold text-cream backdrop-blur hover:border-gold hover:bg-gold hover:text-burgundy-dark">Book</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end bg-charcoal/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true">
          <section className="w-full rounded-t-[2rem] border border-blush bg-cream p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-gold">Selected treatment</p><h2 className="mt-1 font-serif text-3xl text-burgundy">{selected.name}</h2><p className="mt-1 text-sm font-bold text-gold">{priceLabel(selected.price)}</p></div>
              <button onClick={() => setSelected(null)} className="h-9 w-9 rounded-full border border-blush text-burgundy">×</button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Your name</span><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11 w-full rounded-xl border border-blush bg-ivory px-4 text-sm outline-none focus:border-gold" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-muted">Preferred date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-xl border border-blush bg-ivory px-3 text-sm outline-none focus:border-gold" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-muted">Preferred time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-full rounded-xl border border-blush bg-ivory px-3 text-sm outline-none focus:border-gold" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-muted">Optional message</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-blush bg-ivory px-4 py-3 text-sm outline-none focus:border-gold" /></label>
            </div>
            <button onClick={continueWhatsApp} className="mt-5 h-12 w-full rounded-full bg-[#25D366] px-5 text-sm font-bold text-white">Continue on WhatsApp</button>
          </section>
        </div>
      )}
    </main>
  );
}
