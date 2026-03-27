import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ShieldCheckIcon } from 'lucide-react'

export function GuaranteedBadge({ streak }: { streak: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="gap-1 text-xs bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
        >
          <ShieldCheckIcon className="size-3" />
          Guaranteed
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Sat out {streak} match{streak !== 1 ? 'es' : ''} in a row
      </TooltipContent>
    </Tooltip>
  )
}
