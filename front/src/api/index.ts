import { useMainStore } from '@/stores'
import type { Link, LoginCredentials, ApiResponse } from './types'

const apiBase = import.meta.env.VITE_API_BASE

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; headers: Headers }> => {
  const store = useMainStore()
  const token = store.token

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: token } : {}),
    ...options.headers
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers
  })

  // 如果返回 401，清除 token
  if (response.status === 401) {
    store.logout()
    throw new ApiError(401, 'Unauthorized')
  }

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }

  const responseHeaders = response.headers
  let data: T
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json()
  } else {
    data = {} as T
  }

  return { data, headers: responseHeaders }
}

export const api = {
  async login(credentials: { username: string; password: string }): Promise<string> {
    const { headers } = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })

    // 从响应头获取 token
    const token = headers.get('Authorization')
    if (!token) {
      throw new Error('No token received')
    }

    return token
  },

  async getNavigation(): Promise<ApiResponse<Link[]>> {
    const { data } = await apiFetch('/navigation')
    return data.links
  },

  async addLink(link: Link): Promise<ApiResponse<void>> {
    return apiFetch('/navigation/add', {
      method: 'POST',
      body: JSON.stringify(link)
    })
  },

  async updateLink(index: number, link: Link): Promise<ApiResponse<void>> {
    return apiFetch(`/navigation/update/${index}`, {
      method: 'PUT',
      body: JSON.stringify(link)
    })
  },

  async deleteLink(index: number): Promise<ApiResponse<void>> {
    return apiFetch(`/navigation/delete/${index}`, {
      method: 'DELETE'
    })
  },

  async getWebsiteIcon(url: string): Promise<ApiResponse<string>> {
    const { data } = await apiFetch(`/get-icon?url=${encodeURIComponent(url)}`)
    return data.iconUrl
  }
}
