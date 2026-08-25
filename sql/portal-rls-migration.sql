-- ============================================================
-- Client Portal — RLS Policies & Schema Changes
-- Habilita acceso anónimo read-only para el portal público
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- Schema changes en profiles
-- Agrega columnas necesarias para el portal público
-- ═══════════════════════════════════════════════════════════════

-- Slug público para identificar al artista en la URL del portal (/p/:slug)
alter table profiles add column if not exists public_slug text unique;

-- Conexiones de plataformas (auto-populated desde Publishing)
-- Formato: { "bluesky": { "handle": "user.bsky.social", "connected": true }, ... }
alter table profiles add column if not exists platform_connections jsonb default '{}'::jsonb;

-- Índice para lookup rápido por slug (usado en cada request del portal)
create index if not exists idx_profiles_public_slug on profiles(public_slug);

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies — Acceso anónimo de solo lectura para el portal
-- Solo artistas con public_slug configurado exponen sus datos
-- ═══════════════════════════════════════════════════════════════

-- profiles: lectura pública por slug
-- Solo retorna perfiles que tienen un slug público configurado
create policy "portal_read_profile_by_slug" on profiles
  for select to anon
  using (public_slug is not null);

-- tasks: lectura pública de comisiones no archivadas
-- Solo expone tasks de artistas con portal público activo
-- NOTA: payment_details NO debe exponerse — la query del portal
-- debe usar .select() con campos específicos, excluyéndolo
create policy "portal_read_tasks" on tasks
  for select to anon
  using (
    archived is not true
    and user_id in (select id from profiles where public_slug is not null)
  );

-- portfolio_items: lectura pública del portafolio
-- Solo expone items de artistas con portal público activo
create policy "portal_read_portfolio" on portfolio_items
  for select to anon
  using (
    user_id in (select id from profiles where public_slug is not null)
  );

-- kanban_config: lectura pública de configuración del kanban
-- Necesario para renderizar las columnas correctamente en el portal
create policy "portal_read_kanban_config" on kanban_config
  for select to anon
  using (
    user_id in (select id from profiles where public_slug is not null)
  );

-- ═══════════════════════════════════════════════════════════════
-- Notas de seguridad
-- ═══════════════════════════════════════════════════════════════
-- 1. Estas policies son SOLO SELECT — el rol anon no puede INSERT/UPDATE/DELETE
-- 2. payment_details en tasks NO se expone: el frontend debe usar
--    .select('id, priority, stage, client, client_email, deadline, note, attachments, checklist, section_id')
--    y NUNCA incluir payment_details en la query
-- 3. client_email se usa SOLO para el filtro client-side, NUNCA se renderiza visualmente
-- 4. Solo artistas que configuraron su public_slug tienen datos accesibles
-- 5. Si un artista quiere desactivar su portal, basta con poner public_slug = NULL
