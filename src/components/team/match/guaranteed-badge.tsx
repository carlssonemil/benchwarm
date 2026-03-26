import { Badge } from '@/components/ui/badge'
import { ShieldCheckIcon } from 'lucide-react'

export function GuaranteedBadge({ streak }: { streak: number }) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    >
      <ShieldCheckIcon className="size-3" />
      Guaranteed · {streak} week{streak !== 1 ? 's' : ''} out
    </Badge>
  )
}
