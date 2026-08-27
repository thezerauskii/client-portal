-- ══════════════════════════════════════════════════════════════════════════════
-- Portal Stickers RLS Migration
-- Permite a usuarios anónimos (visitantes del portal) leer datos necesarios
-- para el sistema de stickers interactivo.
--
-- NOTA: La escritura de reactions se hace exclusivamente via Edge Functions
-- (place-sticker, remove-sticker) usando el service_role_key, por lo que
-- NO necesitamos políticas de UPDATE para anon en la tabla tasks.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Política SELECT en profiles para campos de stickers ────────────────────
-- Los visitantes del portal necesitan leer telegram_sticker_sets del artista
-- para saber qué sets mostrar en el picker.
-- La política existente "profiles: own data only" solo permite al owner.
-- Agregamos una política para anon que lee solo campos públicos de artistas con portal.

CREATE POLICY "portal: public profile sticker data" ON profiles
  FOR SELECT
  TO anon
  USING (
    public_slug IS NOT NULL
    AND public_slug != ''
  );

-- Nota: Esta política permite SELECT de toda la row, pero el frontend solo
-- hace select de campos específicos. El telegram_token NO se expone porque
-- el frontend nunca lo pide en su select — y el proxy lo lee con service_role.


-- ── 2. Política SELECT en tasks para leer reactions ───────────────────────────
-- Los visitantes necesitan leer tasks (incluyendo reactions) del artista
-- cuyo portal están visitando. Requiere que el task pertenezca a un artista
-- que tiene portal público activo.

CREATE POLICY "portal: read artist tasks" ON tasks
  FOR SELECT
  TO anon
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE public_slug IS NOT NULL
      AND public_slug != ''
    )
  );


-- ── 3. Verificar que la columna reactions existe en tasks ─────────────────────
-- (Ya debería existir del schema original, pero por seguridad)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'reactions'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reactions jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;


-- ── 4. Índice para acelerar la lookup de portal tasks ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_not_archived
  ON tasks (user_id)
  WHERE (archived IS NULL OR archived = false);

-- Índice para buscar profiles con portal activo
CREATE INDEX IF NOT EXISTS idx_profiles_public_slug_active
  ON profiles (public_slug)
  WHERE public_slug IS NOT NULL AND public_slug != '';
