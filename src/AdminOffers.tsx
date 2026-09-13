import { useEffect, useMemo, useState } from 'react';
import { offerOriginalPrice } from './lib/offers';
import { supabase } from './lib/supabase';

type Service = { id: string; category_id: string; name_en: string; name_ar: string | null; price: string | number; is_active: boolean };
type Category = { id: string; name_en: string; sort_order: number };
type PackageRow = {
  id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  offer_price: string;
  image_url: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
};
type LinkRow = { package_id: string; service_id: string; quantity: number };

const input = 'h-11 w-full rounded-xl border border-blush bg-ivory px-3.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/15';
const textarea = 'w-full rounded-xl border border-blush bg-ivory p-3 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/15';
const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';

export default function AdminOffers() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [selected, setSelected] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    if (!supabase) return;
    setBusy(true);
    setMsg('');
    const [p, s, c, l] = await Promise.all([
      supabase.from('package_offers').select('*').order('sort_order'),
      supabase.from('services').select('id,category_id,name_en,name_ar,price,is_active').order('sort_order'),
      supabase.from('service_categories').select('id,name_en,sort_order').order('sort_order'),
      supabase.from('package_offer_services').select('package_id,service_id,quantity'),
    ]);
    setBusy(false);
    const error = p.error || s.error || c.error || l.error;
    if (error) {
      setMsg(`${error.message} — If this is your first time opening Offers, run supabase/phase2_offers_packages.sql in Supabase.`);
      return;
    }
    const next = (p.data ?? []) as PackageRow[];
    setPackages(next);
    setServices((s.data ?? []) as Service[]);
    setCategories((c.data ?? []) as Category[]);
    setLinks((l.data ?? []) as LinkRow[]);
    setSelected((current) => current && next.some((item) => item.id === current) ? current : next[0]?.id ?? '');
  };

  useEffect(() => { load(); }, []);

  const active = packages.find((item) => item.id === selected);
  const activeLinks = useMemo(() => links.filter((link) => link.package_id === selected), [links, selected]);
  const selectedIds = useMemo(() => new Set(activeLinks.map((link) => link.service_id)), [activeLinks]);
  const calculatedOldPrice = useMemo(() => offerOriginalPrice(activeLinks.map((link) => {
    const service = services.find((item) => item.id === link.service_id);
    return { id: link.service_id, name: service?.name_en ?? '', nameAr: service?.name_ar ?? service?.name_en ?? '', price: service?.price ?? '', quantity: link.quantity };
  }).filter((item) => item.name)), [activeLinks, services]);

  const patch = (values: Partial<PackageRow>) => setPackages((current) => current.map((item) => item.id === selected ? { ...item, ...values } : item));

  const addPackage = () => {
    const id = `new-${Date.now()}`;
    const next: PackageRow = { id, name_en: 'New Package', name_ar: '', description_en: '', description_ar: '', offer_price: '', image_url: null, image_path: null, sort_order: packages.length + 1, is_active: true };
    setPackages((current) => [...current, next]);
    setSelected(id);
    setServiceSearch('');
    setMsg('Select the treatments included, set the offer price, then save.');
  };

  const toggleService = (serviceId: string) => {
    if (!selected) return;
    setLinks((current) => {
      const exists = current.some((link) => link.package_id === selected && link.service_id === serviceId);
      return exists
        ? current.filter((link) => !(link.package_id === selected && link.service_id === serviceId))
        : [...current, { package_id: selected, service_id: serviceId, quantity: 1 }];
    });
  };

  const setQuantity = (serviceId: string, quantity: number) => setLinks((current) => current.map((link) => link.package_id === selected && link.service_id === serviceId ? { ...link, quantity: Math.max(1, quantity || 1) } : link));

  const save = async () => {
    if (!supabase || !active) return;
    if (!active.name_en.trim() || !active.offer_price.trim()) { setMsg('Package name and offer price are required.'); return; }
    if (!activeLinks.length) { setMsg('Select at least one treatment for this package.'); return; }
    setBusy(true); setMsg('');
    const payload = {
      name_en: active.name_en.trim(), name_ar: active.name_ar?.trim() || null,
      description_en: active.description_en?.trim() || null, description_ar: active.description_ar?.trim() || null,
      offer_price: active.offer_price.trim(), image_url: active.image_url?.trim() || null, image_path: active.image_path || null,
      sort_order: active.sort_order, is_active: active.is_active,
    };
    let packageId = active.id;
    if (active.id.startsWith('new-')) {
      const { data, error } = await supabase.from('package_offers').insert(payload).select().single();
      if (error || !data) { setBusy(false); setMsg(error?.message || 'Could not create package.'); return; }
      packageId = data.id;
    } else {
      const { error } = await supabase.from('package_offers').update(payload).eq('id', active.id);
      if (error) { setBusy(false); setMsg(error.message); return; }
      const { error: deleteError } = await supabase.from('package_offer_services').delete().eq('package_id', active.id);
      if (deleteError) { setBusy(false); setMsg(deleteError.message); return; }
    }
    const relationPayload = activeLinks.map((link) => ({ package_id: packageId, service_id: link.service_id, quantity: link.quantity }));
    const { error: linkError } = await supabase.from('package_offer_services').insert(relationPayload);
    setBusy(false);
    if (linkError) { setMsg(linkError.message); return; }
    setMsg('Package saved to Supabase.');
    await load();
    setSelected(packageId);
  };

  const remove = async () => {
    if (!active || !confirm(`Delete ${active.name_en}?`)) return;
    if (active.id.startsWith('new-')) {
      setPackages((current) => current.filter((item) => item.id !== active.id));
      setLinks((current) => current.filter((link) => link.package_id !== active.id));
      setSelected(packages.find((item) => item.id !== active.id)?.id ?? '');
      return;
    }
    if (!supabase) return;
    const { error } = await supabase.from('package_offers').delete().eq('id', active.id);
    if (error) { setMsg(error.message); return; }
    setPackages((current) => current.filter((item) => item.id !== active.id));
    setLinks((current) => current.filter((link) => link.package_id !== active.id));
    setSelected(packages.find((item) => item.id !== active.id)?.id ?? '');
    setMsg('Package deleted.');
  };

  const upload = async (file?: File) => {
    if (!file || !supabase || !active) return;
    setBusy(true); setMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `packages/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('offer-images').upload(path, file, { upsert: false });
    if (error) { setBusy(false); setMsg(error.message); return; }
    const { data } = supabase.storage.from('offer-images').getPublicUrl(path);
    patch({ image_url: data.publicUrl, image_path: path });
    setBusy(false); setMsg('Image uploaded. Save package to store it.');
  };

  const filteredServices = services.filter((service) => {
    const q = serviceSearch.trim().toLowerCase();
    return service.is_active && (!q || `${service.name_en} ${service.name_ar || ''}`.toLowerCase().includes(q));
  });

  return (
    <main className="admin-main min-w-0 w-full max-w-full px-4 py-5 sm:p-7 lg:p-9">
      <div className="admin-content mx-auto w-full max-w-6xl min-w-0">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Offers & Packages</p><h1 className="font-serif text-3xl text-burgundy sm:text-4xl">Package Builder</h1><p className="mt-1 text-sm text-muted">Choose treatments, and the regular total is calculated from their current prices.</p></div>
          <button onClick={addPackage} className="min-h-11 rounded-full border border-gold bg-cream px-5 text-xs font-bold text-burgundy">+ New package</button>
        </div>

        <div className="mb-5 rounded-2xl border border-blush bg-cream p-2 shadow-sm">
          <div className="admin-category-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
            {packages.map((item) => <button key={item.id} onClick={() => { setSelected(item.id); setMsg(''); }} className={`min-h-10 shrink-0 snap-start rounded-full border px-4 text-xs font-semibold ${selected === item.id ? 'border-burgundy bg-burgundy text-cream' : 'border-blush bg-ivory text-charcoal'}`}>{item.name_en}</button>)}
            {!packages.length && <p className="px-3 py-2 text-xs text-muted">No packages yet. Create the first one.</p>}
          </div>
        </div>

        {msg && <div className="mb-5 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-burgundy">{msg}</div>}
        {busy && <p className="mb-4 text-xs text-muted">Working with Supabase…</p>}

        {active && (
          <article className="admin-editor min-w-0 overflow-hidden rounded-2xl border border-blush bg-cream p-4 shadow-sm sm:rounded-3xl sm:p-6 lg:p-7">
            <div className="mb-5 flex flex-col gap-3 border-b border-blush pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-gold">Editing package</p><h2 className="mt-1 font-serif text-2xl text-burgundy">{active.name_en}</h2></div>
              <label className="flex min-h-10 items-center gap-2 self-start rounded-full border border-blush bg-ivory px-3 text-sm"><input type="checkbox" checked={active.is_active} onChange={(e) => patch({ is_active: e.target.checked })} /> Active on website</label>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label><span className={label}>Package name — English</span><input className={input} value={active.name_en} onChange={(e) => patch({ name_en: e.target.value })} /></label>
              <label dir="rtl"><span className={label}>Package name — العربية</span><input className={input} value={active.name_ar || ''} onChange={(e) => patch({ name_ar: e.target.value })} /></label>
              <label><span className={label}>New offer price (AED)</span><input className={input} type="text" inputMode="decimal" placeholder="e.g. 299 or 499" value={active.offer_price} onChange={(e) => patch({ offer_price: e.target.value })} /></label>
              <div><span className={label}>Regular total — automatic</span><div className="flex h-11 items-center rounded-xl border border-blush bg-blush-light px-3.5 text-sm"><span className="line-through text-muted">{calculatedOldPrice || 'Select treatments below'}</span></div></div>
              <label><span className={label}>Description — English</span><textarea className={textarea} rows={4} value={active.description_en || ''} onChange={(e) => patch({ description_en: e.target.value })} /></label>
              <label dir="rtl"><span className={label}>Description — العربية</span><textarea className={textarea} rows={4} value={active.description_ar || ''} onChange={(e) => patch({ description_ar: e.target.value })} /></label>
            </div>

            <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-blush bg-ivory">{active.image_url ? <img src={active.image_url} className="h-full w-full object-cover" alt="Package preview" /> : <div className="flex h-full items-center justify-center px-5 text-center text-xs text-muted">Optional package image</div>}</div>
              <div><label><span className={label}>Image URL</span><input className={input} value={active.image_url || ''} onChange={(e) => patch({ image_url: e.target.value, image_path: null })} placeholder="https://..." /></label><label className="mt-4 block"><span className={label}>Or upload to offer-images Storage</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} className="block min-h-11 w-full rounded-xl border border-dashed border-blush bg-ivory p-3 text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-burgundy file:px-3 file:py-2 file:text-xs file:font-semibold file:text-cream" /></label></div>
            </div>

            <div className="mt-6 border-t border-blush pt-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-gold">Treatments included</p><p className="mt-1 text-sm text-muted">Select as many treatments as needed. Quantity can be changed for repeated treatments.</p></div><input className={`${input} sm:max-w-xs`} value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Search treatments" /></div>
              <div className="max-h-[360px] space-y-4 overflow-y-auto rounded-2xl border border-blush bg-ivory p-3" data-touch-scroll>
                {categories.map((category) => {
                  const rows = filteredServices.filter((service) => service.category_id === category.id);
                  if (!rows.length) return null;
                  return <div key={category.id}><p className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-gold">{category.name_en}</p><div className="grid gap-2 sm:grid-cols-2">{rows.map((service) => {
                    const checked = selectedIds.has(service.id); const link = activeLinks.find((entry) => entry.service_id === service.id);
                    return <div key={service.id} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 ${checked ? 'border-gold bg-cream' : 'border-blush bg-white/50'}`}><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"><input type="checkbox" checked={checked} onChange={() => toggleService(service.id)} /><span className="min-w-0"><span className="block truncate text-xs font-semibold text-charcoal">{service.name_en}</span><span className="text-[11px] text-muted">AED {String(service.price)}</span></span></label>{checked && <input aria-label="Quantity" type="number" min="1" max="20" value={link?.quantity || 1} onChange={(e) => setQuantity(service.id, Number(e.target.value))} className="h-9 w-14 rounded-lg border border-blush bg-ivory px-2 text-center text-xs" />}</div>;
                  })}</div></div>;
                })}
              </div>
            </div>

            <div className="admin-actions mt-6 grid gap-2 border-t border-blush pt-5 sm:flex">
              <button onClick={save} className="min-h-11 rounded-full bg-burgundy px-6 text-xs font-bold text-cream">Save package</button>
              <button onClick={remove} className="min-h-11 rounded-full border border-blush px-6 text-xs font-bold text-burgundy">Delete package</button>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
