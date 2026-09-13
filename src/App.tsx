import { useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from './lib/catalog';
import { offerOriginalPrice, useOffers, type OfferPackage } from './lib/offers';
import { supabase } from './lib/supabase';
import type { Category, Service } from './data/services';

const WA_NUMBER = '971545006642';
const PHONE_NUMBER = '0545006642';
const MAP_EMBED_URL = 'https://www.google.com/maps?q=Elaash%20Beauty%20Ladies%20Salon%20Al%20Nahyan%20Abu%20Dhabi&output=embed';
const INSTAGRAM_URL = 'https://www.instagram.com/elaash_beauty?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==';
const INSTAGRAM_EMBED_URL = 'https://www.instagram.com/elaash_beauty/embed';
const FACEBOOK_URL = 'https://www.facebook.com/share/1BsGojqrsp/?mibextid=wwXIfr';
const SECTION_IDS = ['home', 'services', 'offers', 'about', 'gallery', 'contact'] as const;
type SectionId = typeof SECTION_IDS[number] | 'instagram';
const MOBILE_SECTION_ORDER: SectionId[] = ['home', 'services', 'offers', 'about', 'gallery', 'instagram', 'contact'];

const labels = {
  nav: {
    home: ['Home', 'الرئيسية'],
    services: ['Services & Prices', 'الخدمات والأسعار'],
    offers: ['Offers & Packages', 'العروض والباقات'],
    about: ['About', 'عن الصالون'],
    gallery: ['Gallery', 'المعرض'],
    contact: ['Contact', 'التواصل'],
  },
  book: ['Book', 'احجزي'],
  bookNow: ['Book Now', 'احجزي الآن'],
  search: ['Search treatments', 'ابحثي عن علاج'],
  clear: ['Clear search', 'مسح البحث'],
  previousPage: ['Previous service page', 'صفحة الخدمات السابقة'],
  nextPage: ['Next service page', 'صفحة الخدمات التالية'],
  previousCategory: ['Previous category', 'القسم السابق'],
  nextCategory: ['Next category', 'القسم التالي'],
  viewDetails: ['View details', 'عرض التفاصيل'],
  hideDetails: ['Hide details', 'إخفاء التفاصيل'],
  noResults: ['No treatments found', 'لا توجد نتائج'],
  noResultsHint: ['Try another treatment name or clear search.', 'جرّبي اسم خدمة آخر أو امسحي البحث.'],
  detailsFallback: ['A salon treatment prepared with attentive care.', 'خدمة صالون تُقدَّم بعناية واهتمام.'],
  customerName: ['Customer name', 'اسم العميلة'],
  preferredDate: ['Preferred date', 'التاريخ المفضل'],
  preferredTime: ['Preferred time', 'الوقت المفضل'],
  optionalMessage: ['Optional message', 'رسالة اختيارية'],
  continueWhatsApp: ['Continue on WhatsApp', 'متابعة عبر واتساب'],
  close: ['Close', 'إغلاق'],
  price: ['Price', 'السعر'],
  package: ['5 Sessions', '5 جلسات'],
  confirmWhatsApp: ['Confirm on WhatsApp', 'التأكيد عبر واتساب'],
};

function tr(value: string[], isArabic: boolean) {
  return value[isArabic ? 1 : 0];
}

function clean(value: string | number | undefined) {
  return String(value ?? '');
}

function categoryLabel(category: Category, isArabic: boolean) {
  return isArabic ? clean(category.nameAr) : clean(category.name);
}

function serviceName(service: Service, isArabic: boolean) {
  return isArabic ? clean(service.nameAr) : clean(service.name);
}

function formatPrice(value: Service['price'] | undefined, isPackage = false, isArabic = false) {
  if (value === undefined || value === null || value === 0 || value === '') return tr(labels.confirmWhatsApp, isArabic);
  const raw = clean(value);
  const amount = raw.endsWith('+') ? `From AED ${raw.slice(0, -1)}` : `AED ${raw}`;
  return isPackage ? `${tr(labels.package, isArabic)} · ${amount}` : amount;
}

function generalWhatsAppUrl(isArabic: boolean) {
  const message = isArabic
    ? 'مرحباً Elaash Beauty، أود حجز موعد.'
    : 'Hello Elaash Beauty, I would like to book an appointment.';
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
}

function serviceImage(service: Service) {
  return service.image || '';
}

function getGridConfig(width: number, height: number) {
  if (width >= 1600) return { columns: 6, rows: 3 };
  if (width >= 1200) return { columns: 5, rows: height < 760 ? 2 : 3 };
  if (width >= 900) return { columns: 4, rows: 2 };
  if (width >= 640) return { columns: 3, rows: 2 };
  return { columns: 2, rows: 2 };
}

function useGridConfig() {
  const [config, setConfig] = useState(() => (
    typeof window === 'undefined' ? { columns: 5, rows: 3 } : getGridConfig(window.innerWidth, window.innerHeight)
  ));

  useEffect(() => {
    const update = () => setConfig(getGridConfig(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return config;
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.7 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3V10H7.5v3h2.8v8h3.4Z" />
    </svg>
  );
}

function BrandMark({ isArabic, compact = false, showHeaderName = false }: { isArabic: boolean; compact?: boolean; showHeaderName?: boolean }) {
  const [logoError, setLogoError] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const showText = logoError || !logoLoaded;

  return (
    <span className={`flex items-center gap-3 ${isArabic ? 'flex-row-reverse text-right' : 'text-left'}`}>
      {!logoError && (
        <img
          src="/images/logo.png"
          alt="Elaash Beauty Ladies Salon"
          onLoad={() => setLogoLoaded(true)}
          onError={() => setLogoError(true)}
          className={`${compact ? 'max-h-11 sm:max-h-12' : 'max-h-11 sm:max-h-14'} ${logoLoaded ? 'block' : 'hidden'} w-auto object-contain`}
        />
      )}
      {(showText || showHeaderName) && (
        <span
          className={`flex flex-col justify-center leading-none ${isArabic ? 'items-end border-r pr-3' : 'items-start border-l pl-3'} border-gold/35`}
        >
          <span className="font-serif text-[15px] font-semibold tracking-[0.015em] text-burgundy sm:text-[17px]">
            {showHeaderName ? 'Elaash Salon' : 'Elaash Beauty'}
          </span>
          <span className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.28em] text-gold sm:text-[9px]">
            {showHeaderName ? 'Abu Dhabi' : 'Ladies Salon · Abu Dhabi'}
          </span>
        </span>
      )}
    </span>
  );
}

function SectionNextButton({ targetId, label, ariaLabel, onNavigate }: { targetId: SectionId; label: string; ariaLabel: string; onNavigate: (id: SectionId) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(targetId)}
      aria-label={ariaLabel}
      className="section-next-button"
    >
      <span>{label}</span>
      <span className="section-next-arrow" aria-hidden="true">↓</span>
    </button>
  );
}

function BookingDrawer({ service, isArabic, onClose }: { service: Service | null; isArabic: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!service) return;
    setName('');
    setDate('');
    setTime('');
    setMessage('');
    setSent(false);
  }, [service]);

  if (!service) return null;

  const categoryText = isArabic ? clean(service.categoryNameAr) : clean(service.categoryName);
  const displayName = serviceName(service, isArabic);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const lines = isArabic
      ? [
          'مرحباً Elaash Beauty، أود حجز موعد.',
          '',
          `الخدمة: ${displayName}`,
          `القسم: ${categoryText}`,
          `السعر: ${formatPrice(service.price, false, isArabic)}`,
          service.packagePrice ? `باقة 5 جلسات: ${formatPrice(service.packagePrice, false, isArabic)}` : '',
          `اسم العميلة: ${name || 'غير محدد'}`,
          `التاريخ المفضل: ${date || 'مرن'}`,
          `الوقت المفضل: ${time || 'مرن'}`,
          message ? `رسالة إضافية: ${message}` : '',
        ]
      : [
          'Hello Elaash Beauty, I would like to book an appointment.',
          '',
          `Service: ${displayName}`,
          `Category: ${categoryText}`,
          `Individual price: ${formatPrice(service.price)}`,
          service.packagePrice ? `Five-session price: ${formatPrice(service.packagePrice)}` : '',
          `Customer name: ${name || 'Not specified'}`,
          `Preferred date: ${date || 'Flexible'}`,
          `Preferred time: ${time || 'Flexible'}`,
          message ? `Message: ${message}` : '',
        ];

    setSent(true);
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-charcoal/55 backdrop-blur-sm" onClick={onClose} aria-label={tr(labels.close, isArabic)} />
      <aside className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream shadow-2xl sm:h-full sm:max-h-none sm:w-[460px] sm:rounded-none">
        <div className="bg-burgundy p-6 text-cream">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gold">{tr(labels.bookNow, isArabic)}</p>
              <h3 className="font-serif text-2xl leading-tight">{displayName}</h3>
              <p className="mt-2 text-sm text-cream/70">{categoryText}</p>
            </div>
            <button onClick={onClose} className="rounded-full px-2 text-3xl leading-none text-cream/70 hover:text-cream focus:outline-none focus:ring-2 focus:ring-gold" aria-label={tr(labels.close, isArabic)}>
              x
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-cream/10 p-3">
              <span className="block text-cream/60">{tr(labels.price, isArabic)}</span>
              <strong className="text-gold">{formatPrice(service.price, false, isArabic)}</strong>
            </div>
            <div className="rounded-xl bg-cream/10 p-3">
              <span className="block text-cream/60">{tr(labels.package, isArabic)}</span>
              <strong className="text-gold">{service.packagePrice ? formatPrice(service.packagePrice, false, isArabic) : '-'}</strong>
            </div>
          </div>
        </div>

        {sent ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]"><WhatsAppIcon size={28} /></div>
            <h4 className="font-serif text-2xl text-burgundy">{isArabic ? 'يتم فتح واتساب' : 'Opening WhatsApp'}</h4>
            <p className="text-sm text-muted">{isArabic ? 'رسالة الحجز جاهزة للإرسال.' : 'Your booking message is ready to send.'}</p>
            <button onClick={onClose} className="rounded-full bg-burgundy px-7 py-3 text-sm font-semibold text-cream hover:bg-burgundy-dark focus:outline-none focus:ring-2 focus:ring-gold">
              {tr(labels.close, isArabic)}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
              {tr(labels.customerName, isArabic)}
              <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded-xl border border-blush bg-ivory px-4 py-3 text-sm font-normal normal-case tracking-normal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
              {tr(labels.preferredDate, isArabic)}
              <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required className="mt-1 w-full rounded-xl border border-blush bg-ivory px-4 py-3 text-sm font-normal normal-case tracking-normal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
              {tr(labels.preferredTime, isArabic)}
              <select value={time} onChange={(event) => setTime(event.target.value)} required className="mt-1 w-full rounded-xl border border-blush bg-ivory px-4 py-3 text-sm font-normal normal-case tracking-normal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20">
                <option value="">{isArabic ? 'اختاري الوقت' : 'Select a time'}</option>
                {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map((slot) => <option key={slot}>{slot}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal">
              {tr(labels.optionalMessage, isArabic)}
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded-xl border border-blush bg-ivory px-4 py-3 text-sm font-normal normal-case tracking-normal focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20" />
            </label>
            <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-6 py-4 font-semibold text-white shadow-lg hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40">
              <WhatsAppIcon />
              {tr(labels.continueWhatsApp, isArabic)}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}

function Nav({ active, onNavigate, isArabic, setIsArabic, setBooking }: { active: SectionId; onNavigate: (id: SectionId) => void; isArabic: boolean; setIsArabic: (value: boolean) => void; setBooking: (service: Service) => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let activeListener = true;

    const syncCustomer = async () => {
      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!activeListener) return;
      if (!session) {
        setCustomerName(null);
        return;
      }

      const metadataName = String(session.user.user_metadata?.full_name || '').trim();
      const fallback = metadataName || String(session.user.email || '').split('@')[0];
      const { data: profile } = await client.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (!activeListener) return;
      setCustomerName(String(profile?.full_name || fallback || 'Customer').trim());
    };

    syncCustomer();
    const { data: listener } = client.auth.onAuthStateChange(() => { void syncCustomer(); });
    return () => {
      activeListener = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const navigate = (id: SectionId) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <nav className={`fixed inset-x-0 top-0 z-40 transition ${scrolled || open ? 'bg-cream shadow-md' : 'bg-cream/95 backdrop-blur-sm'}`}>
      <div data-site-header-bar className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <a
          href="#home"
          onClick={(event) => {
            event.preventDefault();
            navigate('home');
          }}
          aria-label="Elaash Beauty Ladies Salon - Home"
          className="focus:outline-none focus:ring-2 focus:ring-gold"
        >
          <BrandMark isArabic={isArabic} showHeaderName />
        </a>
        <div className="hidden items-center gap-1 lg:flex">
          {SECTION_IDS.map((id) => (
            <button key={id} onClick={() => navigate(id)} className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-gold ${active === id ? 'bg-burgundy text-cream' : 'text-charcoal hover:bg-blush-light hover:text-burgundy'}`}>
              {tr(labels.nav[id], isArabic)}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <button onClick={() => setIsArabic(!isArabic)} className="rounded-full px-3 py-2 text-xs font-semibold text-muted hover:text-burgundy focus:outline-none focus:ring-2 focus:ring-gold">{isArabic ? 'EN' : 'العربية'}</button>
          {customerName ? (
            <a href="/account" className="max-w-[180px] truncate rounded-full border border-gold/35 bg-gold/10 px-4 py-2.5 text-sm font-semibold text-burgundy transition hover:bg-blush-light focus:outline-none focus:ring-2 focus:ring-gold">
              {isArabic ? `مرحباً ${customerName}` : `Welcome, ${customerName}`}
            </a>
          ) : (
            <a href="/login" className="rounded-full border border-blush px-4 py-2.5 text-sm font-semibold text-burgundy transition hover:border-gold hover:bg-blush-light focus:outline-none focus:ring-2 focus:ring-gold">{isArabic ? 'تسجيل الدخول' : 'Sign in'}</a>
          )}
          <a href="/book" className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-cream hover:bg-burgundy-dark focus:outline-none focus:ring-2 focus:ring-gold">
            {tr(labels.bookNow, isArabic)}
          </a>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <button onClick={() => setIsArabic(!isArabic)} className="rounded-full px-3 py-2 text-xs font-semibold text-muted focus:outline-none focus:ring-2 focus:ring-gold">{isArabic ? 'EN' : 'ع'}</button>
          <button onClick={() => setOpen(!open)} className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-gold" aria-expanded={open} aria-label="Menu">
            <span className={`h-0.5 w-5 bg-burgundy transition ${open ? 'translate-y-2 rotate-45' : ''}`} />
            <span className={`h-0.5 w-5 bg-burgundy transition ${open ? 'opacity-0' : ''}`} />
            <span className={`h-0.5 w-5 bg-burgundy transition ${open ? '-translate-y-2 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-blush bg-cream px-5 py-4 shadow-lg lg:hidden">
          {SECTION_IDS.map((id) => (
            <button key={id} onClick={() => navigate(id)} className={`mb-1 block w-full rounded-xl px-4 py-3 text-sm font-semibold ${isArabic ? 'text-right' : 'text-left'} ${active === id ? 'bg-burgundy text-cream' : 'text-charcoal hover:bg-blush-light'}`}>
              {tr(labels.nav[id], isArabic)}
            </button>
          ))}
          {customerName ? (
            <a href="/account" className={`mt-2 block w-full rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-bold text-burgundy ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? `مرحباً ${customerName}` : `Welcome, ${customerName}`}</a>
          ) : (
            <a href="/login" className={`mt-2 block w-full rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-bold text-burgundy ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'تسجيل الدخول / حسابي' : 'Sign in / My Elaash'}</a>
          )}
        </div>
      )}
    </nav>
  );
}

function Hero({ onNavigate, isArabic }: { onNavigate: (id: SectionId) => void; isArabic: boolean }) {
  return (
    <section id="home" className="relative flex min-h-screen scroll-mt-24 items-center justify-center overflow-hidden pb-24">
      <img src="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1920&h=1080&fit=crop&auto=format" alt="Luxury spa" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-burgundy-dark/80 via-burgundy-dark/70 to-burgundy-dark/90" />
      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-gold sm:text-sm">{isArabic ? 'النهيان · أبوظبي' : 'Al Nahyan · Abu Dhabi'}</p>
        <h1 className="font-serif text-4xl font-semibold leading-tight text-cream sm:text-6xl lg:text-7xl">Elaash Beauty<span className="mt-1 block text-3xl font-normal italic text-gold sm:text-5xl">{isArabic ? 'صالون سيدات' : 'Ladies Salon'}</span></h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream/75 sm:text-lg">{isArabic ? 'علاجات جمال وشعر وعافية فاخرة للسيدات في قلب أبوظبي.' : 'Premium beauty, hair and wellness treatments for women in the heart of Abu Dhabi.'}</p>
        <div className="mx-auto mt-10 flex w-full max-w-[240px] flex-col justify-center gap-3">
          <a href={generalWhatsAppUrl(isArabic)} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 py-4 font-semibold text-white shadow-lg hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"><WhatsAppIcon size={18} />{isArabic ? 'احجزي عبر واتساب' : 'Book on WhatsApp'}</a>
          <div className="[&>button]:w-full [&>button]:min-h-[56px]">
            <SectionNextButton
              targetId="services"
              label={isArabic ? 'استكشفي الخدمات' : 'Explore Services'}
              ariaLabel={isArabic ? 'استكشفي الخدمات' : 'Explore Services'}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, isArabic, onBook }: { service: Service; isArabic: boolean; onBook: (service: Service) => void }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const detailText = clean((isArabic ? service.descriptionAr : service.description) || `${serviceName(service, isArabic)} ${tr(labels.detailsFallback, isArabic)}`);

  return (
    <article
      onClick={() => setDetailsOpen(true)}
      className="service-card group relative aspect-[1/0.82] overflow-hidden rounded-[16px] border border-cream/40 bg-gradient-to-br from-burgundy via-burgundy-dark to-charcoal shadow-[0_7px_18px_rgba(107,29,42,0.11)] transition duration-300 hover:-translate-y-0.5 hover:border-gold/80 hover:shadow-[0_12px_28px_rgba(107,29,42,0.16)]"
    >
        {!imageFailed && serviceImage(service) && (
        <img src={serviceImage(service)} alt={service.name} loading="lazy" onError={() => setImageFailed(true)} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        )}
      <div className="absolute inset-0 bg-gradient-to-t from-burgundy-dark via-burgundy-dark/42 to-burgundy-dark/10 transition duration-300 group-hover:from-burgundy-dark group-hover:via-burgundy-dark/62" />
      <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-center justify-between gap-2">
        <span className="truncate border-l border-gold pl-2 text-[8px] font-semibold uppercase tracking-widest text-cream/80">
          {isArabic ? service.categoryNameAr : service.categoryName}
        </span>
        {service.packagePrice && (
          <span className="shrink-0 rounded-full bg-gold/90 px-1.5 py-0.5 text-[8px] font-bold text-burgundy-dark">
            5x
          </span>
        )}
      </div>
      <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1.5">
        <div>
          <h3 className="line-clamp-2 font-serif text-[clamp(0.76rem,1vw,0.92rem)] leading-tight text-cream drop-shadow">
            {serviceName(service, isArabic)}
          </h3>
          <p className="mt-0.5 text-[clamp(0.68rem,0.9vw,0.8rem)] font-bold text-gold">
            {formatPrice(service.price, false, isArabic)}
          </p>
          {service.packagePrice && <p className="line-clamp-1 text-[9px] font-semibold text-cream/80">{formatPrice(service.packagePrice, true, isArabic)}</p>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDetailsOpen(true);
            }}
            className="text-[9px] font-semibold text-cream/80 hover:text-gold md:hidden"
          >
            {tr(labels.viewDetails, isArabic)}
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onBook(service);
            }}
            className="ml-auto inline-flex h-7 items-center rounded-full border border-cream/55 bg-burgundy-dark/20 px-2.5 text-[10px] font-semibold text-cream backdrop-blur transition hover:border-gold hover:bg-gold hover:text-burgundy-dark focus:outline-none focus:ring-2 focus:ring-gold"
          >
            {tr(labels.book, isArabic)}
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-2.5 bottom-[4.9rem] hidden translate-y-2 rounded-xl border border-cream/15 bg-burgundy-dark/62 p-2 text-[10px] leading-relaxed text-cream/88 opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block">
        {detailText}
      </div>

      {detailsOpen && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between bg-burgundy-dark/92 p-4 text-cream backdrop-blur-sm md:hidden">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setDetailsOpen(false);
            }}
            className="ml-auto h-8 rounded-full border border-cream/35 px-3 text-xs font-semibold"
          >
            {tr(labels.close, isArabic)}
          </button>
          <p className="text-xs leading-relaxed text-cream/85">{detailText}</p>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onBook(service);
            }}
            className="h-8 self-start rounded-full border border-gold px-3 text-[11px] font-semibold text-gold"
          >
            {tr(labels.book, isArabic)}
          </button>
        </div>
      )}
    </article>
  );
}

