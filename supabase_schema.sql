-- ==========================================
-- SCRIPT DE CONSOLIDAÇÃO DO BANCO DE DADOS
-- Projeto: Fazenda Vista Bela - Gestão de Colheita
-- ==========================================

-- Habilitar extensão para geração de UUIDs
create extension if not exists "uuid-ossp";

-- 1. TABELA: public.profiles (Perfis de Usuários Administrativos/Apontadores)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  role text not null check (role in ('admin', 'cabo')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default now()
);

-- 2. TABELA: public.collaborators (Colaboradores / Colhedores)
create table if not exists public.collaborators (
  id text primary key, -- IDs sequenciais baseados em texto (1, 2, 3...)
  nome text not null,
  cpf text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text default 'corrente',
  status text default 'active',
  data_cadastro timestamp with time zone default now()
);

-- Índice Único Parcial: Impede CPFs duplicados, exceto CPFs nulos, vazios ou zerados
create unique index if not exists unique_collaborators_cpf_non_zero 
on public.collaborators (cpf) 
where (cpf is not null and cpf <> '000.000.000-00' and cpf <> '00000000000' and cpf <> '');

-- 3. TABELA: public.harvest_weeks (Semanas de Safra)
create table if not exists public.harvest_weeks (
  id text primary key, -- Formato YYYY-MM-DD (data de início)
  data_inicio date not null,
  data_fim date not null,
  status text default 'OPEN', -- OPEN, CLOSED, IN_CONFERENCE, PAID
  data_fechamento timestamp with time zone,
  data_pagamento timestamp with time zone
);

-- 4. TABELA: public.pricing_config (Preço das Latas)
create table if not exists public.pricing_config (
  id uuid default uuid_generate_v4() primary key,
  valor_lata numeric not null,
  data_inicio_vigencia date not null
);

-- 5. TABELA: public.harvest_logs (Lançamentos Diários de Colheita)
create table if not exists public.harvest_logs (
  id text primary key,
  colaborador_id text references public.collaborators(id),
  semana_id text references public.harvest_weeks(id),
  data_colheita date not null,
  quantidade_latas numeric not null,
  valor_por_lata numeric not null,
  valor_total_dia numeric not null,
  criado_por_id uuid references auth.users(id) on delete set null,
  criado_por_nome text,
  created_at timestamp with time zone default now()
);

-- 6. TABELA: public.banks (Bancos Disponíveis)
create table if not exists public.banks (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  codigo text,
  created_at timestamp with time zone default now()
);

-- ==========================================
-- SEGURANÇA: Habilitar Row Level Security (RLS)
-- ==========================================
alter table public.profiles enable row level security;
alter table public.collaborators enable row level security;
alter table public.harvest_weeks enable row level security;
alter table public.pricing_config enable row level security;
alter table public.harvest_logs enable row level security;
alter table public.banks enable row level security;

-- ==========================================
-- POLÍTICAS DE RLS (Row Level Security)
-- ==========================================

-- Políticas para a tabela public.profiles
drop policy if exists "Allow public read profiles" on public.profiles;
create policy "Allow public read profiles" on public.profiles
  for select using (true);

drop policy if exists "Allow users to insert their own profile" on public.profiles;
create policy "Allow users to insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Allow users to update their own profile" on public.profiles;
create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Allow admins to modify profiles" on public.profiles;
create policy "Allow admins to modify profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin' and status = 'active'
    )
  );

-- Políticas gerais de acesso autenticado (apenas operadores logados podem ler/gravar)
drop policy if exists "Authenticated Enable All For Collaborators" on public.collaborators;
create policy "Authenticated Enable All For Collaborators" on public.collaborators for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Authenticated Enable All For Weeks" on public.harvest_weeks;
create policy "Authenticated Enable All For Weeks" on public.harvest_weeks for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Authenticated Enable All For Pricing" on public.pricing_config;
create policy "Authenticated Enable All For Pricing" on public.pricing_config for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Authenticated Enable All For Logs" on public.harvest_logs;
create policy "Authenticated Enable All For Logs" on public.harvest_logs for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Authenticated Enable All For Banks" on public.banks;
create policy "Authenticated Enable All For Banks" on public.banks for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ==========================================
-- CARGA INICIAL DE DADOS (SEEDS)
-- ==========================================
insert into public.pricing_config (valor_lata, data_inicio_vigencia) 
values (5.50, '2024-01-01')
on conflict do nothing;

