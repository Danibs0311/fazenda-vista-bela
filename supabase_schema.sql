-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: Collaborators
create table collaborators (
  id text primary key, -- Keeping text id to match existing logic or use uuid
  nome text not null,
  cpf text unique not null,
  banco text,
  agencia text,
  conta text,
  tipo_conta text default 'corrente',
  status text default 'active',
  data_cadastro timestamp with time zone default now()
);

-- Table: Harvest Weeks
create table harvest_weeks (
  id text primary key, -- YYYY-MM-DD (start date)
  data_inicio date not null,
  data_fim date not null,
  status text default 'OPEN', -- OPEN, CLOSED, IN_CONFERENCE, PAID
  data_fechamento timestamp with time zone,
  data_pagamento timestamp with time zone
);

-- Table: Pricing Config
create table pricing_config (
  id uuid default uuid_generate_v4() primary key,
  valor_lata numeric not null,
  data_inicio_vigencia date not null
);

-- Table: Harvest Logs
create table harvest_logs (
  id text primary key, -- Using text ID from frontend gen or uuid
  colaborador_id text references collaborators(id),
  semana_id text references harvest_weeks(id),
  data_colheita date not null,
  quantidade_latas numeric not null,
  valor_por_lata numeric not null,
  valor_total_dia numeric not null,
  created_at timestamp with time zone default now()
);

-- Row Level Security (Authenticated Access for the Farm Admin)
alter table collaborators enable row level security;
alter table harvest_weeks enable row level security;
alter table pricing_config enable row level security;
alter table harvest_logs enable row level security;

-- Policies: Only authenticated users (The Farm Admin) can access and modify data
create policy "Authenticated Enable All For Collaborators" on collaborators for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Authenticated Enable All For Weeks" on harvest_weeks for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Authenticated Enable All For Pricing" on pricing_config for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "Authenticated Enable All For Logs" on harvest_logs for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Initial Data
insert into pricing_config (valor_lata, data_inicio_vigencia) values (5.50, '2024-01-01');

-- Table: Banks
create table banks (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  codigo text,
  created_at timestamp with time zone default now()
);

alter table banks enable row level security;
create policy "Authenticated Enable All For Banks" on banks for all using (auth.uid() is not null) with check (auth.uid() is not null);

insert into banks (nome, codigo) values 
('Banco do Brasil', '001'),
('Bradesco', '237'),
('Itaú', '341'),
('Santander', '033'),
('Nubank', '260'),
('Inter', '077'),
('C6 Bank', '336'),
('Caixa Econômica', '104');