function ServicesSection({ isArabic, setBooking, onNavigate }: { isArabic: boolean; setBooking: (service: Service) => void; onNavigate: (id: SectionId) => void }) {
  const { services, categories, loading, error } = useCatalog();
  const orderedCategories = categories;
  const [activeCategory, setActiveCategory] = useState('');
  const [pages, setPages] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [tabScroll, setTabScroll] = useState({ atStart: true, atEnd: true });
  const gridConfig = useGridConfig();
  const pageSize = gridConfig.columns * gridConfig.rows;
  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  const didMountTabsRef = useRef(false);
  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const resultKey = isSearching ? '__search' : activeCategory;
  const currentPage = pages[resultKey] ?? 1;

  useEffect(() => {
    if (!activeCategory && orderedCategories.length) setActiveCategory(orderedCategories[0].id);
    else if (activeCategory && orderedCategories.length && !orderedCategories.some((category) => category.id === activeCategory)) setActiveCategory(orderedCategories[0].id);
  }, [activeCategory, orderedCategories]);

  const visibleServices = useMemo(() => {
    if (isSearching) {
      return services.filter((service) => `${service.name} ${service.nameAr} ${service.description ?? ''} ${service.descriptionAr ?? ''}`.toLowerCase().includes(query));
    }
    return services.filter((service) => service.category === activeCategory);
  }, [services, activeCategory, isSearching, query]);

  const totalPages = Math.max(1, Math.ceil(visibleServices.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = visibleServices.slice(start, start + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) setPages((value) => ({ ...value, [resultKey]: totalPages }));
  }, [currentPage, resultKey, totalPages]);

  useEffect(() => {
    if (!didMountTabsRef.current) {
      didMountTabsRef.current = true;
      window.setTimeout(updateTabScrollState, 0);
      return;
    }

    const tabContainer = tabScrollerRef.current;
    const activeTab = tabsRef.current[activeCategory];
    if (tabContainer && activeTab) {
      const targetLeft = activeTab.offsetLeft - tabContainer.clientWidth / 2 + activeTab.clientWidth / 2;
      tabContainer.scrollTo({
        left: targetLeft,
        behavior: 'smooth',
      });
    }
    window.setTimeout(updateTabScrollState, 320);
  }, [activeCategory, isArabic]);

  const updateTabScrollState = () => {
    const node = tabScrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    if (max <= 1) {
      setTabScroll({ atStart: true, atEnd: true });
      return;
    }
    const position = Math.abs(node.scrollLeft);
    setTabScroll({
      atStart: position <= 2,
      atEnd: position >= max - 2,
    });
  };

  useEffect(() => {
    updateTabScrollState();
    const node = tabScrollerRef.current;
    if (!node) return;
    node.addEventListener('scroll', updateTabScrollState, { passive: true });
    window.addEventListener('resize', updateTabScrollState);
    return () => {
      node.removeEventListener('scroll', updateTabScrollState);
      window.removeEventListener('resize', updateTabScrollState);
    };
  }, [isArabic]);

  const chooseCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setPages((value) => ({ ...value, [categoryId]: 1 }));
    setSearch('');
  };

  const setPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setPages((value) => ({ ...value, [resultKey]: nextPage }));
  };

  const activeIndex = orderedCategories.findIndex((category) => category.id === activeCategory);
  const scrollTabs = (direction: -1 | 1) => {
    const node = tabScrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * 260 * (isArabic ? -1 : 1), behavior: 'smooth' });
    window.setTimeout(updateTabScrollState, 320);
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = (event.key === 'ArrowRight') !== isArabic ? 1 : -1;
    if (!orderedCategories.length) return;
    const baseIndex = activeIndex < 0 ? 0 : activeIndex;
    const next = orderedCategories[(baseIndex + direction + orderedCategories.length) % orderedCategories.length];
    chooseCategory(next.id);
    window.setTimeout(() => tabsRef.current[next.id]?.focus(), 0);
  };

  return (
    <section id="services" className="services-section scroll-mt-20 bg-ivory px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="services-intro mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:items-end">
          <div>
            <p data-scroll-anchor className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gold">{tr(labels.nav.services, isArabic)}</p>
            <h2 className="services-title font-serif text-2xl leading-tight text-burgundy sm:text-3xl lg:text-4xl">{isArabic ? 'كتالوج علاجات مصور' : 'Compact Premium Service Catalogue'}</h2>
          </div>
          <div className="relative">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPages((value) => ({ ...value, __search: 1 })); }} placeholder={tr(labels.search, isArabic)} className={`services-search h-9 w-full rounded-full border border-blush bg-cream px-4 text-sm shadow-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 ${isArabic ? 'pl-10 text-right' : 'pr-10'}`} />
            {search && <button onClick={() => { setSearch(''); setPages((value) => ({ ...value, [activeCategory]: value[activeCategory] ?? 1 })); }} className={`absolute top-1/2 -translate-y-1/2 rounded-full px-2 text-lg text-muted hover:text-charcoal ${isArabic ? 'left-3' : 'right-3'}`} aria-label={tr(labels.clear, isArabic)}>x</button>}
          </div>
        </div>

        <div className="services-categories sticky top-16 z-20 -mx-4 border-y border-blush bg-ivory/95 px-4 py-2 backdrop-blur sm:top-20 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-2">
              <button onClick={() => scrollTabs(-1)} disabled={tabScroll.atStart} tabIndex={tabScroll.atStart ? -1 : 0} className="hidden h-9 w-9 shrink-0 rounded-xl border border-blush bg-cream text-lg text-burgundy transition hover:border-gold hover:bg-blush-light disabled:cursor-not-allowed disabled:border-blush disabled:bg-ivory disabled:text-muted disabled:opacity-45 disabled:hover:bg-ivory sm:block" aria-label={tr(labels.previousCategory, isArabic)}>‹</button>
              <div ref={tabScrollerRef} role="tablist" onKeyDown={onTabKeyDown} className={`services-category-list flex gap-1.5 overflow-x-auto py-0.5 ${isArabic ? 'flex-row-reverse' : ''}`} style={{ scrollbarWidth: 'none' }}>
                {orderedCategories.map((category) => {
                  const selected = !isSearching && category.id === activeCategory;
                  return (
                    <button key={category.id} ref={(node) => { tabsRef.current[category.id] = node; }} role="tab" aria-selected={selected} tabIndex={selected ? 0 : -1} onClick={() => chooseCategory(category.id)} className={`service-category-pill relative h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-gold ${selected ? 'bg-burgundy text-cream shadow-sm' : 'border border-blush bg-cream text-charcoal hover:border-gold hover:text-burgundy'}`}>
                      {categoryLabel(category, isArabic)}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => scrollTabs(1)} disabled={tabScroll.atEnd} tabIndex={tabScroll.atEnd ? -1 : 0} className="hidden h-9 w-9 shrink-0 rounded-xl border border-blush bg-cream text-lg text-burgundy transition hover:border-gold hover:bg-blush-light disabled:cursor-not-allowed disabled:border-blush disabled:bg-ivory disabled:text-muted disabled:opacity-45 disabled:hover:bg-ivory sm:block" aria-label={tr(labels.nextCategory, isArabic)}>›</button>
            </div>
          </div>
        </div>

        <div
          className="services-content mt-3 pb-8 focus:outline-none"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
            if (event.key === 'ArrowLeft') setPage(safePage - 1);
            if (event.key === 'ArrowRight') setPage(safePage + 1);
          }}
        >
          <div className="mb-2 flex justify-end">
            <PaginationControls page={safePage} totalPages={totalPages} setPage={setPage} isArabic={isArabic} desktop />
          </div>

          {loading ? (
            <div className="rounded-2xl border border-blush bg-cream p-10 text-center shadow-sm"><p className="font-serif text-2xl text-burgundy">{isArabic ? 'جارٍ تحميل الخدمات…' : 'Loading services…'}</p></div>
          ) : error ? (
            <div className="rounded-2xl border border-blush bg-cream p-10 text-center shadow-sm"><p className="font-serif text-2xl text-burgundy">{isArabic ? 'تعذر تحميل الخدمات' : 'Could not load services'}</p><p className="mt-2 text-sm text-muted">{error}</p></div>
          ) : visibleServices.length === 0 ? (
            <div className="rounded-2xl border border-blush bg-cream p-10 text-center shadow-sm">
              <p className="font-serif text-2xl text-burgundy">{tr(labels.noResults, isArabic)}</p>
              <p className="mt-2 text-sm text-muted">{tr(labels.noResultsHint, isArabic)}</p>
            </div>
          ) : (
            <div
              key={`${resultKey}-${safePage}-${pageSize}`}
              className="services-grid mx-auto grid animate-card-page gap-[clamp(0.35rem,0.8vw,0.62rem)]"
              style={{
                ['--service-cols' as string]: gridConfig.columns,
                ['--service-rows' as string]: gridConfig.rows,
                gridTemplateColumns: `repeat(${gridConfig.columns}, minmax(0, 1fr))`,
                maxWidth: 'min(100%, calc((((100svh - 15rem - ((var(--service-rows) - 1) * clamp(0.35rem, 0.8vw, 0.62rem))) / var(--service-rows)) / 0.82) * var(--service-cols) + ((var(--service-cols) - 1) * clamp(0.35rem, 0.8vw, 0.62rem))))',
              }}
            >
              {pageItems.map((service) => <ServiceCard key={service.id} service={service} isArabic={isArabic} onBook={setBooking} />)}
            </div>
          )}

          <PaginationControls page={safePage} totalPages={totalPages} setPage={setPage} isArabic={isArabic} />
          <div className="services-next mt-6 flex justify-center pb-10 sm:mt-7 sm:pb-0">
            <SectionNextButton
              targetId="offers"
              label={isArabic ? 'شاهدي العروض والباقات' : 'View Offers & Packages'}
              ariaLabel={isArabic ? 'شاهدي العروض والباقات' : 'View Offers & Packages'}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function formatOfferPrice(value: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Ask on WhatsApp';
  return raw.toUpperCase().includes('AED') ? raw : `AED ${raw}`;
}

function offerWhatsAppUrl(offer: OfferPackage, isArabic: boolean) {
  const oldPrice = offerOriginalPrice(offer.services);
  const serviceLines = offer.services.map((service) => {
    const qty = service.quantity > 1 ? `${service.quantity} × ` : '';
    return `• ${qty}${isArabic ? service.nameAr : service.name}`;
  });
  const message = isArabic
    ? [
        'مرحباً Elaash Beauty، أود الاستفسار عن هذه الباقة:',
        '',
        `الباقة: ${offer.nameAr}`,
        oldPrice ? `السعر العادي: ${oldPrice}` : '',
        `سعر العرض: ${formatOfferPrice(offer.offerPrice)}`,
        '',
        ...serviceLines,
      ]
    : [
        'Hello Elaash Beauty, I would like to book this package:',
        '',
        `Package: ${offer.name}`,
        oldPrice ? `Regular total: ${oldPrice}` : '',
        `Offer price: ${formatOfferPrice(offer.offerPrice)}`,
        '',
        ...serviceLines,
      ];
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message.filter(Boolean).join('\n'))}`;
}

function OfferCard({ offer, isArabic }: { offer: OfferPackage; isArabic: boolean }) {
  const oldPrice = offerOriginalPrice(offer.services);
  const title = isArabic ? offer.nameAr : offer.name;
  const description = isArabic ? offer.descriptionAr : offer.description;

  return (
    <article className="offer-card group relative flex h-full min-h-0 snap-center flex-col overflow-hidden rounded-[1.6rem] border border-blush bg-cream shadow-[0_18px_50px_rgba(74,16,25,0.08)]">
      <div className="relative min-h-0 flex-[0.9] overflow-hidden bg-blush-light">
        {offer.image ? (
          <img src={offer.image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" loading="lazy" />
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(196,150,58,.20),transparent_45%),linear-gradient(135deg,#FDF9F3,#F8EFEC)] px-6 text-center">
            <img src="/images/logo.png" alt="" className="max-h-20 w-auto opacity-75" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-burgundy-dark/35 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-burgundy px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-cream shadow-lg">
          {isArabic ? 'عرض خاص' : 'Special Offer'}
        </span>
      </div>
      <div className="flex min-h-0 flex-[1.15] flex-col p-4 sm:p-5">
        <h3 className="font-serif text-xl leading-tight text-burgundy sm:text-2xl">{title}</h3>
        {description && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted sm:text-sm">{description}</p>}
        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-gold">{isArabic ? 'تشمل' : 'Includes'}</p>
          <div className="space-y-1">
            {offer.services.slice(0, 5).map((service) => (
              <p key={service.id} className="truncate text-xs text-charcoal/80">
                <span className="mr-1 text-gold">•</span>
                {service.quantity > 1 ? `${service.quantity} × ` : ''}{isArabic ? service.nameAr : service.name}
              </p>
            ))}
            {offer.services.length > 5 && <p className="text-[11px] font-semibold text-muted">+ {offer.services.length - 5} {isArabic ? 'خدمات أخرى' : 'more'}</p>}
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3 border-t border-blush pt-3">
          <div>
            {oldPrice && <p className="text-xs text-muted line-through decoration-burgundy/50">{oldPrice}</p>}
            <p className="font-serif text-xl font-semibold text-burgundy sm:text-2xl">{formatOfferPrice(offer.offerPrice)}</p>
          </div>
          <a
            href={offerWhatsAppUrl(offer, isArabic)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] px-4 text-xs font-bold text-white shadow-md transition hover:bg-[#1ebe5d]"
          >
            {isArabic ? 'احجزي الباقة' : 'Book Package'}
          </a>
        </div>
      </div>
    </article>
  );
}

function OffersSection({ isArabic, onNavigate }: { isArabic: boolean; onNavigate: (id: SectionId) => void }) {
  const { offers, loading, error } = useOffers();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : typeof window !== 'undefined' && window.innerWidth >= 640 ? 2 : 1);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setPerPage(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const totalPages = Math.max(1, Math.ceil(offers.length / perPage));
  const safePage = Math.min(page, totalPages);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const pageItems = offers.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    const node = mobileRef.current;
    if (!node || window.innerWidth >= 640) return;
    node.scrollTo({ left: (safePage - 1) * node.clientWidth * (isArabic ? -1 : 1), behavior: 'smooth' });
  }, [safePage, isArabic]);

  return (
    <section id="offers" className="offers-viewport-section scroll-mt-20 bg-blush-light px-4 sm:px-6 lg:px-8">
      <div className="offers-inner mx-auto flex h-full max-w-7xl min-h-0 flex-col">
        <div className="offers-heading text-center">
          <p data-scroll-anchor className="mb-2 text-xs font-medium uppercase tracking-widest text-gold">{isArabic ? 'قيمة أكثر، عناية أكثر' : 'More beauty, better value'}</p>
          <h2 className="font-serif text-3xl text-burgundy sm:text-4xl lg:text-5xl">{tr(labels.nav.offers, isArabic)}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">
            {isArabic ? 'باقات مختارة تجمع عدة علاجات بسعر خاص.' : 'Curated combinations of treatments together at a special package price.'}
          </p>
        </div>

        <div className="offers-content mt-4 min-h-0 flex-1">
          {loading ? (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-blush bg-cream"><p className="font-serif text-2xl text-burgundy">{isArabic ? 'جارٍ تحميل العروض…' : 'Loading offers…'}</p></div>
          ) : error ? (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-3xl border border-blush bg-cream px-5 text-center"><p className="font-serif text-2xl text-burgundy">{isArabic ? 'تعذر تحميل العروض' : 'Could not load offers'}</p><p className="mt-2 text-xs text-muted">{error}</p></div>
          ) : offers.length === 0 ? (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-gold/35 bg-cream px-5 text-center"><p className="text-sm text-muted">{isArabic ? 'لا توجد عروض نشطة حالياً.' : 'No active packages yet.'}</p></div>
          ) : (
            <>
              <div
                ref={mobileRef}
                data-touch-scroll
                dir={isArabic ? 'rtl' : 'ltr'}
                className="offers-mobile-carousel h-full sm:hidden"
                onScroll={(event) => {
                  const node = event.currentTarget;
                  const width = node.clientWidth || 1;
                  const raw = Math.abs(node.scrollLeft) / width;
                  const next = Math.min(offers.length, Math.max(1, Math.round(raw) + 1));
                  if (next !== page) setPage(next);
                }}
              >
                {offers.map((offer) => <div key={offer.id} className="offers-mobile-page"><OfferCard offer={offer} isArabic={isArabic} /></div>)}
              </div>
              <div className="hidden h-full min-h-0 gap-4 sm:grid" style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))` }}>
                {pageItems.map((offer) => <OfferCard key={offer.id} offer={offer} isArabic={isArabic} />)}
              </div>
            </>
          )}
        </div>

        {offers.length > perPage && (
          <div className="offers-pagination mt-3 flex items-center justify-center gap-2">
            <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className="h-9 w-10 rounded-xl border border-blush bg-cream text-lg text-burgundy disabled:opacity-35" aria-label="Previous package">‹</button>
            <span className="min-w-12 text-center text-xs font-semibold text-muted">{safePage} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className="h-9 w-10 rounded-xl border border-blush bg-cream text-lg text-burgundy disabled:opacity-35" aria-label="Next package">›</button>
          </div>
        )}

        <div className="offers-next mt-3 flex justify-center">
          <SectionNextButton
            targetId="about"
            label={isArabic ? 'تعرّفي علينا' : 'Discover Our Story'}
            ariaLabel={isArabic ? 'تعرّفي علينا' : 'Discover Our Story'}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </section>
  );
}

