'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { playerColor } from '@/lib/constants'
import type { Player } from '@/types/database'

interface PlayerAvatarProps {
  player: Pick<Player, 'id' | 'name' | 'avatar_url'>
  color?: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function PlayerAvatar({ player, color, size = 'default', className }: PlayerAvatarProps) {
  const fallbackColor = color ?? playerColor(player.id)
  const initial = player.name[0]?.toUpperCase() ?? '?'

  return (
    <Avatar size={size} className={className}>
      {player.avatar_url && (
        <AvatarImage src={player.avatar_url} alt={player.name} />
      )}
      <AvatarFallback
        style={{ backgroundColor: fallbackColor, color: 'white' }}
        className="font-bold"
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
