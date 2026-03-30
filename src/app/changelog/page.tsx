import type { Metadata } from 'next'
import { changelog } from '@/data/changelog'

export const metadata: Metadata = {
  title: 'Changelog — Benchwarm',
  description: 'Recent updates and improvements to Benchwarm.',
}

export default function ChangelogPage() {
  return (
    <main className="flex flex-1 flex-col items-center">
      <div className="flex flex-col w-full max-w-3xl mx-auto px-4 py-8 pb-12 gap-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
          <p className="text-muted-foreground text-sm mt-1">Recent updates and improvements.</p>
        </div>

        <div className="flex flex-col">
          {changelog.map((entry, i) => (
            <div key={i} className="flex gap-6 group">
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className="size-2.5 rounded-full bg-amber-700 mt-1.5 shrink-0" />
                {i < changelog.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-8 flex flex-col gap-1 min-w-0">
                <time className="text-xs text-muted-foreground tabular-nums">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <h2 className="font-semibold tracking-tight">{entry.title}</h2>
                {Array.isArray(entry.description) ? (
                  <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-outside pl-4 space-y-1">
                    {entry.description.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
