'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Users2Icon, HistoryIcon, TrophyIcon, BarChart3Icon } from 'lucide-react'

const VALID_TABS = ['matches', 'roster', 'history', 'stats', 'seasons'] as const
type Tab = typeof VALID_TABS[number]

function resolveTab(value: string | null): Tab {
  return VALID_TABS.includes(value as Tab) ? (value as Tab) : 'matches'
}

export function TeamTabs({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const active = wrapper.querySelector('[data-state="active"]') as HTMLElement | null
    if (!active) return
    setIndicator({ left: active.offsetLeft, width: active.offsetWidth })
  }, [tab])

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'matches') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const query = params.toString()
    router.replace(query ? `?${query}` : window.location.pathname, { scroll: false })
  }, [router, searchParams])

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
      <div ref={wrapperRef} className="relative border-b border-border">
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
      {children}
    </Tabs>
  )
}
