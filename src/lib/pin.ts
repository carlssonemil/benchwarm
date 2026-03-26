import { sql } from './db'

/** Throws if pinHash doesn't match the stored hash for the team. */
export async function requirePin(slug: string, pinHash: string): Promise<void> {
  const rows = await sql`SELECT admin_pin_hash FROM teams WHERE slug = ${slug} LIMIT 1`
  const stored = (rows[0] as { admin_pin_hash: string } | undefined)?.admin_pin_hash
  if (!stored || stored !== pinHash) {
    throw new Error('Unauthorized: invalid PIN')
  }
}