function PaginationControls({ page, totalPages, setPage, isArabic, desktop = false }: { page: number; totalPages: number; setPage: (page: number) => void; isArabic: boolean; desktop?: boolean }) {
  const previousDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className={`services-pagination ${desktop ? 'hidden sm:flex' : 'mt-4 flex sm:hidden'} items-center justify-center gap-2`}>
      <button onClick={() => setPage(page - 1)} disabled={previousDisabled} tabIndex={previousDisabled ? -1 : 0} className="h-9 w-10 rounded-xl border border-blush bg-cream text-lg text-burgundy transition hover:border-gold hover:bg-blush-light focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:border-blush disabled:bg-ivory disabled:text-muted disabled:opacity-45 disabled:hover:bg-ivory" aria-label={tr(labels.previousPage, isArabic)}>‹</button>
      <span className="min-w-12 text-center text-xs font-semibold text-muted">{page} / {totalPages}</span>
      <button onClick={() => setPage(page + 1)} disabled={nextDisabled} tabIndex={nextDisabled ? -1 : 0} className="h-9 w-10 rounded-xl border border-blush bg-cream text-lg text-burgundy transition hover:border-gold hover:bg-blush-light focus:outline-none focus:ring-2 focus:ring-gold disabled:cursor-not-allowed disabled:border-blush disabled:bg-ivory disabled:text-muted disabled:opacity-45 disabled:hover:bg-ivory" aria-label={tr(labels.nextPage, isArabic)}>›</button>
    </div>
  );
}

