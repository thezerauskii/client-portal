/**
 * Platform URL templates — maps platform IDs to profile URL builders.
 * Used by PortalLinks to construct profile URLs from handles stored
 * in profiles.platform_connections.
 */

const PLATFORM_URLS = {
  bluesky: (handle) => `https://bsky.app/profile/${handle}`,
  deviantart: (handle) => `https://www.deviantart.com/${handle}`,
  furaffinity: (handle) => `https://www.furaffinity.net/user/${handle}`,
  twitter: (handle) => `https://twitter.com/${handle}`,
  instagram: (handle) => `https://instagram.com/${handle}`,
  kofi: (handle) => `https://ko-fi.com/${handle}`,
  patreon: (handle) => `https://patreon.com/${handle}`,
  telegram: (handle) => `https://t.me/${handle}`,
  e621: (handle) => `https://e621.net/users/${handle}`,
  weasyl: (handle) => `https://www.weasyl.com/~${handle}`,
  inkbunny: (handle) => `https://inkbunny.net/${handle}`,
  pixiv: (handle) => `https://www.pixiv.net/users/${handle}`,
  artstation: (handle) => `https://www.artstation.com/${handle}`,
  tumblr: (handle) => `https://${handle}.tumblr.com`,
  newgrounds: (handle) => `https://${handle}.newgrounds.com`,
  itaku: (handle) => `https://itaku.ee/profile/${handle}`,
  mastodon: (handle) => handle, // mastodon handle is usually full URL
  discord: (handle) => `https://discord.gg/${handle}`,
  sofurry: (handle) => `https://www.sofurry.com/user/${handle}`,
  furrynetwork: (handle) => `https://furrynetwork.com/${handle}`,
  hentaifoundry: (handle) => `https://www.hentai-foundry.com/user/${handle}`,
  pillowfort: (handle) => `https://www.pillowfort.social/${handle}`,
}

/**
 * Builds a profile URL for a given platform and handle.
 * @param {string} platform - Platform ID (e.g. 'bluesky', 'twitter')
 * @param {string} handle - User handle/username on that platform
 * @returns {string|null} Full profile URL, or null if platform is unknown or handle is empty
 */
export function buildPlatformUrl(platform, handle) {
  if (!handle) return null
  const builder = PLATFORM_URLS[platform]
  if (!builder) return null
  return builder(handle)
}

/**
 * Platform display info — icons (emoji) and display names.
 */
export const PLATFORM_INFO = {
  twitter: { icon: '🐦', name: 'Twitter/X' },
  instagram: { icon: '📸', name: 'Instagram' },
  deviantart: { icon: '🎨', name: 'DeviantArt' },
  furaffinity: { icon: '🦊', name: 'FurAffinity' },
  artstation: { icon: '🖼', name: 'ArtStation' },
  kofi: { icon: '☕', name: 'Ko-fi' },
  patreon: { icon: '🎭', name: 'Patreon' },
  bluesky: { icon: '🌐', name: 'Bluesky' },
  telegram: { icon: '✈️', name: 'Telegram' },
  e621: { icon: '🐾', name: 'e621' },
  weasyl: { icon: '🐲', name: 'Weasyl' },
  inkbunny: { icon: '🐰', name: 'Inkbunny' },
  pixiv: { icon: '🎋', name: 'Pixiv' },
  tumblr: { icon: '📝', name: 'Tumblr' },
  newgrounds: { icon: '🎮', name: 'Newgrounds' },
  itaku: { icon: '🌸', name: 'Itaku' },
  mastodon: { icon: '🐘', name: 'Mastodon' },
  discord: { icon: '💬', name: 'Discord' },
  sofurry: { icon: '🦁', name: 'SoFurry' },
  furrynetwork: { icon: '🐺', name: 'FurryNetwork' },
  hentaifoundry: { icon: '🔞', name: 'Hentai-Foundry' },
  pillowfort: { icon: '🛋', name: 'Pillowfort' },
}
