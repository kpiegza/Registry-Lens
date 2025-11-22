/**
 * Secure Credential Storage Service
 *
 * Uses browser's Credential Management API when available (most secure),
 * falls back to sessionStorage (clears on browser close).
 *
 * Security considerations:
 * - Credential Management API: Browser-managed, can integrate with password managers
 * - sessionStorage: Only persists for the session, cleared when browser closes
 * - Never stores passwords in localStorage (vulnerable to XSS)
 */

const STORAGE_KEY = 'registry-credentials'
const CREDENTIAL_ID = 'docker-registry-ui'

class CredentialStore {
  constructor() {
    this.memoryCredentials = null
    this.supportsCredentialAPI = 'credentials' in navigator && 'PasswordCredential' in window
  }

  /**
   * Save credentials securely
   * Priority: Credential Management API > sessionStorage > memory
   */
  async save(registryUrl, username, password) {
    const credentials = { registryUrl, username, password }

    // Always keep in memory for current session
    this.memoryCredentials = credentials

    // Try Credential Management API first (most secure)
    if (this.supportsCredentialAPI && username && password) {
      try {
        const cred = new PasswordCredential({
          id: username,
          password: password,
          name: `Docker Registry: ${registryUrl}`,
          iconURL: '/favicon.ico'
        })
        await navigator.credentials.store(cred)

        // Store only registry URL in sessionStorage (non-sensitive)
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          registryUrl,
          useCredentialAPI: true
        }))

        return { method: 'credential-api' }
      } catch (e) {
        console.warn('Credential Management API failed, falling back to sessionStorage:', e)
      }
    }

    // Fallback: sessionStorage (clears when browser closes)
    // For registries without auth, or when Credential API fails
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      registryUrl,
      username: username || null,
      // Only store password in session if no Credential API
      password: password || null,
      useCredentialAPI: false
    }))

    return { method: 'session-storage' }
  }

  /**
   * Load saved credentials
   */
  async load() {
    // First check memory
    if (this.memoryCredentials) {
      return this.memoryCredentials
    }

    // Check sessionStorage
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data = JSON.parse(stored)

      // If we used Credential API, try to retrieve
      if (data.useCredentialAPI && this.supportsCredentialAPI) {
        try {
          const cred = await navigator.credentials.get({
            password: true,
            mediation: 'optional'
          })

          if (cred && cred.type === 'password') {
            this.memoryCredentials = {
              registryUrl: data.registryUrl,
              username: cred.id,
              password: cred.password
            }
            return this.memoryCredentials
          }
        } catch (e) {
          console.warn('Failed to retrieve credentials from Credential API:', e)
        }
      }

      // Use sessionStorage data
      if (data.registryUrl) {
        this.memoryCredentials = {
          registryUrl: data.registryUrl,
          username: data.username || '',
          password: data.password || ''
        }
        return this.memoryCredentials
      }
    } catch (e) {
      console.error('Failed to load credentials:', e)
    }

    return null
  }

  /**
   * Clear all stored credentials
   */
  async clear() {
    this.memoryCredentials = null
    sessionStorage.removeItem(STORAGE_KEY)

    // Prevent automatic sign-in
    if (this.supportsCredentialAPI) {
      try {
        await navigator.credentials.preventSilentAccess()
      } catch (e) {
        // Ignore errors
      }
    }
  }

  /**
   * Get current credentials from memory (sync)
   */
  getSync() {
    return this.memoryCredentials
  }

  /**
   * Check if we have any stored credentials
   */
  hasCredentials() {
    return this.memoryCredentials !== null || sessionStorage.getItem(STORAGE_KEY) !== null
  }

  /**
   * Get storage method info for UI
   */
  getStorageInfo() {
    if (this.supportsCredentialAPI) {
      return {
        method: 'Credential Management API',
        description: 'Credentials are securely managed by your browser and can integrate with password managers.',
        secure: true
      }
    }
    return {
      method: 'Session Storage',
      description: 'Credentials are stored only for this browser session and will be cleared when you close the browser.',
      secure: true
    }
  }
}

export const credentialStore = new CredentialStore()
export default credentialStore
