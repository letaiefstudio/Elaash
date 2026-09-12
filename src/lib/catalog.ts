import { useEffect, useState } from 'react';
import type { Category, Service } from '../data/services';
import { isSupabaseConfigured, supabase } from './supabase';

type CategoryRow = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string | null;
  sort_order: number;
};

type ServiceRow = {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number | string;
  package_price: number | string | null;
  image_url: string | null;
  sort_order: number;
  service_categories:
    | { slug: string; name_en: string; name_ar: string | null }
    | { slug: string; name_en: string; name_ar: string | null }[]
    | null;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.slug,
    name: row.name_en,
    nameAr: row.name_ar ?? row.name_en,
    sortOrder: row.sort_order,
  };
}

function mapService(row: ServiceRow): Service {
  const relation = Array.isArray(row.service_categories)
    ? row.service_categories[0]
    : row.service_categories;

  return {
    id: row.id,
    category: relation?.slug ?? '',
    categoryName: relation?.name_en ?? relation?.slug ?? '',
    categoryNameAr: relation?.name_ar ?? relation?.name_en ?? relation?.slug ?? '',
    name: row.name_en,
    nameAr: row.name_ar ?? row.name_en,
    description: row.description_en ?? undefined,
    descriptionAr: row.description_ar ?? undefined,
    price: row.price,
    packagePrice: row.package_price ?? undefined,
    image: row.image_url ?? undefined,
  };
}

export function useCatalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

      const [categoryResult, serviceResult] = await Promise.all([
        supabase
          .from('service_categories')
          .select('id,slug,name_en,name_ar,sort_order')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('services')
          .select('id,category_id,name_en,name_ar,description_en,description_ar,price,package_price,image_url,sort_order,service_categories!inner(slug,name_en,name_ar)')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (cancelled) return;

      if (categoryResult.error || serviceResult.error) {
        setError(categoryResult.error?.message ?? serviceResult.error?.message ?? 'Could not load catalogue.');
        setCategories([]);
        setServices([]);
        setLoading(false);
        return;
      }

      setCategories(((categoryResult.data ?? []) as CategoryRow[]).map(mapCategory));
      setServices(((serviceResult.data ?? []) as unknown as ServiceRow[]).map(mapService));
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { services, categories, loading, error };
}