function AboutSection({ isArabic, onNavigate }: { isArabic: boolean; onNavigate: (id: SectionId) => void }) {
  return (
    <section id="about" className="scroll-mt-24 bg-blush-light px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p data-scroll-anchor className="mb-3 text-xs font-medium uppercase tracking-widest text-gold">{tr(labels.nav.about, isArabic)}</p>
          <h2 className="font-serif text-3xl text-burgundy sm:text-5xl">{isArabic ? 'لمسة أنوثة في قلب أبوظبي' : 'A Touch of Elegance in Abu Dhabi'}</h2>
          <p className="mt-6 text-sm leading-relaxed text-muted">{isArabic ? 'Elaash Beauty صالون سيدات في منطقة النهيان بأبوظبي، صُمم كمساحة راقية وخاصة للعناية والاسترخاء.' : 'Elaash Beauty is a women-only salon in Al Nahyan, Abu Dhabi, created as a refined private space for beauty, care and calm.'}</p>
        </div>
        <img src="https://images.unsplash.com/photo-1696841212541-449ca29397cc?w=900&h=700&fit=crop&auto=format" alt="Salon atmosphere" className="h-80 w-full rounded-2xl object-cover" loading="lazy" />
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl justify-center">
        <SectionNextButton
          targetId="gallery"
          label={isArabic ? 'شاهدي معرضنا' : 'Explore Our Gallery'}
          ariaLabel={isArabic ? 'شاهدي معرضنا' : 'Explore Our Gallery'}
          onNavigate={onNavigate}
        />
      </div>
    </section>
  );
}

