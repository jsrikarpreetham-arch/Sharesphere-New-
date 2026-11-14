import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api",
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
})

export async function getResource<T>(path: string): Promise<T> {
  const { data } = await api.get<T>(path)
  return data
}

export async function createResource<T>(path: string, payload: unknown): Promise<T> {
  const { data } = await api.post<T>(path, payload)
  return data
}

export async function updateResource<T>(path: string, payload: unknown): Promise<T> {
  const { data } = await api.patch<T>(path, payload)
  return data
}

export async function deleteResource(path: string): Promise<void> {
  await api.delete(path)
}
