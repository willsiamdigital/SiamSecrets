-- Demo content for local development. All names are fictional; images are
-- Unsplash placeholders and must be replaced with owned/licensed photos.
insert into public.listings (id, name, area, age, image_url, tier, status, adult_declared_at, is_demo)
overriding system value
values
  (1,  'Saorii',   'Sukhumvit',        24, 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (2,  'Ploy',     'Thong Lo',         25, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (3,  'Nicha',    'Phrom Phong',      26, 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (4,  'Fah',      'Asok',             27, 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (5,  'Mint',     'Ekkamai',          28, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (6,  'May',      'Silom',            29, 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (7,  'Fern',     'Sathorn',          30, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (8,  'Nam',      'Ari',              24, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (9,  'Aom',      'Ratchada',         25, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85', 'featured',  'approved', now(), true),
  (10, 'Dao',      'Nana',             26, 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (11, 'Bee',      'On Nut',           27, 'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (12, 'Sai',      'Phaya Thai',       28, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (13, 'Bow',      'Lat Phrao',        29, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (14, 'Ploydao',  'Victory Monument', 30, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (15, 'Mook',     'Chidlom',          24, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (16, 'June',     'Bang Na',          25, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (17, 'Ploysai',  'Huai Khwang',      26, 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (18, 'Ice',      'Khlong Toei',      27, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (19, 'Lookkaew', 'Pratunam',         28, 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true),
  (20, 'Pim',      'Siam',             29, 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=900&q=85', 'directory', 'approved', now(), true);

select setval(pg_get_serial_sequence('public.listings', 'id'), 20);

update public.auction_slots s
set listing_id = v.listing_id, current_bid_cents = v.cents
from (values (1, 1, 5000), (2, 2, 7500), (3, 3, 10000)) as v(position, listing_id, cents)
where s.position = v.position;
