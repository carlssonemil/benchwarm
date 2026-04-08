export type ChangelogEntry = {
  date: string
  title: string
  description: string | string[]
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-08',
    title: 'Share your lineup picks as a GIF',
    description: [
      'After all spins complete, a summary screen shows the full lineup with a "Download GIF" button.',
      'The GIF replays every spin in sequence — one shareable clip of the entire selection process.',
      'Works with both manual spins and Quick spin. Drag it straight into Discord.',
    ],
  },
  {
    date: '2026-03-30',
    title: 'No-show & replacement updates',
    description: [
      'Players can be marked as no-shows or replacements directly on a match.',
      'Replacements now count toward match history for fair sit-out calculations.',
      'Streamlined the spin flow — "Next pick" and spin are now a single click.',
      'Fixed a bug with the "Go to Roster" button.',
      'Various stats table and mobile layout improvements.',
    ],
  },
  {
    date: '2026-03-27',
    title: 'UI & navigation updates',
    description: [
      'Team onboarding flow added so new teams can get set up quickly.',
      'Season cards and the history tab got a visual refresh.',
      'History match cards are now fully clickable.',
      'Roster is now sorted alphabetically.',
      'Tabs are mobile responsive.',
      'Fixed a tab-switching flicker and a cursor style issue.',
    ],
  },
  {
    date: '2026-03-26',
    title: 'Initial release',
    description: 'Benchwarm is live! Weighted spin-the-wheel lineup picker for sports teams.',
  },
]
