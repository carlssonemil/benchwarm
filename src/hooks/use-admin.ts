'use client'

import { useAdminContext } from '@/components/team/admin-context'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useAdmin(_slug: string) {
  return useAdminContext()
}
