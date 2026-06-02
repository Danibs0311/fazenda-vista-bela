const pg = require('pg');
const { Client } = pg;

async function run() {
  const configs = [
    {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    },
    {
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    },
    {
      host: '147.15.114.255',
      port: 5432,
      user: 'postgres',
      password: 'VistaBela2026SecurePass',
      database: 'postgres'
    }
  ];

  let client;
  for (const config of configs) {
    try {
      console.log(`Trying to connect to ${config.host}:${config.port}...`);
      client = new Client(config);
      await client.connect();
      console.log('Connected successfully!');
      break;
    } catch (err) {
      console.error(`Failed to connect to ${config.host}:`, err.message);
      client = null;
    }
  }

  if (!client) {
    console.error('Could not connect to any database config.');
    process.exit(1);
  }

  try {
    console.log('1. Re-creating public.admin_toggle_user_status function with self-inactivation block...');
    await client.query(`
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
    `);
    console.log('Function public.admin_toggle_user_status re-created successfully!');

    console.log('2. Re-creating public.admin_delete_user function with self-deletion block...');
    await client.query(`
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
    `);
    console.log('Function public.admin_delete_user re-created successfully!');

    console.log('3. Re-creating public.admin_update_user function with upsert profile...');
    await client.query(`
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
    `);
    console.log('Function public.admin_update_user re-created successfully!');

    // Re-grant execute permissions just in case
    console.log('Re-granting execute permissions...');
    await client.query('GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(uuid, text) TO authenticated;');
    await client.query('GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;');
    await client.query('GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, text, text) TO authenticated;');
    console.log('Permissions granted successfully!');

  } catch (err) {
    console.error('Error during database update:', err.message);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

run();
