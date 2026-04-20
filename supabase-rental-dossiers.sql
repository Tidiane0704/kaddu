create extension if not exists pgcrypto;

create table if not exists public.rental_dossiers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  bien text,
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
  identite_garant text,
  employeur text,
  pays_residence text,
  logement_actuel text,
  raison_depart text,
  nb_occupants integer,
  id_type text,
  id_number text,
  date_expiration_piece date,
  iban text,
  bailleur_nom text,
  bailleur_contact text,
  transmission text,
  commentaire text,
  score integer,
  status text,
  ratio numeric,
  flags jsonb default '[]'::jsonb,
  reasons jsonb default '[]'::jsonb,
  otp_verified boolean default false,
  payload jsonb default '{}'::jsonb
);

alter table public.rental_dossiers enable row level security;

drop policy if exists "anon can insert rental dossiers" on public.rental_dossiers;
create policy "anon can insert rental dossiers"
on public.rental_dossiers
for insert
to anon
with check (true);

drop policy if exists "authenticated can read rental dossiers" on public.rental_dossiers;
create policy "authenticated can read rental dossiers"
on public.rental_dossiers
for select
to authenticated
using (true);
