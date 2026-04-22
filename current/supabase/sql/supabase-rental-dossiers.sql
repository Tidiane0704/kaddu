create extension if not exists pgcrypto;

create table if not exists public.dossiers_locataires (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dossier_ref text not null unique,
  bien_code text,
  bien_label text,
  loyer_fcfa numeric,
  prenom text,
  nom text,
  telephone text,
  numero_whatsapp text,
  email text,
  date_naissance date,
  nationalite text,
  date_entree date,
  duree text,
  situation text,
  revenu_mensuel numeric,
  date_debut_emploi date,
  garant text,
  employeur text,
  activite text,
  source_revenus text,
  etablissement text,
  pays_residence text,
  anciennete_emploi text,
  logement_actuel text,
  raison_depart text,
  nb_occupants integer,
  bailleur_nom text,
  bailleur_contact text,
  garant_nom text,
  garant_telephone text,
  id_type text,
  date_expiration_piece date,
  doc_identite_status text,
  doc_revenus_status text,
  otp_verified boolean default false,
  score integer,
  status text,
  ratio numeric,
  dossier_completion integer,
  reasons jsonb default '[]'::jsonb,
  payload jsonb default '{}'::jsonb
);

alter table public.dossiers_locataires enable row level security;
drop policy if exists "anon can insert dossiers_locataires" on public.dossiers_locataires;
create policy "anon can insert dossiers_locataires" on public.dossiers_locataires for insert to anon with check (true);
drop policy if exists "authenticated can read dossiers_locataires" on public.dossiers_locataires;
create policy "authenticated can read dossiers_locataires" on public.dossiers_locataires for select to authenticated using (true);

insert into storage.buckets (id, name, public) values ('rental-dossiers', 'rental-dossiers', false) on conflict (id) do nothing;
drop policy if exists "anon can upload rental dossiers" on storage.objects;
create policy "anon can upload rental dossiers" on storage.objects for insert to anon with check (bucket_id = 'rental-dossiers');
drop policy if exists "anon can update rental dossiers" on storage.objects;
create policy "anon can update rental dossiers" on storage.objects for update to anon using (bucket_id = 'rental-dossiers') with check (bucket_id = 'rental-dossiers');
drop policy if exists "authenticated can read rental dossiers" on storage.objects;
create policy "authenticated can read rental dossiers" on storage.objects for select to authenticated using (bucket_id = 'rental-dossiers');
