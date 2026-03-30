'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PlayerStat } from '@/types/database'

type SortKey = 'name' | 'gamesPlayed' | 'gamesSatOut' | 'timesUnavailable' | 'timesNoShow' | 'currentBank' | 'playRate'

interface PlayerStatsTableProps {
  stats: PlayerStat[]
}

export function PlayerStatsTable({ stats }: PlayerStatsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  // Starts false (SSR-safe), updates after mount — no hydration mismatch
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches)
  }, [])

  if (stats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No stats yet — play some matches first.
      </p>
    )
  }

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(a => !a)
    } else {
      setSortKey(key)
      setSortAsc(key === 'name')
    }
  }

  const sorted = [...stats].sort((a, b) => {
    let av: string | number, bv: string | number
    if (sortKey === 'name') {
      av = a.player.name
      bv = b.player.name
    } else {
      av = a[sortKey] ?? -1
      bv = b[sortKey] ?? -1
    }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

  const cols: { key: SortKey; label: string; title?: string }[] = [
    { key: 'name', label: 'Player' },
    { key: 'gamesPlayed', label: 'Played', title: 'Games played' },
    { key: 'gamesSatOut', label: 'Sat out', title: 'Games sat out while available' },
    { key: 'timesUnavailable', label: 'Unavail.', title: 'Times marked unavailable' },
    { key: 'timesNoShow', label: 'No-show', title: 'Times selected but did not show up' },
    { key: 'currentBank', label: 'Bank', title: 'Current wheel entries' },
    { key: 'playRate', label: 'Play %', title: '% of available matches played' },
  ]

  return (
    <div className="relative">
      {/* Gradient hint indicating horizontal scroll on mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />
    <Table>
      <TableHeader>
        <TableRow>
          {cols.map(col => (
            <TableHead
              key={col.key}
              onClick={() => handleSort(col.key)}
              className="cursor-pointer select-none whitespace-nowrap"
            >
              {col.title ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex items-center gap-1"
                      title={isTouch ? col.title : undefined}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortAsc ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
                      ) : null}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{col.title}</TooltipContent>
                </Tooltip>
              ) : (
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key ? (
                    sortAsc ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />
                  ) : null}
                </span>
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      
      <TableBody>
        {sorted.map(s => (
          <TableRow key={s.player.id}>
            <TableCell className="font-medium">{s.player.name}</TableCell>
            <TableCell>{s.gamesPlayed}</TableCell>
            <TableCell>{s.gamesSatOut}</TableCell>
            <TableCell>{s.timesUnavailable}</TableCell>
            <TableCell>
              {s.timesNoShow > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium">{s.timesNoShow}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <span className={s.currentBank > 1 ? 'font-semibold text-primary' : ''}>
                {s.currentBank}
              </span>
            </TableCell>
            <TableCell>
              {s.playRate !== null ? (
                <span className={s.playRate < 0.5 ? 'text-amber-600 dark:text-amber-400' : ''}>
                  {Math.round(s.playRate * 100)}%
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}
