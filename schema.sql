-- ============================================================
--  Kada – Supabase schema
--  Run this entire file in your Supabase SQL editor once.
-- ============================================================

-- 1. Shops (one per user account)
create table if not exists public.shops (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid references auth.users(id) on delete cascade not null,
  name           text not null default 'My Shop',
  address        text not null default '',
  gstin          text not null default '',
  phone          text not null default '',
  bill_counter   integer not null default 0,
  created_at     timestamptz not null default now()
);

-- 2. Products
create table if not exists public.products (
  id         text primary key,
  shop_id    uuid references public.shops(id) on delete cascade not null,
  name       text not null,
  price      numeric(12,4) not null,
  unit       text not null default 'piece',
  gst_rate   integer not null default 0,
  category   text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Operators (employees)
create table if not exists public.operators (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid references public.shops(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz not null default now()
);

-- 4. Bills
create table if not exists public.bills (
  id             text primary key,
  shop_id        uuid references public.shops(id) on delete cascade not null,
  bill_number    text not null,
  date           timestamptz not null,
  customer_name  text not null default '',
  customer_phone text not null default '',
  payment_mode   text not null,
  operator_name  text not null default '',
  subtotal       numeric(12,4) not null,
  total_cgst     numeric(12,4) not null,
  total_sgst     numeric(12,4) not null,
  total_gst      numeric(12,4) not null,
  discount       numeric(12,4) not null default 0,
  grand_total    numeric(12,4) not null,
  created_at     timestamptz not null default now()
);

-- 5. Bill items
create table if not exists public.bill_items (
  id             uuid primary key default gen_random_uuid(),
  bill_id        text references public.bills(id) on delete cascade not null,
  product_id     text not null,
  name           text not null,
  price          numeric(12,4) not null,
  quantity       numeric(10,3) not null,
  unit           text not null,
  gst_rate       integer not null,
  taxable_amount numeric(12,4) not null,
  cgst           numeric(12,4) not null,
  sgst           numeric(12,4) not null,
  line_total     numeric(12,4) not null
);

-- ── Row Level Security ──────────────────────────────────────
alter table public.shops      enable row level security;
alter table public.products   enable row level security;
alter table public.operators  enable row level security;
alter table public.bills      enable row level security;
alter table public.bill_items enable row level security;

create policy "shops_owner"     on public.shops     for all using (owner_id = auth.uid());
create policy "products_owner"  on public.products  for all using (shop_id in (select id from public.shops where owner_id = auth.uid()));
create policy "operators_owner" on public.operators for all using (shop_id in (select id from public.shops where owner_id = auth.uid()));
create policy "bills_owner"     on public.bills     for all using (shop_id in (select id from public.shops where owner_id = auth.uid()));
create policy "bill_items_owner" on public.bill_items for all using (
  bill_id in (
    select b.id from public.bills b
    join public.shops s on b.shop_id = s.id
    where s.owner_id = auth.uid()
  )
);

-- ── Bill counter RPC ─────────────────────────────────────────
-- Atomically increments and returns the new bill number
create or replace function public.next_bill_number(p_shop_id uuid)
returns integer
language plpgsql security definer
as $$
declare v integer;
begin
  update public.shops set bill_counter = bill_counter + 1
  where id = p_shop_id returning bill_counter into v;
  return v;
end;
$$;