function GallerySection({ isArabic, onNavigate }: { isArabic: boolean; onNavigate: (id: SectionId) => void }) {
  const images = [
    'photo-1519014816548-bf5fe059798b',
    'photo-1600334089648-b0d9d3028eb2',
    'photo-1732118400647-a81e3b37be87',
    'photo-1570172619644-dfd03ed5d881',
    'photo-1604654894611-6973b376cbde',
    'photo-1600334129128-685c5582fd35',
  ];
  return (
    <section id="gallery" className="gallery-viewport-section scroll-mt-24 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 text-center sm:mb-7">
          <p data-scroll-anchor className="mb-3 text-xs font-medium uppercase tracking-widest text-gold">{tr(labels.nav.gallery, isArabic)}</p>
          <h2 className="font-serif text-3xl text-burgundy sm:text-5xl">{isArabic ? 'أجواء Elaash' : 'Elaash Beauty Moments'}</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {images.map((id, index) => (
            <div key={id} className={`overflow-hidden rounded-2xl bg-blush-light ${index === 0 ? 'sm:row-span-2' : ''}`}>
              <img src={`https://images.unsplash.com/${id}?w=700&h=800&fit=crop&auto=format`} alt="Elaash salon treatment" loading="lazy" className={`w-full object-cover transition duration-500 hover:scale-105 ${index === 0 ? 'h-36 sm:h-full' : 'h-28 sm:h-40 lg:h-44'}`} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-center sm:mt-6">
          <SectionNextButton
            targetId="instagram"
            label={isArabic ? 'شاهدي إنستغرام' : 'Check Instagram Feed'}
            ariaLabel={isArabic ? 'شاهدي إنستغرام' : 'Check Instagram Feed'}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </section>
  );
}

function InstagramFeedSection({ isArabic, onNavigate }: { isArabic: boolean; onNavigate: (id: SectionId) => void }) {
  return (
    <section id="instagram" className="instagram-feed-section scroll-mt-24 bg-cream/55 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col">
        <div className="mx-auto mb-5 max-w-2xl text-center sm:mb-7">
          <div data-scroll-anchor className="mb-3 flex items-center justify-center gap-2 text-gold">
            <InstagramIcon size={18} />
            <p className="text-xs font-medium uppercase tracking-[0.24em]">Instagram</p>
          </div>
          <h2 className="font-serif text-3xl text-burgundy sm:text-5xl">
            {isArabic ? 'تابعي لحظات Elaash' : 'Follow Our Beauty Journey'}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted sm:text-base">
            {isArabic
              ? 'اكتشفي أحدث إطلالاتنا ولمسات الجمال مباشرة من إنستغرام.'
              : 'Discover our latest looks, salon moments and beauty inspiration directly from Instagram.'}
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-burgundy transition hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <InstagramIcon size={17} />
            @elaash_beauty
          </a>
        </div>

        <div className="instagram-feed-frame mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-gold/20 bg-ivory p-2 shadow-xl shadow-burgundy/10 sm:p-3">
          <div className="h-full overflow-hidden rounded-[22px] bg-white">
            <iframe
              title="Elaash Beauty Instagram feed"
              src={INSTAGRAM_EMBED_URL}
              className="block h-full w-full border-0"
              loading="lazy"
              allow="encrypted-media"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-center sm:mt-6">
          <SectionNextButton
            targetId="contact"
            label={isArabic ? 'زوري الصالون أو تواصلي معنا' : 'Visit or Contact Us'}
            ariaLabel={isArabic ? 'زوري الصالون أو تواصلي معنا' : 'Visit or Contact Us'}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </section>
  );
}

function ContactSection({ isArabic }: { isArabic: boolean }) {
  return (
    <section id="contact" className="contact-viewport-section scroll-mt-24 bg-cream px-5 sm:px-8">
      <div className="contact-layout mx-auto grid max-w-7xl gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="contact-card rounded-2xl border border-blush bg-blush-light p-5 shadow-sm sm:p-6">
          <p data-scroll-anchor className="mb-3 text-xs font-medium uppercase tracking-widest text-gold">{tr(labels.nav.contact, isArabic)}</p>
          <h2 className="font-serif text-3xl text-burgundy sm:text-5xl">{isArabic ? 'الموقع والتواصل' : 'Location & Contact'}</h2>
          <div className="contact-details mt-5 space-y-3 text-sm">
            <p className="font-serif text-2xl leading-tight text-burgundy">Elaash Beauty Ladies Salon</p>
            <p><strong className="text-charcoal">{isArabic ? 'الموقع: ' : 'Location: '}</strong><span className="text-muted">Al Nahyan, Abu Dhabi</span></p>
            <p><strong className="text-charcoal">WhatsApp: </strong><a className="text-burgundy hover:text-gold" href={generalWhatsAppUrl(isArabic)} target="_blank" rel="noopener noreferrer">+971 54 500 6642</a></p>
          </div>
          <div className="contact-actions mt-5 flex flex-wrap gap-3">
            <a href={`tel:${PHONE_NUMBER}`} className="inline-flex items-center justify-center rounded-full bg-burgundy px-5 py-3 text-sm font-semibold text-cream shadow-sm hover:bg-burgundy-dark focus:outline-none focus:ring-2 focus:ring-gold">
              {isArabic ? 'اتصال' : 'Call'}
            </a>
            <a href={generalWhatsAppUrl(isArabic)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40">
              <WhatsAppIcon size={18} />
              WhatsApp
            </a>
          </div>
          <div className="contact-social mt-4 border-t border-burgundy/10 pt-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">{isArabic ? 'تابعينا' : 'Follow Elaash'}</p>
            <div className="flex flex-wrap gap-2.5">
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Elaash Beauty on Instagram" className="inline-flex items-center gap-2 rounded-full border border-gold/45 bg-cream/70 px-4 py-2.5 text-xs font-semibold text-burgundy transition hover:border-gold hover:bg-cream hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40">
                <InstagramIcon size={17} />
                Instagram
              </a>
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Elaash Beauty on Facebook" className="inline-flex items-center gap-2 rounded-full border border-gold/45 bg-cream/70 px-4 py-2.5 text-xs font-semibold text-burgundy transition hover:border-gold hover:bg-cream hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40">
                <FacebookIcon size={17} />
                Facebook
              </a>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-blush bg-ivory shadow-lg shadow-burgundy/10">
          <iframe
            title="Elaash Beauty Ladies Salon location"
            src={MAP_EMBED_URL}
            className="contact-map block h-full min-h-[220px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blush bg-cream px-5 py-4">
            <div>
              <p className="font-semibold text-burgundy">Elaash Beauty Ladies Salon</p>
              <p className="text-sm text-muted">Al Nahyan, Abu Dhabi</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onNavigate, isArabic }: { onNavigate: (id: SectionId) => void; isArabic: boolean }) {
  return (
    <footer className="site-footer bg-burgundy-dark px-5 py-4 text-cream/70 sm:px-8 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <div className="footer-top-row flex items-center justify-between gap-4 sm:contents">
          <div className="footer-brand-group [&_.text-burgundy]:text-cream">
            <BrandMark isArabic={isArabic} compact />
          </div>
          <div className="footer-socials flex shrink-0 items-center gap-2.5">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Elaash Beauty on Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/75 transition hover:border-gold/70 hover:bg-cream/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40">
              <InstagramIcon size={17} />
            </a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Elaash Beauty on Facebook" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/75 transition hover:border-gold/70 hover:bg-cream/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/40">
              <FacebookIcon size={17} />
            </a>
          </div>
        </div>
        <div className="footer-menu mt-3 flex flex-wrap gap-1.5 sm:mt-0 sm:justify-end">
          {SECTION_IDS.map((id) => <button key={id} onClick={() => onNavigate(id)} className="rounded-full px-2.5 py-1.5 text-xs sm:text-sm hover:bg-cream/10 hover:text-gold">{tr(labels.nav[id], isArabic)}</button>)}
        </div>
      </div>
    </footer>
  );
}

function MobileSectionNavigator({ active, isArabic, onNavigate }: { active: SectionId; isArabic: boolean; onNavigate: (id: SectionId) => void }) {
  const [open, setOpen] = useState(false);
  const currentIndex = Math.max(0, MOBILE_SECTION_ORDER.indexOf(active));
  const next = MOBILE_SECTION_ORDER[Math.min(currentIndex + 1, MOBILE_SECTION_ORDER.length - 1)];
  const nameFor = (id: SectionId) => {
    if (id === 'instagram') return isArabic ? 'إنستغرام' : 'Instagram';
    return tr(labels.nav[id], isArabic);
  };

  return (
    <div className={`mobile-section-nav fixed left-1/2 z-40 -translate-x-1/2 sm:hidden ${active === 'contact' ? 'bottom-[6.25rem]' : 'bottom-[4.75rem]'}`}>
      {open && (
        <div className="mobile-section-menu mb-2 rounded-[22px] border border-gold/25 bg-cream/95 p-2 shadow-2xl backdrop-blur-xl">
          {MOBILE_SECTION_ORDER.map((id, index) => (
            <button
              key={id}
              type="button"
              onClick={() => { onNavigate(id); setOpen(false); }}
              className={`flex w-full items-center justify-between gap-5 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition ${id === active ? 'bg-burgundy text-cream' : 'text-charcoal hover:bg-blush-light'}`}
            >
              <span>{nameFor(id)}</span>
              <span className={`text-[10px] ${id === active ? 'text-gold-light' : 'text-muted'}`}>{String(index + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={isArabic ? 'فتح قائمة الأقسام' : 'Open section navigator'}
        className="mobile-section-pill flex min-w-[210px] items-center justify-between gap-3 rounded-full border border-gold/35 bg-burgundy-dark/95 px-3.5 py-2.5 text-cream shadow-2xl backdrop-blur-xl"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream/10 text-[10px] font-bold text-gold-light">{currentIndex + 1}</span>
          <span className="min-w-0 text-left leading-tight">
            <span className="block truncate text-[10px] uppercase tracking-[0.16em] text-cream/55">{nameFor(active)}</span>
            <span className="block truncate text-xs font-semibold">{active === 'contact' ? (isArabic ? 'النهاية' : 'End') : `${isArabic ? 'التالي' : 'Next'} · ${nameFor(next)}`}</span>
          </span>
        </span>
        <span className="text-gold-light">{open ? '×' : '⌃'}</span>
      </button>
    </div>
  );
}

function FloatingActions({ isArabic, hideMobileBar = false }: { isArabic: boolean; hideMobileBar?: boolean }) {
  return (
    <>
      <a href={generalWhatsAppUrl(isArabic)} target="_blank" rel="noreferrer" className="fixed bottom-6 right-5 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 sm:flex" aria-label="Chat on WhatsApp"><WhatsAppIcon size={26} /></a>
      {!hideMobileBar && <div className="mobile-action-bar fixed inset-x-0 bottom-0 z-30 flex border-t border-blush bg-cream shadow-2xl sm:hidden">
        <a href={`tel:${PHONE_NUMBER}`} className="flex min-h-14 flex-1 items-center justify-center font-semibold text-burgundy">{isArabic ? 'اتصال' : 'Call'}</a>
        <div className="w-px bg-blush" />
        <a href={generalWhatsAppUrl(isArabic)} target="_blank" rel="noreferrer" className="flex min-h-14 flex-1 items-center justify-center gap-2 font-semibold text-[#25D366]"><WhatsAppIcon size={18} />WhatsApp</a>
      </div>}
    </>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [isArabic, setIsArabic] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('elaash-language') === 'ar';
  });
  const [booking, setBooking] = useState<Service | null>(null);

  const navigateToSection = (id: SectionId) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const getDestination = () => {
      if (id === 'home') return 0;
      const section = document.getElementById(id);
      if (!section) return null;
      const target = section.querySelector<HTMLElement>('[data-scroll-anchor]') ?? section;
      const headerBar = document.querySelector<HTMLElement>('[data-site-header-bar]');
      const headerHeight = headerBar?.getBoundingClientRect().height ?? 0;
      const visualGap = window.matchMedia('(max-width: 639px)').matches ? 16 : 22;
      return Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - headerHeight - visualGap));
    };

    const scrollExactly = (behavior: ScrollBehavior) => {
      const top = getDestination();
      if (top == null) return;
      window.scrollTo({ top, left: 0, behavior });
    };

    // Measure after the current click/menu state has committed, then make one
    // quiet final correction after smooth scrolling. This avoids iOS Safari
    // stopping a few pixels early/late when fixed UI changes during the click.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        scrollExactly(prefersReducedMotion ? 'auto' : 'smooth');
        if (!prefersReducedMotion) {
          window.setTimeout(() => {
            const desired = getDestination();
            if (desired != null && Math.abs(window.scrollY - desired) > 2) {
              window.scrollTo({ top: desired, left: 0, behavior: 'auto' });
            }
          }, 700);
        }
      });
    });

    window.history.replaceState(null, '', `#${id}`);
    setActiveSection(id);
  };

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
    window.localStorage.setItem('elaash-language', isArabic ? 'ar' : 'en');
  }, [isArabic]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id as SectionId);
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0.05, 0.25, 0.5] });
    MOBILE_SECTION_ORDER.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 639px)').matches;
    let startX = 0;
    let startY = 0;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!isMobile() || event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-touch-scroll], .admin-page, [role="dialog"]')) return;
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dy > dx) event.preventDefault();
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-full overflow-x-hidden bg-ivory text-charcoal">
      <Nav active={activeSection} onNavigate={navigateToSection} isArabic={isArabic} setIsArabic={setIsArabic} setBooking={setBooking} />
      <main>
        <Hero onNavigate={navigateToSection} isArabic={isArabic} />
        <ServicesSection isArabic={isArabic} setBooking={setBooking} onNavigate={navigateToSection} />
        <OffersSection isArabic={isArabic} onNavigate={navigateToSection} />
        <AboutSection isArabic={isArabic} onNavigate={navigateToSection} />
        <GallerySection isArabic={isArabic} onNavigate={navigateToSection} />
        <InstagramFeedSection isArabic={isArabic} onNavigate={navigateToSection} />
        <div className="contact-footer-shell">
          <ContactSection isArabic={isArabic} />
          <Footer onNavigate={navigateToSection} isArabic={isArabic} />
        </div>
      </main>
      <MobileSectionNavigator active={activeSection} isArabic={isArabic} onNavigate={navigateToSection} />
      <FloatingActions isArabic={isArabic} hideMobileBar={activeSection === 'contact'} />
      <BookingDrawer service={booking} isArabic={isArabic} onClose={() => setBooking(null)} />
    </div>
  );
}
