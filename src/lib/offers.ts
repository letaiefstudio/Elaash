import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';

export type OfferService = {
  id: string;
  name: string;
  nameAr: string;
  price: string | number;
  quantity: number;
};

export type OfferPackage = {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  offerPrice: string;
  image?: string;
  sortOrder: number;
  services: OfferService[];
};

type OfferRow = {
  id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  offer_price: string | number;
  image_url: string | null;
  sort_order: number;
  package_offer_services?: Array<{
    service_id: string;
    quantity: number | null;
    services: { id: string; name_en: string; name_ar: string | null; price: string | number } | Array<{ id: string; name_en: string; name_ar: string | null; price: string | number }> | null;
  }>;
};

export function priceBounds(value: string | number): { min: number; max: number | null; from: boolean } | null {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!raw) return null;
  const nums = raw.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (!nums.length) return null;
  if (raw.includes('+')) return { min: nums[0], max: null, from: true };
  if (nums.length >= 2 && /[-–—]/.test(raw)) return { min: nums[0], max: nums[1], from: false };
  return { min: nums[0], max: nums[0], from: false };
}

export function offerOriginalPrice(services: OfferService[]) {
  if (!services.length) return '';
  let min = 0;
  let max = 0;
  let openEnded = false;
  for (const service of services) {
    const bounds = priceBounds(service.price);
    if (!bounds) return '';
    const qty = Math.max(1, Number(service.quantity) || 1);
    min += bounds.min * qty;
    if (bounds.max == null) openEnded = true;
    else max += bounds.max * qty;
  }
  const clean = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2);
  if (openEnded) return `From AED ${clean(min)}`;
  if (min !== max) return `AED ${clean(min)}–${clean(max)}`;
  return `AED ${clean(min)}`;
}

function mapOffer(row: OfferRow): OfferPackage {
  const services: OfferService[] = (row.package_offer_services ?? []).map((link) => {
    const service = Array.isArray(link.services) ? link.services[0] : link.services;
    return {
      id: service?.id ?? link.service_id,
      name: service?.name_en ?? '',
      nameAr: service?.name_ar ?? service?.name_en ?? '',
      price: service?.price ?? '',
      quantity: Math.max(1, Number(link.quantity) || 1),
    };
  }).filter((service) => service.name);

  return {
    id: row.id,
    name: row.name_en,
    nameAr: row.name_ar ?? row.name_en,
    description: row.description_en ?? undefined,
    descriptionAr: row.description_ar ?? undefined,
    offerPrice: String(row.offer_price ?? ''),
    image: row.image_url ?? undefined,
    sortOrder: row.sort_order,
    services,
  };
}

export function useOffers() {
  const [offers, setOffers] = useState<OfferPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError('Supabase is not configured.');
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from('package_offers')
        .select('id,name_en,name_ar,description_en,description_ar,offer_price,image_url,sort_order,package_offer_services(service_id,quantity,services(id,name_en,name_ar,price))')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (queryError) {
        setOffers([]);
        setError(queryError.message);
        setLoading(false);
        return;
      }
      setOffers(((data ?? []) as unknown as OfferRow[]).map(mapOffer));
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { offers, loading, error };
}
