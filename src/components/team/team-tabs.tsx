'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Users2Icon, HistoryIcon, TrophyIcon, BarChart3Icon } from 'lucide-react'

const VALID_TABS = ['matches', 'roster', 'history', 'stats', 'seasons'] as const
type Tab = typeof VALID_TABS[number]

function resolveTab(value: string | null): Tab {
  return VALID_TABS.includes(value as Tab) ? (value as Tab) : 'matches'
}

export function TeamTabs({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => resolveTab(searchParams.get('tab')))

  useEffect(() => {
    setTab(resolveTab(searchParams.get('tab')))
  }, [searchParams])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const active = wrapper.querySelector('[data-state="active"]') as HTMLElement | null
    if (!active) return
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
    active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [tab])

  const handleTabChange = useCallback((value: string) => {
    const resolved = resolveTab(value)
    setTab(resolved)
    const url = new URL(window.location.href)
    if (resolved === 'matches') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', resolved)
    }
    window.history.replaceState(null, '', url)
  }, [])

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <div className="border-b border-border">
        <div
          ref={wrapperRef}
          className="relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <TabsList
            variant="line"
            className="w-full justify-start gap-4 border-none [&>[data-slot=tabs-trigger]]:flex-none [&>[data-slot=tabs-trigger]]:after:hidden"
          >
            <TabsTrigger value="matches" className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="roster" className="flex items-center gap-1.5">
              <Users2Icon className="size-3.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <HistoryIcon className="size-3.5" />
              History
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5">
              <BarChart3Icon className="size-3.5" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex items-center gap-1.5">
              <TrophyIcon className="size-3.5" />
              Seasons
            </TabsTrigger>
          </TabsList>
          {indicator && (
            <div
              className="absolute bottom-0 h-0.5 bg-foreground transition-all duration-200 ease-in-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </div>
      </div>
      {children}
    </Tabs>
  )
}
