'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function extractSlug(input: string): string {
  const trimmed = input.trim()
  // Handle full URLs like https://…/team/some-slug
  const match = trimmed.match(/\/team\/([a-z0-9-]+)/i)
  if (match) return match[1]
  return trimmed
}

export function JoinTeamForm() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const slug = extractSlug(value)
    if (!slug) return setError('Enter a team link or slug.')

    startTransition(() => {
      router.push(`/team/${slug}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
      <div className="flex gap-2">
        <Input
          placeholder="Paste link or enter team slug"
          value={value}
          onChange={e => setValue(e.target.value)}
          className="flex-1"
        />

        <Button type="submit" variant="outline" disabled={isPending}>
          {isPending ? '…' : 'Join'}
        </Button>
      </div>
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
