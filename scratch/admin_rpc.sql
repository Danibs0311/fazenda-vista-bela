-- Security Definer RPC functions for secure user management without exposing the service_role key to client browsers

-- 1. Create User
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
  -- Check admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email inválido.';
  END IF;
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'A senha deve conter pelo menos 6 caracteres.';
  END IF;

  -- Encrypt password using pgcrypto crypt (prefixed with extensions schema for Supabase)
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- Insert into auth.users (omitting generated column confirmed_at)
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
    is_sso_user
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
    FALSE
  )
  RETURNING id INTO v_user_id;

  -- Insert into public.profiles
  INSERT INTO public.profiles (id, nome, role, status)
  VALUES (v_user_id, p_nome, p_role, 'active')
  ON CONFLICT (id) DO UPDATE 
  SET nome = p_nome, role = p_role, status = 'active';

  RETURN json_build_object('success', true, 'id', v_user_id);
END;
$$;

-- 2. Update User
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
  -- Check admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Update public.profiles
  UPDATE public.profiles
  SET nome = p_nome,
      role = p_role
  WHERE id = p_user_id;

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('nome', p_nome, 'role', p_role),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 3. Toggle User Status (Soft Delete)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_status(
  p_user_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Validate status
  IF p_status NOT IN ('active', 'inactive') THEN
    RAISE EXCEPTION 'Status inválido. Use "active" ou "inactive".';
  END IF;

  -- Update public.profiles
  UPDATE public.profiles
  SET status = p_status
  WHERE id = p_user_id;

  -- Update auth.users metadata and banned_until (triggers instant session block in Supabase Gotrue)
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

-- 4. Delete User (Hard Delete)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem gerenciar usuários.';
  END IF;

  -- Delete public.profiles
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 5. List Users (Includes Auth Email and Metadata)
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
BEGIN
  -- Check admin authorization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Apenas administradores podem listar usuários.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.role,
    p.status,
    u.email::text,
    (u.raw_user_meta_data->>'cpf')::text AS cpf
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id;
END;
$$;
