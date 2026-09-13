import { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import AdminOffers from './AdminOffers';

type DbCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  sort_order: number;
};

type DbService = {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number | string;
  package_price: number | string | null;
  image_url: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
};

const input = 'h-11 w-full rounded-xl border border-blush bg-ivory px-3.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/15';
const textarea = 'w-full rounded-xl border border-blush bg-ivory p-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/15';
const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';

function Login({ onReady }: { onReady: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else onReady();
  };

  return (
    <div className="min-h-dvh bg-ivory px-4 py-16">
      <form onSubmit={login} className="mx-auto max-w-md rounded-3xl border border-blush bg-cream p-7 shadow-xl">
        <img src="/images/logo.png" className="mx-auto h-20 w-auto" alt="Elaash" />
        <p className="mt-5 text-center font-serif text-3xl text-burgundy">Elaash Admin</p>
        <p className="mt-2 text-center text-sm text-muted">Sign in with a Supabase Auth user.</p>
        <label className="mt-6 block"><span className={label}>Email</span><input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="mt-4 block"><span className={label}>Password</span><input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
        <button disabled={busy} className="mt-6 h-11 w-full rounded-full bg-burgundy text-sm font-bold text-cream">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

export default function AdminPanel() {
  const [sessionReady, setSessionReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [cats, setCats] = useState<DbCategory[]>([]);
  const [items, setItems] = useState<DbService[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [adminMode, setAdminMode] = useState<'services' | 'offers'>('services');

  const load = async () => {
    if (!supabase) return;
    setBusy(true);
    setMsg('');
    const [c, s] = await Promise.all([
      supabase.from('service_categories').select('*').order('sort_order'),
      supabase.from('services').select('*').order('sort_order'),
    ]);
    setBusy(false);
    if (c.error || s.error) {
      setMsg(c.error?.message || s.error?.message || 'Load failed');
      return;
    }
    const nextCats = (c.data || []) as DbCategory[];
    const nextItems = (s.data || []) as DbService[];
    setCats(nextCats);
    setItems(nextItems);
    const firstCategory = selectedCategory || nextCats[0]?.id || '';
    setSelectedCategory(firstCategory);
    const firstTreatment = nextItems.find((item) => item.category_id === firstCategory)?.id || '';
    setSelectedTreatment((current) => current || firstTreatment);
  };

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    const verifyAdmin = async (session: { user: { id: string } } | null) => {
      if (!session) {
        setLogged(false);
        setAccessDenied(false);
        setSessionReady(true);
        return;
      }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (error || profile?.role !== 'admin') {
        setLogged(false);
        setAccessDenied(true);
        setSessionReady(true);
        return;
      }
      setAccessDenied(false);
      setLogged(true);
      setSessionReady(true);
      load();
    };
    supabase.auth.getSession().then(({ data }) => verifyAdmin(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void verifyAdmin(session); });
    return () => data.subscription.unsubscribe();
  }, []);

  const cat = cats.find((c) => c.id === selectedCategory);
  const categoryItems = useMemo(
    () => items.filter((item) => item.category_id === selectedCategory),
    [items, selectedCategory],
  );
  const visibleTabs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categoryItems;
    return categoryItems.filter((item) => `${item.name_en} ${item.name_ar || ''}`.toLowerCase().includes(query));
  }, [categoryItems, search]);
  const active = items.find((item) => item.id === selectedTreatment && item.category_id === selectedCategory) || visibleTabs[0];

  useEffect(() => {
    if (!visibleTabs.length) {
      setSelectedTreatment('');
      return;
    }
    if (!visibleTabs.some((item) => item.id === selectedTreatment)) setSelectedTreatment(visibleTabs[0].id);
  }, [selectedCategory, search, visibleTabs.length]);

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearch('');
    const first = items.find((item) => item.category_id === categoryId);
    setSelectedTreatment(first?.id || '');
    setMsg('');
  };

  const patch = (id: string, values: Partial<DbService>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));
  };

  const save = async (item: DbService) => {
    if (!supabase) return;
    setBusy(true);
    setMsg('');
    const payload = {
      category_id: item.category_id,
      name_en: item.name_en.trim(),
      name_ar: item.name_ar?.trim() || null,
      description_en: item.description_en?.trim() || null,
      description_ar: item.description_ar?.trim() || null,
      price: String(item.price ?? '').trim(),
      package_price: item.package_price == null || String(item.package_price).trim() === '' ? null : String(item.package_price).trim(),
      image_url: item.image_url?.trim() || null,
      image_path: item.image_path || null,
      sort_order: item.sort_order,
      is_active: item.is_active,
    };
    const isNew = item.id.startsWith('new-');
    const query = isNew
      ? supabase.from('services').insert(payload).select().single()
      : supabase.from('services').update(payload).eq('id', item.id).select().single();
    const { data, error } = await query;
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    if (data) {
      setItems((current) => current.map((entry) => entry.id === item.id ? data as DbService : entry));
      setSelectedTreatment((data as DbService).id);
    }
    setMsg('Saved to Supabase.');
  };

  const add = () => {
    if (!selectedCategory) return;
    const item: DbService = {
      id: `new-${Date.now()}`,
      category_id: selectedCategory,
      name_en: 'New Treatment',
      name_ar: '',
      description_en: '',
      description_ar: '',
      price: '',
      package_price: null,
      image_url: null,
      image_path: null,
      sort_order: categoryItems.length + 1,
      is_active: true,
    };
    setItems((current) => [...current, item]);
    setSelectedTreatment(item.id);
    setSearch('');
  };

  const remove = async (item: DbService) => {
    if (!confirm(`Delete ${item.name_en}?`)) return;
    if (item.id.startsWith('new-')) {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedTreatment(categoryItems.find((entry) => entry.id !== item.id)?.id || '');
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.from('services').delete().eq('id', item.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setSelectedTreatment(categoryItems.find((entry) => entry.id !== item.id)?.id || '');
    setMsg('Treatment deleted.');
  };

  const upload = async (item: DbService, file?: File) => {
    if (!file || !supabase) return;
    setBusy(true);
    setMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${item.category_id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('service-images').upload(path, file, { upsert: false });
    if (error) {
      setBusy(false);
      setMsg(error.message);
      return;
    }
    const { data } = supabase.storage.from('service-images').getPublicUrl(path);
    patch(item.id, { image_url: data.publicUrl, image_path: path });
    setBusy(false);
    setMsg('Image uploaded. Click Save treatment to store the URL.');
  };

  if (!isSupabaseConfigured) return <div className="min-h-dvh bg-ivory p-8 text-charcoal"><div className="mx-auto max-w-xl rounded-2xl border border-gold/30 bg-cream p-6"><h1 className="font-serif text-3xl text-burgundy">Supabase key required</h1><p className="mt-3 text-sm leading-6 text-muted">Copy <b>.env.example</b> to <b>.env</b>, paste VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the Vite server.</p></div></div>;
  if (!sessionReady) return <div className="min-h-dvh bg-ivory" />;
  if (accessDenied) return <div className="min-h-dvh bg-ivory px-4 py-16 text-charcoal"><div className="mx-auto max-w-md rounded-3xl border border-blush bg-cream p-7 text-center shadow-xl"><img src="/images/logo.png" className="mx-auto h-20 w-auto" alt="Elaash" /><h1 className="mt-5 font-serif text-3xl text-burgundy">Admin access only</h1><p className="mt-3 text-sm leading-6 text-muted">This signed-in account is a customer account and cannot open the salon administration area.</p><button onClick={async () => { await supabase?.auth.signOut(); setAccessDenied(false); }} className="mt-6 h-11 w-full rounded-full bg-burgundy text-sm font-bold text-cream">Sign out and use admin account</button></div></div>;
  if (!logged) return <Login onReady={() => { window.location.reload(); }} />;

  return (
    <div className="admin-page min-h-dvh overflow-x-hidden bg-ivory text-charcoal">
      <header className="admin-header sticky top-0 z-30 border-b border-blush bg-cream/95 backdrop-blur-xl">
        <div className="admin-header-inner mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 sm:min-h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-7 sm:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/images/logo.png" className="h-10 w-auto shrink-0 sm:h-12" alt="Elaash" />
            <span className="h-8 w-px shrink-0 bg-gold/35" />
            <div className="min-w-0">
              <p className="truncate font-serif text-lg font-semibold text-burgundy">Elaash Admin</p>
              <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-gold">Supabase Live</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <a href="/" className="flex min-h-10 items-center justify-center rounded-full border border-blush px-3 py-2 text-center text-xs font-semibold text-burgundy sm:px-4">View website</a>
            <button onClick={() => supabase?.auth.signOut()} className="min-h-10 rounded-full bg-burgundy px-3 py-2 text-xs font-semibold text-cream sm:px-4">Sign out</button>
          </div>
        </div>
      </header>

      <div className="border-b border-blush bg-ivory">
        <div className="admin-category-scroll mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 py-2 sm:px-7">
          <button onClick={() => setAdminMode('services')} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold ${adminMode === 'services' ? 'border-burgundy bg-burgundy text-cream' : 'border-blush bg-cream text-burgundy'}`}>Services & Prices</button>
          <button onClick={() => setAdminMode('offers')} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold ${adminMode === 'offers' ? 'border-burgundy bg-burgundy text-cream' : 'border-blush bg-cream text-burgundy'}`}>Offers & Packages</button>
        </div>
      </div>

      {adminMode === 'services' ? (
      <div className="admin-shell mx-auto grid w-full max-w-[1500px] min-w-0 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="admin-sidebar min-w-0 border-b border-blush bg-cream px-4 py-3 lg:sticky lg:top-20 lg:h-[calc(100dvh-5rem)] lg:border-b-0 lg:border-r lg:p-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-gold lg:mb-3">Service sections</p>
          <div className="admin-category-scroll admin-section-tabs flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:pb-0">
            {cats.map((category) => <button key={category.id} onClick={() => selectCategory(category.id)} className={`flex shrink-0 snap-start items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm lg:w-full ${selectedCategory === category.id ? 'border-burgundy bg-burgundy text-cream' : 'border-blush bg-ivory text-charcoal'}`}><span className="whitespace-nowrap">{category.name_en}</span><span className="text-xs opacity-75">{items.filter((item) => item.category_id === category.id).length}</span></button>)}
          </div>
        </aside>

        <main className="admin-main min-w-0 w-full max-w-full px-4 py-5 sm:p-7 lg:p-9">
          <div className="admin-content mx-auto w-full max-w-6xl min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">{cat?.name_ar}</p>
                <h1 className="mt-0.5 break-words font-serif text-3xl leading-tight text-burgundy sm:text-4xl">{cat?.name_en || 'Services'}</h1>
              </div>
              <button onClick={add} className="min-h-11 w-full rounded-full border border-gold bg-cream px-4 py-2.5 text-xs font-bold text-burgundy sm:w-auto">+ Add treatment</button>
            </div>

            <input className={`${input} mb-3 sm:mb-4`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search treatments in this section" />

            <div className="mb-4 rounded-2xl border border-blush bg-cream p-2 shadow-sm sm:mb-6">
              <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.16em] text-gold">Treatments</p>
              <div className="admin-category-scroll admin-treatment-tabs flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto pb-1" role="tablist">
                {visibleTabs.map((item) => (
                  <button key={item.id} role="tab" aria-selected={active?.id === item.id} onClick={() => { setSelectedTreatment(item.id); setMsg(''); }} className={`min-h-10 shrink-0 snap-start rounded-full border px-4 py-2 text-xs font-semibold transition ${active?.id === item.id ? 'border-burgundy bg-burgundy text-cream' : 'border-blush bg-ivory text-charcoal hover:border-gold'}`}>{item.name_en || 'Untitled treatment'}</button>
                ))}
              </div>
            </div>

            {msg && <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-burgundy">{msg}</div>}
            {busy && <p className="mb-4 text-xs text-muted">Working with Supabase…</p>}

            {active ? (
              <article className="admin-editor min-w-0 max-w-full overflow-hidden rounded-2xl border border-blush bg-cream p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-7">
                <div className="mb-5 flex flex-col gap-3 border-b border-blush pb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[.17em] text-gold">Editing treatment</p>
                    <h2 className="mt-1 break-words font-serif text-2xl leading-tight text-burgundy">{active.name_en || 'Untitled treatment'}</h2>
                  </div>
                  <label className="flex min-h-10 items-center gap-2 self-start rounded-full border border-blush bg-ivory px-3 text-sm sm:self-auto">
                    <input type="checkbox" checked={active.is_active} onChange={(e) => patch(active.id, { is_active: e.target.checked })} /> Active on website
                  </label>
                </div>

                <div className="admin-form-grid grid min-w-0 gap-4 md:grid-cols-2">
                  <label><span className={label}>Treatment name — English</span><input className={input} value={active.name_en} onChange={(e) => patch(active.id, { name_en: e.target.value })} /></label>
                  <label dir="rtl"><span className={label}>Treatment name — العربية</span><input className={input} value={active.name_ar || ''} onChange={(e) => patch(active.id, { name_ar: e.target.value })} /></label>
                  <label><span className={label}>Price (AED)</span><input className={input} type="text" inputMode="decimal" placeholder="e.g. 155, 155–250 or 55+" value={active.price ?? ''} onChange={(e) => patch(active.id, { price: e.target.value })} /></label>
                  <label><span className={label}>Package price (optional)</span><input className={input} type="text" inputMode="decimal" placeholder="e.g. 505 or 725–900" value={active.package_price ?? ''} onChange={(e) => patch(active.id, { package_price: e.target.value })} /></label>
                  <label><span className={label}>Description — English</span><textarea className={textarea} rows={5} value={active.description_en || ''} onChange={(e) => patch(active.id, { description_en: e.target.value })} /></label>
                  <label dir="rtl"><span className={label}>Description — العربية</span><textarea className={textarea} rows={5} value={active.description_ar || ''} onChange={(e) => patch(active.id, { description_ar: e.target.value })} /></label>
                </div>

                <div className="admin-image-grid mt-5 grid min-w-0 gap-4 sm:mt-6 md:grid-cols-[220px_minmax(0,1fr)] md:gap-5">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-blush bg-ivory sm:max-w-sm md:max-w-none">{active.image_url ? <img src={active.image_url} className="h-full w-full object-cover" alt="Treatment preview" /> : <div className="flex h-full items-center justify-center px-5 text-center text-xs text-muted">No image URL is stored for this treatment yet.</div>}</div>
                  <div>
                    <label><span className={label}>Image URL</span><input className={input} value={active.image_url || ''} onChange={(e) => patch(active.id, { image_url: e.target.value, image_path: null })} placeholder="https://..." /></label>
                    <label className="mt-4 block"><span className={label}>Or upload image to Supabase Storage</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => upload(active, e.target.files?.[0])} className="admin-file-input block min-h-11 w-full max-w-full rounded-xl border border-dashed border-blush bg-ivory p-3 text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-burgundy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream" /></label>
                    {active.image_path && <p className="mt-2 text-[11px] text-muted">Storage path: {active.image_path}</p>}
                  </div>
                </div>

                <div className="admin-actions mt-6 grid grid-cols-1 gap-2 border-t border-blush pt-5 sm:mt-7 sm:flex sm:flex-wrap">
                  <button onClick={() => save(active)} className="min-h-11 rounded-full bg-burgundy px-6 py-2.5 text-xs font-bold text-cream">Save treatment</button>
                  <button onClick={() => remove(active)} className="min-h-11 rounded-full border border-blush px-6 py-2.5 text-xs font-bold text-burgundy">Delete treatment</button>
                </div>
              </article>
            ) : (
              <div className="rounded-2xl border border-dashed border-blush bg-cream p-10 text-center text-muted">No treatment selected in this section.</div>
            )}
          </div>
        </main>
      </div>
      ) : (
        <AdminOffers />
      )}
    </div>
  );
}
