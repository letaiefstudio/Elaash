-- Elaash Salon: move the service-card images that were previously hardcoded
-- in src/data/services.ts into public.services.image_url.
-- Safe to run after the catalogue import.

update public.services s
set image_url = case c.slug
  when 'nails' then (array[
    'https://images.unsplash.com/photo-1604654894611-6973b376cbde?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'waxing' then (array[
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'massage' then (array[
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'hair-mask' then (array[
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'hair-henna' then (array[
    'https://images.unsplash.com/photo-1732118400647-a81e3b37be87?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1780247584715-63a6a3923f75?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1780247473263-4be70d512f5c?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'hair-treatment' then (array[
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'hair-oil' then (array[
    'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'eyelashes' then (array[
    'https://images.unsplash.com/photo-1588015810531-dd522c9c8bbb?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'facial' then (array[
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'moroccan-bath' then (array[
    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'hair-spa' then (array[
    'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  when 'service-charge' then (array[
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?w=700&h=525&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1633681926035-ec1ac984418a?w=700&h=525&fit=crop&auto=format'
  ])[((s.sort_order - 1) % 3) + 1]
  else s.image_url
end
from public.service_categories c
where c.id = s.category_id
  and (s.image_url is null or btrim(s.image_url) = '');

-- Verify that all active services now have an image URL.
select
  c.name_en as category,
  count(*) filter (where s.image_url is not null and btrim(s.image_url) <> '') as with_image,
  count(*) filter (where s.image_url is null or btrim(s.image_url) = '') as missing_image
from public.services s
join public.service_categories c on c.id = s.category_id
where s.is_active = true
group by c.name_en, c.sort_order
order by c.sort_order;
