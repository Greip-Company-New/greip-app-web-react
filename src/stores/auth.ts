import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/lib/types'

export type MfaState =
  | { phase: 'none' }
  | { phase: 'challenge'; mfaToken: string; challengeId?: string; channel?: string; maskedDestination?: string; activeChannels?: string[] }
  | { phase: 'authenticated' }

function decodeJwtPermissions(token: string): string[] {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Array.isArray(payload.permissions) ? payload.permissions : []
  } catch {
    return []
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number | null
  permissions: string[]
  mfa: MfaState
  sessionExpired: boolean
  hasPermission: (permission: string) => boolean
  setSession: (tokens: {
    accessToken: string
    refreshToken: string
    expiresAt: number
    user: User
  }) => void
  setMfa: (state: MfaState) => void
  setTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void
  setSessionExpired: (expired: boolean) => void
  logout: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      permissions: [],
      mfa: { phase: 'none' },
      sessionExpired: false,
      hasPermission: (permission: string) => {
        const perms = get().permissions
        if (perms.length === 0) return true
        return perms.includes(permission)
      },
      setSession: ({ accessToken, refreshToken, expiresAt, user }) =>
        set({
          accessToken,
          refreshToken,
          expiresAt,
          user,
          permissions: decodeJwtPermissions(accessToken),
          mfa: { phase: 'authenticated' },
          sessionExpired: false,
        }),
      setMfa: (mfa) => set({ mfa }),
      setTokens: (accessToken, refreshToken, expiresAt) =>
        set({
          accessToken,
          refreshToken,
          expiresAt,
          permissions: decodeJwtPermissions(accessToken),
        }),
      setSessionExpired: (sessionExpired) => set({ sessionExpired }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          permissions: [],
          mfa: { phase: 'none' },
          sessionExpired: false,
        }),
      updateUser: (user) => set({ user }),
    }),
    {
      name: 'greip-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        permissions: state.permissions,
        mfa: state.mfa,
        sessionExpired: state.sessionExpired,
      }),
    },
  ),
)

export function isAuthenticated(state: AuthState): boolean {
  return Boolean(state.accessToken && state.user)
}
