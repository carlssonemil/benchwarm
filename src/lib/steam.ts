/**
 * Steam profile fetching via the public XML endpoint.
 * No API key required.
 */

export interface SteamProfile {
  name: string
  avatarUrl: string
}

/**
 * Normalizes a Steam input (SteamID64, profile URL, or vanity name) to a SteamID64.
 * Returns null if the input cannot be resolved.
 */
export function resolveSteamId(input: string): string | null {
  const trimmed = input.trim()

  // Already a SteamID64 (17-digit number)
  if (/^\d{17}$/.test(trimmed)) return trimmed

  // Full profile URL: steamcommunity.com/profiles/76561198...
  const profileMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/)
  if (profileMatch) return profileMatch[1]

  // Vanity URL: steamcommunity.com/id/username — we can't resolve this without an API key,
  // so extract the vanity name and build the XML URL from it directly (Steam supports both).
  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/\s]+)/)
  if (vanityMatch) return `vanity:${vanityMatch[1]}`

  // Plain vanity name (no URL)
  if (/^[a-zA-Z0-9_-]{2,32}$/.test(trimmed)) return `vanity:${trimmed}`

  return null
}

/**
 * Fetches a Steam profile from the public XML endpoint.
 * Accepts a SteamID64 or a "vanity:name" string from resolveSteamId().
 * Returns null on failure (private profile, network error, bad ID).
 */
export async function fetchSteamProfile(steamIdOrVanity: string): Promise<SteamProfile | null> {
  try {
    let url: string
    if (steamIdOrVanity.startsWith('vanity:')) {
      const vanity = steamIdOrVanity.slice(7)
      url = `https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`
    } else {
      url = `https://steamcommunity.com/profiles/${steamIdOrVanity}/?xml=1`
    }

    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return null

    const xml = await res.text()

    // Extract fields with simple regex — avoids needing an XML parser
    const nameMatch = xml.match(/<steamID><!\[CDATA\[([^\]]+)\]\]><\/steamID>/)
    const avatarMatch = xml.match(/<avatarFull><!\[CDATA\[([^\]]+)\]\]><\/avatarFull>/)

    if (!nameMatch || !avatarMatch) return null

    return {
      name: nameMatch[1].trim(),
      avatarUrl: avatarMatch[1].trim(),
    }
  } catch {
    return null
  }
}
