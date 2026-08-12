import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api'
import type { PaginatedList, Product } from '@/lib/types'

export interface ProductPayload {
  name: string
  description?: string
  price: number
  currency: 'PEN' | 'USD'
  status?: 'A' | 'I'
  createdBy?: string
}

export async function listProducts(params?: {
  status?: string
  name?: string
}): Promise<PaginatedList<Product>> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.name) q.set('name', params.name)
  return apiGet('catalogs', `/product${q.toString() ? `?${q}` : ''}`)
}

export async function getProduct(productId: number): Promise<Product> {
  return apiGet('catalogs', `/product/${productId}`)
}

export async function createProduct(body: ProductPayload): Promise<Product> {
  return apiPost('catalogs', '/product', body)
}

export async function updateProduct(
  productId: number,
  body: ProductPayload,
): Promise<Product> {
  return apiPut('catalogs', `/product/${productId}`, body)
}

export async function deleteProduct(productId: number): Promise<unknown> {
  return apiDelete('catalogs', `/product/${productId}`)
}
