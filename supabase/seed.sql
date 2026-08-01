insert into public.vehicle_catalog (id, vehicle_type, make, model, fuel_type)
values
  ('10000000-0000-4000-8000-000000000001', 'scooter', 'Honda', 'Activa 6G', 'petrol'),
  ('10000000-0000-4000-8000-000000000002', 'motorcycle', 'Honda', 'Shine 125', 'petrol'),
  ('10000000-0000-4000-8000-000000000003', 'motorcycle', 'Hero', 'Splendor Plus', 'petrol'),
  ('10000000-0000-4000-8000-000000000004', 'motorcycle', 'Bajaj', 'Pulsar 150', 'petrol'),
  ('10000000-0000-4000-8000-000000000005', 'motorcycle', 'Royal Enfield', 'Classic 350', 'petrol'),
  ('10000000-0000-4000-8000-000000000006', 'scooter', 'TVS', 'Jupiter', 'petrol'),
  ('10000000-0000-4000-8000-000000000007', 'motorcycle', 'TVS', 'Apache RTR 160', 'petrol'),
  ('10000000-0000-4000-8000-000000000008', 'scooter', 'Suzuki', 'Access 125', 'petrol'),
  ('10000000-0000-4000-8000-000000000009', 'motorcycle', 'Yamaha', 'FZ-S FI', 'petrol'),
  ('10000000-0000-4000-8000-000000000010', 'motorcycle', 'KTM', 'Duke 200', 'petrol'),
  ('10000000-0000-4000-8000-000000000011', 'electric_two_wheeler', 'Ather', '450X', 'electric'),
  ('10000000-0000-4000-8000-000000000012', 'electric_two_wheeler', 'Ola Electric', 'S1 Pro', 'electric'),
  ('10000000-0000-4000-8000-000000000013', 'electric_two_wheeler', 'TVS', 'iQube', 'electric'),
  ('10000000-0000-4000-8000-000000000014', 'electric_two_wheeler', 'Bajaj', 'Chetak', 'electric'),
  ('10000000-0000-4000-8000-000000000015', 'bicycle', 'Firefox', 'Bad Attitude 8', 'not_applicable'),
  ('10000000-0000-4000-8000-000000000016', 'bicycle', 'Hero Cycles', 'Sprint Pro', 'not_applicable')
on conflict (id) do update set
  vehicle_type = excluded.vehicle_type,
  make = excluded.make,
  model = excluded.model,
  fuel_type = excluded.fuel_type;