insert into public.banks (nome, codigo) values 
('Banco do Brasil', '001'),
('Bradesco', '237'),
('Itaú', '341'),
('Santander', '033'),
('Nubank', '260'),
('Inter', '077'),
('C6 Bank', '336'),
('Caixa Econômica', '104')
on conflict (nome) do nothing;

-- ==========================================
-- FUNÇÕES RPC SEGUROS (SECURITY DEFINER)
-- Permite gerenciamento de usuários no Auth do Supabase sem expor a chave de admin ao front-end
-- ==========================================

-- 1. admin_create_user: Criar usuário (auth e profile)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_nome text,
  p_cpf text,
  p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Verificar se quem executa é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Validações básicas
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email inválido.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve conter pelo menos 6 caracteres.';
  END IF;

  -- Criptografar a senha usando pgcrypto do Supabase (prefixado com extensions)
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- Inserir usuário na base interna do Supabase Auth
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    email_change_token_current,
    reauthentication_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nome', p_nome, 'cpf', p_cpf, 'role', p_role),
    FALSE,
    now(),
    now(),
    FALSE,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Inserir perfil correspondente na tabela pública
  INSERT INTO public.profiles (id, nome, role, status)
  VALUES (v_user_id, p_nome, p_role, 'active')
  ON CONFLICT (id) DO UPDATE 
  SET nome = p_nome, role = p_role, status = 'active';

  RETURN json_build_object('success', true, 'id', v_user_id);
END;
$$;

-- 2. admin_toggle_user_status: Ativar ou inativar contas
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem executa é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Validar status
  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Status inválido. Use "active" ou "inactive".';
  END IF;

  -- Impedir autoinativação de segurança
  IF p_user_id = auth.uid() AND p_status = 'inactive' THEN
    RAISE EXCEPTION 'Por segurança, você não pode inativar a sua própria conta administrativa.';
  END IF;

  -- Atualizar perfil na tabela pública
  UPDATE public.profiles
  SET status = p_status
  WHERE id = p_user_id;

  -- Atualizar o Auth para desconectar o usuário instantaneamente banindo-o
  IF p_status = 'inactive' THEN
    UPDATE auth.users
    SET banned_until = '2099-01-01 00:00:00+00'::timestamptz,
        updated_at = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE auth.users
    SET banned_until = NULL,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- 3. admin_delete_user: Exclusão permanente de usuários
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem executa é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Impedir autoexclusão
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Por segurança, você não pode excluir a sua própria conta.';
  END IF;

  -- Deletar perfil
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Deletar da base do auth
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 4. admin_update_user: Atualizar dados do usuário
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id uuid,
  p_nome text,
  p_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se quem executa é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Inserir ou atualizar na tabela pública
  INSERT INTO public.profiles (id, nome, role, status)
  VALUES (p_user_id, p_nome, p_role, 'active')
  ON CONFLICT (id) DO UPDATE 
  SET nome = EXCLUDED.nome,
      role = EXCLUDED.role;

  -- Atualizar os metadados do auth
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('nome', p_nome, 'role', p_role),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 5. admin_list_users: Listar usuários com emails e CPFs do Auth
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  nome text,
  role text,
  status text,
  email text,
  cpf text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
BEGIN
  -- Verificar se quem executa é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem listar usuários.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    COALESCE(p.nome, (u.raw_user_meta_data->>'nome'), UPPER(SPLIT_PART(u.email, '@', 1)))::text AS nome,
    COALESCE(p.role, (u.raw_user_meta_data->>'role'), 'admin')::text AS role,
    COALESCE(p.status, 'active')::text AS status,
    u.email::text,
    (u.raw_user_meta_data->>'cpf')::text AS cpf
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id;
END;
$$;

-- ==========================================
-- PERMISSÕES: Conceder execução de RPCs aos usuários autenticados
-- ==========================================
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
