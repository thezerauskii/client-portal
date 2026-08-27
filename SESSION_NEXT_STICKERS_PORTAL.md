# Client Portal — Próxima Sesión: Sistema de Stickers Interactivo

## Objetivo
Agregar el sistema completo de stickers de Telegram al portal público de Vercel. Los clientes podrán poner stickers como reacciones en los dibujos/comisiones. Esta será la única feature interactiva del portal para el usuario visitante.

## Cómo funciona en Electron (referencia)
- Los sticker sets están guardados en `profiles.telegram_sticker_sets` (array de nombres de sets)
- Los stickers se cargan via `https://api.telegram.org/bot{TOKEN}/getStickerSet?name={NAME}`
- Los stickers colocados se guardan en `task_fields.reactions` como `__sticker__{file_unique_id}` con posición `{x, y}` y thumbnail URL
- Se muestran como overlay sobre la tarjeta con drag para posicionar

## Lo que hay que hacer en el Portal (Vercel)

### 1. Leer sticker sets del perfil
- Ya tenemos `usePortalData` que lee de `profiles` — agregar `telegram_sticker_sets` al query
- También necesitamos el `telegram_token` del artista para llamar la API (o un proxy público)

### 2. Componente StickerReactions en PortalKanbanBoard
- Leer `task_fields` de Supabase para cada comisión (los reactions ya están ahí)
- Mostrar los stickers colocados sobre el thumbnail de cada card
- Permitir al visitante agregar stickers (selector de stickers + click para colocar)

### 3. Panel de stickers
- Mostrar los sets del artista como tabs
- Grid de stickers seleccionables
- Al clickear un sticker, se "coloca" en la comisión
- Guardar la reacción en Supabase `tasks` → `attachments` o crear una tabla `sticker_reactions`

### 4. Visualización de stickers sobre thumbnails
- Overlay absoluto sobre cada card thumbnail
- Stickers con outline blanco delgado (drop-shadow 1px)
- Posición libre o fila al pie del thumbnail

## Datos relevantes
- Bot Token: se lee de `profiles.telegram_token` del artista
- Sticker sets: `profiles.telegram_sticker_sets` (array de strings)
- API Telegram: `https://api.telegram.org/bot{TOKEN}/getStickerSet?name={SET}`
- File URL: `https://api.telegram.org/file/bot{TOKEN}/{file_path}` (requiere `getFile` primero)
- Las reacciones existentes están en el campo `reactions` del task_fields en localStorage/Supabase

## Consideraciones
- El bot token del artista NO debe exponerse en el frontend público
- Solución: crear un endpoint proxy en el R2 Worker o usar Supabase Edge Function
- O pre-cachear los thumbnails de stickers en R2 durante sync desde Electron

## Archivos clave
- `client-portal/src/components/portal/PortalKanbanBoard.jsx` — donde se renderizan las cards
- `commission-manager-local/renderer/components/StickerPanel.jsx` — referencia del panel
- `commission-manager-local/renderer/components/KanbanBoard.jsx` — referencia del overlay
- `commission-manager-local/renderer/styles/global.css` — CSS de `.sticker-overlay-*`
