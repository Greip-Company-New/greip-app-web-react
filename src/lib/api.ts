import axios, { AxiosError } from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { config } from './config'
import { useAuthStore } from '@/stores/auth'
import type { ServiceKey } from './config'
import type { ApiEnvelope, TokenResponse } from './types'

export const API_SERVICES: Record<ServiceKey, string> = {
  security: '/srv-security',
  catalogs: '/srv-catalogs',
  cross: '/srv-cross',
  thyrd: '/srv-third-party',
}

const http = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
})

type EnvelopeResponse<T> = { payload: ApiEnvelope<T> }

function unwrap<T>(body: EnvelopeResponse<T> | undefined): T | undefined {
  const payload = body?.payload
  if (!payload) return undefined
  const pagination = payload.metadata?.pagination
  if (pagination) {
    return { data: payload.data, pagination } as T
  }
  return payload.data
}

http.interceptors.request.use(async (req) => {
  const state = useAuthStore.getState()
  if (state.accessToken && state.expiresAt) {
    const msLeft = state.expiresAt - Date.now()
    if (msLeft < 120_000 && state.refreshToken) {
      try {
        await refreshTokenOnce()
      } catch {
        // fallback: send with current token, let response interceptor handle 401
      }
    }
    req.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`
  }
  req.headers.channel = config.channel
  return req
})

let refreshPromise: Promise<TokenResponse> | null = null

const refreshHttp = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 30000,
})

async function refreshTokens(): Promise<TokenResponse> {
  const refreshToken = useAuthStore.getState().refreshToken
  if (!refreshToken) {
    throw new Error('Sin token de refresco')
  }
  const { data } = await refreshHttp.post<EnvelopeResponse<TokenResponse>>(
    `${API_SERVICES.security}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        'x-api-key': config.apiKeys.security,
        channel: config.channel,
      },
    },
  )
  const tokens = unwrap(data)
  if (!tokens?.accessToken) {
    throw new Error('Respuesta de refresco inválida')
  }
  useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresAt)
  return tokens
}

function refreshTokenOnce(): Promise<TokenResponse> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<EnvelopeResponse<unknown>>) => {
    const configReq = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined
    const envelope = error.response?.data?.payload

    if (envelope) {
      if (envelope.statusCode === 401 && !configReq?._retried) {
        const store = useAuthStore.getState()
        if (store.accessToken && store.refreshToken) {
          try {
            const tokens = await refreshTokenOnce()
            if (configReq) {
              configReq.headers = {
                ...configReq.headers,
                Authorization: `Bearer ${tokens.accessToken}`,
              }
              configReq._retried = true
            }
            return http(configReq as AxiosRequestConfig)
          } catch {
            triggerSessionExpired()
          }
        } else {
          triggerSessionExpired()
        }
      } else if (envelope.statusCode === 401) {
        triggerSessionExpired()
      }
      return Promise.reject(new ApiError(envelope))
    }
    const reason = error.code === 'ECONNABORTED' ? 'La solicitud tardó demasiado' : 'No se pudo conectar con el servidor'
    return Promise.reject(new ApiError({ success: false, message: reason, statusCode: 0, timestamp: '' }))
  },
)

let sessionExpiredNotified = false

function triggerSessionExpired() {
  const { accessToken, setSessionExpired } = useAuthStore.getState()
  if (!accessToken || sessionExpiredNotified) return
  sessionExpiredNotified = true
  setSessionExpired(true)
}

export function resetSessionExpiredNotified() {
  sessionExpiredNotified = false
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

function scheduleProactiveRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  const { expiresAt, refreshToken, accessToken } = useAuthStore.getState()
  if (!expiresAt || !refreshToken || !accessToken) return
  const now = Date.now()
  const msLeft = expiresAt - now
  const refreshIn = Math.max(0, msLeft - 60_000)
  refreshTimer = setTimeout(() => {
    refreshTokenOnce()
      .catch(() => {
        triggerSessionExpired()
      })
      .finally(() => {
        scheduleProactiveRefresh()
      })
  }, refreshIn)
}

export function ensureAutoRefresh() {
  scheduleProactiveRefresh()
}

export class ApiError extends Error {
  statusCode: number
  requestId?: string
  code?: string
  details?: unknown

  constructor(payload: ApiEnvelope) {
    super(payload.message || 'Error desconocido en el servicio')
    this.name = 'ApiError'
    this.statusCode = payload.statusCode
    this.requestId = payload.requestId
    this.code = payload.error?.code
    this.details = payload.error?.details
  }
}

export async function apiGet<T>(service: ServiceKey, path: string): Promise<T> {
  const { data } = await http.get<EnvelopeResponse<T>>(`${API_SERVICES[service]}${path}`, {
    headers: { 'x-api-key': config.apiKeys[service] },
  })
  return unwrap(data) as T
}

export async function apiPost<T>(
  service: ServiceKey,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await http.post<EnvelopeResponse<T>>(`${API_SERVICES[service]}${path}`, body, {
    headers: { 'x-api-key': config.apiKeys[service] },
  })
  return unwrap(data) as T
}

export async function apiPut<T>(
  service: ServiceKey,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await http.put<EnvelopeResponse<T>>(`${API_SERVICES[service]}${path}`, body, {
    headers: { 'x-api-key': config.apiKeys[service] },
  })
  return unwrap(data) as T
}

export async function apiDelete<T>(service: ServiceKey, path: string): Promise<T> {
  const { data } = await http.delete<EnvelopeResponse<T>>(`${API_SERVICES[service]}${path}`, {
    headers: { 'x-api-key': config.apiKeys[service] },
  })
  return unwrap(data) as T
}

export default http
