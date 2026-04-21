import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, clearAuth, getStoredUser, getToken, setAuth } from './api'
import type { AuthResponse, User, UserRole } from './types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name: string; phone?: string; role?: UserRole }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser())
  const [loading, setLoading] = useState<boolean>(!!getToken() && !getStoredUser())

  useEffect(() => {
    const token = getToken()
    if (token && !user) {
      api
        .me()
        .then((u) => setUser(u))
        .catch(() => {
          clearAuth()
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleAuth = (resp: AuthResponse) => {
    setAuth(resp)
    setUser(resp.user)
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      login: async (email, password) => handleAuth(await api.login({ email, password })),
      register: async (data) => handleAuth(await api.register(data)),
      logout: () => {
        clearAuth()
        setUser(null)
      },
      refreshUser: async () => {
        const u = await api.me()
        setUser(u)
        localStorage.setItem('ibeauty_user', JSON.stringify(u))
      },
    }),
    [user, loading],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider')
  return ctx
}
