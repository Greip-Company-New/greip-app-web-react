export const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL ?? 'https://apidev.greip.com.pe',
  channel: import.meta.env.VITE_CHANNEL ?? 'AppWeb',
  apiKeys: {
    security: import.meta.env.VITE_AK_SECURITY ?? '',
    catalogs: import.meta.env.VITE_AK_CATALOGS ?? '',
    cross: import.meta.env.VITE_AK_CROSS ?? '',
    thyrd: import.meta.env.VITE_AK_THYRD ?? '',
  },
} as const

export type ServiceKey = keyof typeof config.apiKeys
