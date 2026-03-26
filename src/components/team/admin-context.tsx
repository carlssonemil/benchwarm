'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { ADMIN_PIN_SESSION_KEY } from '@/lib/constants'

interface AdminContextValue {
  isAdmin: boolean
  setAdminPin: (pinHash: string) => void
  clearAdmin: () => void
  getStoredPinHash: () => string | null
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function AdminProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const key = `${ADMIN_PIN_SESSION_KEY}_${slug}`
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(!!sessionStorage.getItem(key))
  }, [key])

  const setAdminPin = useCallback((pinHash: string) => {
    sessionStorage.setItem(key, pinHash)
    setIsAdmin(true)
  }, [key])

  const clearAdmin = useCallback(() => {
    sessionStorage.removeItem(key)
    setIsAdmin(false)
  }, [key])

  const getStoredPinHash = useCallback(() => sessionStorage.getItem(key), [key])

  return (
    <AdminContext.Provider value={{ isAdmin, setAdminPin, clearAdmin, getStoredPinHash }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdminContext must be used within AdminProvider')
  return ctx
}
