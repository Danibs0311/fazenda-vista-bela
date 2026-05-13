-- SQL script to migrate existing collaborators to a sequential ID system
-- This script will:
-- 1. Sort all existing collaborators by their registration date and name.
-- 2. Assign them a new sequential ID (1, 2, 3...).
-- 3. Update all existing harvest records to point to the new IDs.
--
-- IMPORTANT: Run this in your Supabase SQL Editor.

DO $$
DECLARE
    collab_record RECORD;
    counter INTEGER := 1;
BEGIN
    -- Temporary table to hold the mapping
    CREATE TEMP TABLE id_mapping (
        old_id TEXT,
        new_id TEXT
    );

    -- Create mapping for each collaborator
    FOR collab_record IN (SELECT id FROM collaborators ORDER BY data_cadastro ASC, nome ASC) LOOP
        INSERT INTO id_mapping (old_id, new_id) VALUES (collab_record.id, counter::text);
        counter := counter + 1;
    END LOOP;

    -- Update references in harvest_logs
    UPDATE harvest_logs 
    SET colaborador_id = m.new_id
    FROM id_mapping m
    WHERE harvest_logs.colaborador_id = m.old_id;

    -- Update IDs in collaborators table
    -- We use a temporary update to avoid primary key collisions during the process
    UPDATE collaborators 
    SET id = 'TEMP_' || m.new_id
    FROM id_mapping m
    WHERE collaborators.id = m.old_id;

    -- Finalize the update
    UPDATE collaborators 
    SET id = SUBSTRING(id FROM 6)
    WHERE id LIKE 'TEMP_%';

    -- Cleanup
    DROP TABLE id_mapping;
    
    RAISE NOTICE 'Migration completed. Reassigned % collaborators.', counter - 1;
END $$;
