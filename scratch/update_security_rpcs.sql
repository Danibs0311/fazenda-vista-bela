-- 1. Re-create public.admin_toggle_user_status function with self-inactivation block
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

  -- Prevent self-inactivation
  IF p_user_id = auth.uid() AND p_status = 'inactive' THEN
    RAISE EXCEPTION 'Por segurança, você não pode inativar a sua própria conta administrativa.';
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

-- 2. Re-create public.admin_delete_user function with self-deletion block
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

  -- Prevent self-deletion
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Por segurança, você não pode excluir a sua própria conta.';
  END IF;

  -- Delete public.profiles
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- 3. Re-create public.admin_update_user function with upsert profile
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

  -- Update or insert public.profiles
  INSERT INTO public.profiles (id, nome, role, status)
  VALUES (p_user_id, p_nome, p_role, 'active')
  ON CONFLICT (id) DO UPDATE 
  SET nome = EXCLUDED.nome,
      role = EXCLUDED.role;

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('nome', p_nome, 'role', p_role),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Re-grant execute permissions just in case
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) TO authenticated;
