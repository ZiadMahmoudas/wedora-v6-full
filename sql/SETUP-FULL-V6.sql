-- =============================================================
-- WEDORA V6 — COMPLETE DATABASE SETUP
-- Supabase SQL Editor > New Query > paste/run this whole file.
-- Safe for a fresh project. Existing similarly named objects are updated.
-- =============================================================
create extension if not exists "pgcrypto";

do $$ begin create type public.user_role as enum ('user','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invitation_status as enum ('draft','pending_review','active','rejected','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('pending_review','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method as enum ('vodafone_cash','instapay'); exception when duplicate_object then null; end $$;
do $$ begin create type public.memory_type as enum ('wish','photo','audio'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 email text, full_name text, phone text,
 role public.user_role not null default 'user',
 preferred_language text not null default 'ar' check(preferred_language in('ar','en')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.templates(
 id uuid primary key default gen_random_uuid(), slug text unique not null,
 name_ar text not null,name_en text not null,category text not null default 'wedding',
 preview_image_url text,accent text default '#9b6f48',background text default '#f3eadc',
 is_active boolean not null default true,sort_order int not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.templates add column if not exists accent text default '#9b6f48';
alter table public.templates add column if not exists background text default '#f3eadc';
alter table public.templates add column if not exists sort_order int not null default 0;

create table if not exists public.plans(
 id uuid primary key default gen_random_uuid(),slug text unique not null,
 name_ar text not null,name_en text not null,description_ar text,description_en text,
 reference_price numeric(10,2),price numeric(10,2) not null check(price>=0),
 duration_months int,is_lifetime boolean not null default false,
 features jsonb not null default '[]'::jsonb,
 is_featured boolean not null default false,is_active boolean not null default true,sort_order int not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((is_lifetime and duration_months is null) or (not is_lifetime and duration_months is not null and duration_months>0))
);

create table if not exists public.invitations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 template_slug text not null default 'classic-ivory',slug text unique not null,status public.invitation_status not null default 'draft',language text not null default 'ar' check(language in('ar','en')),
 partner1_name text not null,partner2_name text not null,event_date timestamptz not null,venue_name text,city text,map_url text,message text,
 hero_image_url text,gallery_urls jsonb not null default '[]'::jsonb,song_url text,theme_config jsonb not null default '{}'::jsonb,features_config jsonb not null default '{}'::jsonb,
 plan_id uuid references public.plans(id),active_until timestamptz,is_lifetime boolean not null default false,published_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,
 invitation_id uuid not null references public.invitations(id) on delete cascade,plan_id uuid not null references public.plans(id),
 amount numeric(10,2) not null,currency text not null default 'EGP',payment_method public.payment_method not null,receipt_path text not null,transfer_reference text,
 status public.order_status not null default 'pending_review',admin_notes text,reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,created_at timestamptz not null default now()
);
-- Pending-order uniqueness is applied after legacy compatibility cleanup below.

create table if not exists public.rsvps(
 id uuid primary key default gen_random_uuid(),invitation_id uuid not null references public.invitations(id) on delete cascade,
 guest_name text not null,response text not null check(response in('yes','no','maybe')),guest_count int not null default 1 check(guest_count between 1 and 20),message text,created_at timestamptz not null default now()
);

create table if not exists public.guest_memories(
 id uuid primary key default gen_random_uuid(),invitation_id uuid not null references public.invitations(id) on delete cascade,
 type public.memory_type not null,guest_name text,message text,media_url text,approved boolean not null default false,created_at timestamptz not null default now()
);

create table if not exists public.contact_messages(
 id uuid primary key default gen_random_uuid(),name text not null,email text not null,phone text,message text not null,status text not null default 'new',created_at timestamptz not null default now()
);

create table if not exists public.site_settings(
 id int primary key default 1 check(id=1),brand_name text default 'WEDORA',currency text default 'EGP',undercut_amount numeric(10,2) default 250,
 vodafone_cash_number text,instapay_handle text,support_whatsapp text,support_email text,instagram_url text,messenger_url text,
 hero_video_url text,tutorial_video_url text,trial_hours int default 24,updated_at timestamptz not null default now()
);
insert into public.site_settings(id,brand_name,currency,undercut_amount,vodafone_cash_number,instapay_handle,support_whatsapp,support_email,hero_video_url,tutorial_video_url,trial_hours)
values(1,'WEDORA','EGP',250,'01000000000','yourname@instapay','201000000000','hello@wedora.local','assets/wedding.mp4','assets/wedding-scroll.mp4',24)
on conflict(id) do nothing;

-- ---- Compatibility upgrades for older WEDORA schemas ----
alter table public.templates add column if not exists name_ar text;
alter table public.templates add column if not exists name_en text;
alter table public.templates add column if not exists category text default 'wedding';
alter table public.templates add column if not exists preview_image_url text;
alter table public.templates add column if not exists is_active boolean not null default true;
alter table public.templates add column if not exists updated_at timestamptz not null default now();

alter table public.plans add column if not exists description_ar text;
alter table public.plans add column if not exists description_en text;
alter table public.plans add column if not exists reference_price numeric(10,2);
alter table public.plans add column if not exists features jsonb not null default '[]'::jsonb;
alter table public.plans add column if not exists is_featured boolean not null default false;
alter table public.plans add column if not exists is_active boolean not null default true;
alter table public.plans add column if not exists sort_order int not null default 0;
alter table public.plans add column if not exists updated_at timestamptz not null default now();

alter table public.invitations add column if not exists plan_id uuid;
alter table public.invitations add column if not exists active_until timestamptz;
alter table public.invitations add column if not exists is_lifetime boolean not null default false;
alter table public.invitations add column if not exists is_trial boolean not null default false;
alter table public.invitations add column if not exists trial_started_at timestamptz;
alter table public.invitations add column if not exists features_config jsonb not null default '{}'::jsonb;
alter table public.invitations add column if not exists published_at timestamptz;
alter table public.invitations add column if not exists updated_at timestamptz not null default now();

alter table public.orders add column if not exists plan_id uuid;
alter table public.orders add column if not exists currency text not null default 'EGP';
alter table public.orders add column if not exists receipt_path text;
alter table public.orders add column if not exists receipt_url text;
alter table public.orders add column if not exists transfer_reference text;
alter table public.orders add column if not exists admin_notes text;
alter table public.orders add column if not exists reviewed_by uuid;
alter table public.orders add column if not exists reviewed_at timestamptz;
update public.orders set receipt_path=receipt_url where receipt_path is null and receipt_url is not null;
with ranked as (select id,row_number() over(partition by invitation_id order by created_at desc) rn from public.orders where status='pending_review') update public.orders o set status='rejected',admin_notes=coalesce(admin_notes,'Legacy duplicate pending order closed during V6 upgrade') from ranked r where o.id=r.id and r.rn>1;
create unique index if not exists one_pending_order_per_invitation on public.orders(invitation_id) where status='pending_review';

alter table public.guest_memories add column if not exists type public.memory_type;
alter table public.guest_memories add column if not exists guest_name text;
alter table public.guest_memories add column if not exists message text;
alter table public.guest_memories add column if not exists media_url text;
alter table public.guest_memories add column if not exists photo_url text;
alter table public.guest_memories add column if not exists approved boolean not null default false;
update public.guest_memories set media_url=coalesce(media_url,photo_url),type=case when type is not null then type when photo_url is not null then 'photo'::public.memory_type else 'wish'::public.memory_type end where type is null or media_url is null;
alter table public.guest_memories alter column type set default 'wish'::public.memory_type;

alter table public.site_settings add column if not exists brand_name text default 'WEDORA';
alter table public.site_settings add column if not exists currency text default 'EGP';
alter table public.site_settings add column if not exists undercut_amount numeric(10,2) default 250;
alter table public.site_settings add column if not exists vodafone_cash_number text;
alter table public.site_settings add column if not exists instapay_handle text;
alter table public.site_settings add column if not exists support_whatsapp text;
alter table public.site_settings add column if not exists support_email text;
alter table public.site_settings add column if not exists instagram_url text;
alter table public.site_settings add column if not exists messenger_url text;
alter table public.site_settings add column if not exists hero_video_url text;
alter table public.site_settings add column if not exists tutorial_video_url text;
alter table public.site_settings add column if not exists trial_hours int default 24;
alter table public.site_settings add column if not exists updated_at timestamptz not null default now();

insert into public.templates(slug,name_ar,name_en,category,preview_image_url,accent,background,is_active,sort_order) values
('classic-ivory','العاج الكلاسيكي','Classic Ivory','wedding','assets/templates/classic-ivory.jpg','#9b6f48','#f3eadc',true,10),
('editorial-noir','نوير التحريري','Editorial Noir','wedding','assets/templates/editorial-noir.jpg','#781f37','#f4f0e8',true,20),
('botanical-sage','حديقة السيج','Botanical Sage','engagement','assets/templates/botanical-sage.jpg','#8a6c45','#e9eddf',true,30),
('moonlight-navy','ليلة كحلية','Moonlight Navy','katb-ketab','assets/templates/moonlight-navy.jpg','#bfc8d8','#0f203a',true,40),
('royal-arabesque','أرابيسك ملكي','Royal Arabesque','wedding','assets/templates/royal-arabesque.jpg','#d6a750','#5b0017',true,50),
('minimal-blush','بلَش مينيمال','Minimal Blush','engagement','assets/templates/minimal-blush.jpg','#b8767c','#f0e1df',true,60)
on conflict(slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,category=excluded.category,preview_image_url=excluded.preview_image_url,accent=excluded.accent,background=excluded.background;

-- Sample WEDORA prices are editable. reference_price is intentionally NULL until you enter a verified competitor price.
insert into public.plans(slug,name_ar,name_en,description_ar,description_en,reference_price,price,duration_months,is_lifetime,features,is_featured,is_active,sort_order) values
('silver','الفضية','Silver','رابط دعوتك يفضل شغال سنة كاملة مع أهم أدوات إدارة الضيوف.','Your invitation stays live for one full year with essential guest tools.',null,750,12,false,'["custom_link","song","countdown","rsvp","wishes","guest_photos","edit_anytime"]',false,true,10),
('golden','الذهبية','Golden','كل المميزات بدون تاريخ انتهاء مع الرسائل الصوتية وألبوم الذكريات الكامل.','Every feature with no expiry, including audio guestbook and the full memories album.',null,1250,null,true,'["custom_link","song","countdown","rsvp","wishes","guest_photos","audio_guestbook","edit_anytime","lifetime"]',true,true,20)
on conflict(slug) do update set name_ar=excluded.name_ar,name_en=excluded.name_en,description_ar=excluded.description_ar,description_en=excluded.description_en,features=excluded.features;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.profiles(id,email,full_name,phone) values(new.id,new.email,nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'phone',''))
 on conflict(id) do update set email=excluded.email,full_name=coalesce(excluded.full_name,public.profiles.full_name),phone=coalesce(excluded.phone,public.profiles.phone),updated_at=now(); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;create trigger on_auth_user_created after insert or update of email,raw_user_meta_data on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,email,full_name,phone) select id,email,nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'phone','') from auth.users on conflict(id) do update set email=excluded.email;

-- Normalize foreign keys so Admin joins work even after upgrading older versions.
alter table public.invitations drop constraint if exists invitations_user_id_fkey;
alter table public.invitations add constraint invitations_user_id_fkey foreign key(user_id) references public.profiles(id) on delete cascade;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey foreign key(user_id) references public.profiles(id) on delete cascade;
alter table public.invitations drop constraint if exists invitations_plan_id_fkey;
alter table public.invitations add constraint invitations_plan_id_fkey foreign key(plan_id) references public.plans(id);
alter table public.orders drop constraint if exists orders_plan_id_fkey;
alter table public.orders add constraint orders_plan_id_fkey foreign key(plan_id) references public.plans(id);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
create or replace function public.invitation_is_public(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.invitations i where i.id=p_id and i.status='active' and (i.is_lifetime or (i.active_until is not null and i.active_until>now())))$$;

create or replace function public.approve_order(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders%rowtype;p public.plans%rowtype;begin if not public.is_admin() then raise exception 'admin only';end if;select * into o from public.orders where id=p_order_id and status='pending_review' for update;if not found then raise exception 'order not found or already reviewed';end if;select * into p from public.plans where id=o.plan_id;update public.orders set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),admin_notes=null where id=o.id;update public.invitations set status='active',plan_id=p.id,is_lifetime=p.is_lifetime,is_trial=false,active_until=case when p.is_lifetime then null else now()+make_interval(months=>p.duration_months) end,published_at=coalesce(published_at,now()),updated_at=now(),features_config=jsonb_build_object('song',p.features ? 'song','countdown',p.features ? 'countdown','rsvp',p.features ? 'rsvp','wishes',p.features ? 'wishes','guest_photos',p.features ? 'guest_photos','audio_guestbook',p.features ? 'audio_guestbook') where id=o.invitation_id;end $$;
create or replace function public.reject_order(p_order_id uuid,p_note text) returns void language plpgsql security definer set search_path=public as $$
declare v_inv uuid;begin if not public.is_admin() then raise exception 'admin only';end if;update public.orders set status='rejected',admin_notes=coalesce(nullif(trim(p_note),''),'Payment could not be verified'),reviewed_by=auth.uid(),reviewed_at=now() where id=p_order_id and status='pending_review' returning invitation_id into v_inv;if v_inv is null then raise exception 'order not found or already reviewed';end if;update public.invitations set status='rejected',updated_at=now() where id=v_inv;end $$;


create or replace function public.start_trial(p_invitation_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare h int;begin
 select coalesce(trial_hours,24) into h from public.site_settings where id=1;
 update public.invitations set status='active',is_trial=true,is_lifetime=false,trial_started_at=now(),active_until=now()+make_interval(hours=>coalesce(h,24)),published_at=coalesce(published_at,now()),updated_at=now(),features_config=jsonb_build_object('song',true,'countdown',true,'rsvp',false,'wishes',false,'guest_photos',false,'audio_guestbook',false)
 where id=p_invitation_id and user_id=auth.uid() and trial_started_at is null and status in('draft','rejected');
 if not found then raise exception 'trial unavailable for this invitation';end if;
end $$;

create or replace function public.protect_invitation_activation() returns trigger language plpgsql set search_path=public as $$ begin
 if auth.uid() is not null and current_user not in ('postgres','supabase_admin') and not public.is_admin() then
   if new.status is distinct from old.status or new.plan_id is distinct from old.plan_id or new.active_until is distinct from old.active_until or new.is_lifetime is distinct from old.is_lifetime or new.is_trial is distinct from old.is_trial or new.trial_started_at is distinct from old.trial_started_at or new.published_at is distinct from old.published_at then
     raise exception 'protected invitation activation fields';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists protect_invitation_activation_trigger on public.invitations;
create trigger protect_invitation_activation_trigger before update on public.invitations for each row execute function public.protect_invitation_activation();

alter table public.profiles enable row level security;alter table public.templates enable row level security;alter table public.plans enable row level security;alter table public.invitations enable row level security;alter table public.orders enable row level security;alter table public.rsvps enable row level security;alter table public.guest_memories enable row level security;alter table public.contact_messages enable row level security;alter table public.site_settings enable row level security;

drop policy if exists "profiles read" on public.profiles;create policy "profiles read" on public.profiles for select using(id=auth.uid() or public.is_admin());
drop policy if exists "templates read" on public.templates;create policy "templates read" on public.templates for select using(is_active or public.is_admin());
drop policy if exists "templates admin insert" on public.templates;create policy "templates admin insert" on public.templates for insert with check(public.is_admin());
drop policy if exists "templates admin update" on public.templates;create policy "templates admin update" on public.templates for update using(public.is_admin()) with check(public.is_admin());
drop policy if exists "plans read" on public.plans;create policy "plans read" on public.plans for select using(is_active or public.is_admin());
drop policy if exists "plans admin insert" on public.plans;create policy "plans admin insert" on public.plans for insert with check(public.is_admin());
drop policy if exists "plans admin update" on public.plans;create policy "plans admin update" on public.plans for update using(public.is_admin()) with check(public.is_admin());

drop policy if exists "invitation owner read" on public.invitations;drop policy if exists "invitation owner insert" on public.invitations;drop policy if exists "invitation owner update draft" on public.invitations;drop policy if exists "invitation v2 read" on public.invitations;drop policy if exists "invitation v2 insert draft only" on public.invitations;drop policy if exists "invitation v2 owner update draft" on public.invitations;drop policy if exists "invitation v3 customer insert" on public.invitations;
drop policy if exists "invitations read" on public.invitations;create policy "invitations read" on public.invitations for select using(user_id=auth.uid() or public.is_admin() or public.invitation_is_public(id));
drop policy if exists "invitations insert" on public.invitations;create policy "invitations insert" on public.invitations for insert with check(user_id=auth.uid() and status='draft');
drop policy if exists "invitations owner update" on public.invitations;create policy "invitations owner update" on public.invitations for update using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());

drop policy if exists "orders owner read" on public.orders;drop policy if exists "orders owner insert" on public.orders;
drop policy if exists "orders read" on public.orders;create policy "orders read" on public.orders for select using(user_id=auth.uid() or public.is_admin());
drop policy if exists "orders insert" on public.orders;create policy "orders insert" on public.orders for insert with check(user_id=auth.uid() and status='pending_review' and amount=(select price from public.plans p where p.id=plan_id and p.is_active) and exists(select 1 from public.invitations i where i.id=invitation_id and i.user_id=auth.uid()));

drop policy if exists "rsvp public insert active invitation" on public.rsvps;drop policy if exists "rsvp owner read" on public.rsvps;drop policy if exists "rsvp public insert" on public.rsvps;create policy "rsvp public insert" on public.rsvps for insert with check(public.invitation_is_public(invitation_id));
drop policy if exists "rsvp owner read" on public.rsvps;create policy "rsvp owner read" on public.rsvps for select using(public.is_admin() or exists(select 1 from public.invitations i where i.id=invitation_id and i.user_id=auth.uid()));

drop policy if exists "memory public insert active invitation" on public.guest_memories;drop policy if exists "memory owner read" on public.guest_memories;drop policy if exists "memories public insert" on public.guest_memories;create policy "memories public insert" on public.guest_memories for insert with check(public.invitation_is_public(invitation_id) and ((type='wish' and approved=true and media_url is null) or (type in('photo','audio') and approved=false and media_url is not null)));
drop policy if exists "memories read" on public.guest_memories;create policy "memories read" on public.guest_memories for select using(approved or public.is_admin() or exists(select 1 from public.invitations i where i.id=invitation_id and i.user_id=auth.uid()));
drop policy if exists "memories owner update" on public.guest_memories;create policy "memories owner update" on public.guest_memories for update using(public.is_admin() or exists(select 1 from public.invitations i where i.id=invitation_id and i.user_id=auth.uid()));
drop policy if exists "memories admin delete" on public.guest_memories;create policy "memories admin delete" on public.guest_memories for delete using(public.is_admin());

drop policy if exists "contact insert" on public.contact_messages;create policy "contact insert" on public.contact_messages for insert with check(true);drop policy if exists "contact admin read" on public.contact_messages;create policy "contact admin read" on public.contact_messages for select using(public.is_admin());
drop policy if exists "settings read" on public.site_settings;create policy "settings read" on public.site_settings for select using(true);drop policy if exists "settings admin update" on public.site_settings;create policy "settings admin update" on public.site_settings for update using(public.is_admin()) with check(public.is_admin());drop policy if exists "settings admin insert" on public.site_settings;create policy "settings admin insert" on public.site_settings for insert with check(public.is_admin());

grant execute on function public.approve_order(uuid) to authenticated;grant execute on function public.reject_order(uuid,text) to authenticated;grant execute on function public.start_trial(uuid) to authenticated;grant execute on function public.invitation_is_public(uuid) to anon,authenticated;

-- Explicit API privileges. RLS controls rows; GRANT controls whether the role may access the table at all.
grant usage on schema public to anon,authenticated;
grant select on public.profiles to authenticated;
grant select on public.templates,public.plans,public.site_settings,public.invitations to anon,authenticated;
grant insert,update on public.templates,public.plans,public.site_settings,public.invitations to authenticated;
grant select,insert on public.orders to authenticated;
grant insert on public.rsvps to anon,authenticated;
grant select on public.rsvps to authenticated;
grant select,insert on public.guest_memories to anon,authenticated;
grant update,delete on public.guest_memories to authenticated;
grant insert on public.contact_messages to anon,authenticated;
grant select on public.contact_messages to authenticated;

create or replace function public.get_my_profile()
returns table(id uuid,email text,full_name text,phone text,role public.user_role,preferred_language text,created_at timestamptz,updated_at timestamptz)
language sql stable security definer set search_path=public as $$
 select p.id,p.email,p.full_name,p.phone,p.role,p.preferred_language,p.created_at,p.updated_at from public.profiles p where p.id=auth.uid() limit 1
$$;
grant execute on function public.get_my_profile() to authenticated;

insert into storage.buckets(id,name,public) values('invitation-media','invitation-media',true),('payment-receipts','payment-receipts',false),('guest-media','guest-media',true),('template-media','template-media',true) on conflict(id) do update set public=excluded.public;

drop policy if exists "invite media upload" on storage.objects;create policy "invite media upload" on storage.objects for insert to authenticated with check(bucket_id='invitation-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "invite media read" on storage.objects;create policy "invite media read" on storage.objects for select using(bucket_id='invitation-media');
drop policy if exists "receipt upload" on storage.objects;create policy "receipt upload" on storage.objects for insert to authenticated with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "receipt read" on storage.objects;create policy "receipt read" on storage.objects for select to authenticated using(bucket_id='payment-receipts' and (public.is_admin() or (storage.foldername(name))[1]=auth.uid()::text));
drop policy if exists "guest media upload public" on storage.objects;create policy "guest media upload public" on storage.objects for insert to anon,authenticated with check(bucket_id='guest-media' and array_length(storage.foldername(name),1)>=2 and public.invitation_is_public(((storage.foldername(name))[1])::uuid));
drop policy if exists "guest media read" on storage.objects;create policy "guest media read" on storage.objects for select using(bucket_id='guest-media');
drop policy if exists "template admin upload" on storage.objects;create policy "template admin upload" on storage.objects for insert to authenticated with check(bucket_id='template-media' and public.is_admin());
drop policy if exists "template media read" on storage.objects;create policy "template media read" on storage.objects for select using(bucket_id='template-media');

-- =========================================================
-- V6.2 PATCH: unique slugs + anonymous live guest wall
-- =========================================================
create or replace function public.ensure_unique_invitation_slug()
returns trigger language plpgsql security definer set search_path=public as $$
declare base_slug text; candidate text; suffix_no integer:=1;
begin
 base_slug:=lower(trim(coalesce(new.slug,'')));
 base_slug:=regexp_replace(base_slug,'[[:space:]_]+','-','g');
 base_slug:=regexp_replace(base_slug,'-{2,}','-','g');
 base_slug:=trim(both '-' from base_slug);
 if base_slug='' then base_slug:='invite-'||substr(gen_random_uuid()::text,1,6); end if;
 perform pg_advisory_xact_lock(hashtext(base_slug));
 candidate:=base_slug;
 while exists(select 1 from public.invitations i where i.slug=candidate and (new.id is null or i.id<>new.id)) loop
   suffix_no:=suffix_no+1;candidate:=base_slug||'-'||suffix_no::text;
 end loop;
 new.slug:=candidate;return new;
end $$;
drop trigger if exists ensure_unique_invitation_slug_trigger on public.invitations;
create trigger ensure_unique_invitation_slug_trigger before insert or update of slug on public.invitations for each row execute function public.ensure_unique_invitation_slug();
grant insert on table public.rsvps to anon,authenticated;
grant select,insert on table public.guest_memories to anon,authenticated;
drop policy if exists "memories public insert" on public.guest_memories;
create policy "memories public insert" on public.guest_memories for insert with check(public.invitation_is_public(invitation_id) and char_length(coalesce(guest_name,''))<=80 and ((type='wish' and approved=true and media_url is null and char_length(trim(coalesce(message,''))) between 1 and 280) or (type in('photo','audio') and approved=false and media_url is not null)));
do $$ begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='guest_memories') then alter publication supabase_realtime add table public.guest_memories; end if; end $$;
