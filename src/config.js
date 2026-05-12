const raw = import.meta.env.VITE_REGISTRY_URL
const normalized = typeof raw === 'string' && raw.trim() ? raw.trim().replace(/\/+$/, '') : null

export const FIXED_REGISTRY_URL = normalized
export const HAS_FIXED_REGISTRY = normalized !== null
