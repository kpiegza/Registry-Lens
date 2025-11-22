/**
 * Docker Registry API Service
 * Handles communication with Docker Registry v2 API
 * Implements lazy loading and request throttling to avoid API overload
 */

import { credentialStore } from './credentialStore'

const REQUEST_DELAY = 100 // ms between requests to avoid throttling

// Check if running in development mode (with proxy)
const isDev = import.meta.env.DEV

class RegistryApi {
  constructor() {
    this.credentials = null
    this.requestQueue = []
    this.isProcessing = false
  }

  // Initialize credentials from secure storage
  async initCredentials() {
    this.credentials = await credentialStore.load()
    return this.credentials
  }

  // Save credentials securely
  async saveCredentials(registryUrl, username, password) {
    this.credentials = { registryUrl, username, password }
    const result = await credentialStore.save(registryUrl, username, password)
    return result
  }

  // Clear credentials
  async clearCredentials() {
    this.credentials = null
    await credentialStore.clear()
  }

  getCredentials() {
    return this.credentials || credentialStore.getSync()
  }

  isAuthenticated() {
    const creds = this.getCredentials()
    return creds?.registryUrl != null
  }

  // Get storage info for UI
  getStorageInfo() {
    return credentialStore.getStorageInfo()
  }

  // Build authorization header
  getAuthHeader() {
    const creds = this.getCredentials()
    if (creds?.username && creds?.password) {
      const encoded = btoa(`${creds.username}:${creds.password}`)
      return `Basic ${encoded}`
    }
    return null
  }

  // Throttled request processing to avoid API overload
  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return

    this.isProcessing = true

    while (this.requestQueue.length > 0) {
      const { resolve, reject, requestFn } = this.requestQueue.shift()
      try {
        const result = await requestFn()
        resolve(result)
      } catch (error) {
        reject(error)
      }

      if (this.requestQueue.length > 0) {
        await new Promise(r => setTimeout(r, REQUEST_DELAY))
      }
    }

    this.isProcessing = false
  }

  // Add request to throttled queue
  enqueueRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, requestFn })
      this.processQueue()
    })
  }

  // Build the full URL for API requests
  getApiUrl(endpoint) {
    const creds = this.getCredentials()
    if (!creds?.registryUrl) {
      throw new Error('Registry URL not configured')
    }

    if (isDev) {
      // In development, use the Vite proxy
      return `/registry-api${endpoint}`
    } else {
      // In production (GitHub Pages), call registry directly
      // Registry must have CORS headers configured!
      const baseUrl = creds.registryUrl.replace(/\/$/, '')
      return `${baseUrl}/v2${endpoint}`
    }
  }

  // Make API request
  async request(endpoint, options = {}) {
    const creds = this.getCredentials()
    if (!creds?.registryUrl) {
      throw new Error('Registry URL not configured')
    }

    const headers = {
      'Accept': 'application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/json',
      ...options.headers
    }

    // Add registry URL header for dev proxy
    if (isDev) {
      headers['X-Registry-URL'] = creds.registryUrl
    }

    const authHeader = this.getAuthHeader()
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const url = this.getApiUrl(endpoint)

    const response = await fetch(url, {
      ...options,
      headers,
      // For production, we need CORS mode
      mode: isDev ? 'same-origin' : 'cors'
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Check your credentials.')
      }
      if (response.status === 404) {
        throw new Error('Resource not found')
      }
      throw new Error(`Registry API error: ${response.status} ${response.statusText}`)
    }

    // Handle response based on content type
    const contentType = response.headers.get('content-type') || ''

    // Check for JSON-like content types (including OCI types)
    const isJsonType = contentType.includes('application/json') ||
                       contentType.includes('application/vnd.docker') ||
                       contentType.includes('application/vnd.oci')

    if (isJsonType) {
      return response.json()
    }

    // For other types (like octet-stream), try to parse as JSON, fallback to text
    const text = await response.text()
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  // Test connection to registry
  async testConnection() {
    try {
      await this.request('/')
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Get list of repositories (catalog)
  async getCatalog(n = 100, last = '') {
    let endpoint = `/_catalog?n=${n}`
    if (last) {
      endpoint += `&last=${encodeURIComponent(last)}`
    }
    return this.request(endpoint)
  }

  // Get all repositories with pagination
  async getAllRepositories() {
    const repositories = []
    let last = ''
    const pageSize = 100

    do {
      const result = await this.enqueueRequest(() =>
        this.getCatalog(pageSize, last)
      )

      if (result.repositories?.length) {
        repositories.push(...result.repositories)
        last = result.repositories.length === pageSize
          ? result.repositories[result.repositories.length - 1]
          : ''
      } else {
        last = ''
      }
    } while (last)

    return repositories
  }

  // Get tags for a repository
  async getTags(repository) {
    return this.enqueueRequest(() =>
      this.request(`/${encodeURIComponent(repository)}/tags/list`)
    )
  }

  // Get manifest for a specific tag (lazy loaded)
  async getManifest(repository, tag) {
    return this.enqueueRequest(() =>
      this.request(`/${encodeURIComponent(repository)}/manifests/${encodeURIComponent(tag)}`)
    )
  }

  // Get blob (layer) info - HEAD request
  async getBlobHead(repository, digest) {
    return this.enqueueRequest(() =>
      this.request(`/${encodeURIComponent(repository)}/blobs/${digest}`, {
        method: 'HEAD'
      })
    )
  }

  // Get blob content (for config blob with image metadata)
  async getBlob(repository, digest) {
    return this.enqueueRequest(() =>
      this.request(`/${encodeURIComponent(repository)}/blobs/${digest}`)
    )
  }

  // Check if manifest is a manifest list (multi-platform)
  isManifestList(manifest) {
    const listMediaTypes = [
      'application/vnd.docker.distribution.manifest.list.v2+json',
      'application/vnd.oci.image.index.v1+json'
    ]
    return listMediaTypes.includes(manifest.mediaType) ||
           (manifest.manifests && !manifest.layers)
  }

  // Get full image info including config (for creation date, etc.)
  async getImageInfo(repository, tag) {
    const manifest = await this.getManifest(repository, tag)

    // Handle manifest list (multi-platform images)
    if (this.isManifestList(manifest)) {
      // Extract platforms from manifest list
      const platforms = manifest.manifests
        ?.filter(m => m.platform)
        .map(m => ({
          os: m.platform.os,
          architecture: m.platform.architecture,
          variant: m.platform.variant || null,
          digest: m.digest,
          size: m.size
        })) || []

      // Calculate total size from all platform manifests
      const totalSize = manifest.manifests?.reduce((sum, m) => sum + (m.size || 0), 0) || 0

      // Try to fetch details from the first platform manifest for metadata
      let config = null
      let firstManifestInfo = null
      if (platforms.length > 0) {
        try {
          // Fetch the first platform's manifest for config
          const firstDigest = platforms[0].digest
          const platformManifest = await this.enqueueRequest(() =>
            this.request(`/${encodeURIComponent(repository)}/manifests/${firstDigest}`, {
              headers: {
                'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
              }
            })
          )

          if (platformManifest.config?.digest) {
            config = await this.getBlob(repository, platformManifest.config.digest)
          }
          firstManifestInfo = platformManifest
        } catch (e) {
          console.warn('Could not fetch first platform manifest:', e)
        }
      }

      return {
        manifest,
        config,
        totalSize,
        platforms,
        isMultiPlatform: true,
        created: config?.created || null,
        architecture: platforms[0]?.architecture || config?.architecture || null,
        os: platforms[0]?.os || config?.os || null,
        author: config?.author || null,
        dockerVersion: config?.docker_version || null,
        firstManifest: firstManifestInfo
      }
    }

    // Single platform manifest
    let totalSize = 0
    if (manifest.layers) {
      totalSize = manifest.layers.reduce((sum, layer) => sum + (layer.size || 0), 0)
    }
    if (manifest.config?.size) {
      totalSize += manifest.config.size
    }

    // Fetch config blob to get creation date and other metadata
    let config = null
    if (manifest.config?.digest) {
      try {
        config = await this.getBlob(repository, manifest.config.digest)
      } catch (e) {
        console.warn('Could not fetch config blob:', e)
      }
    }

    // Extract platform from config - handle different config structures
    let platforms = []
    if (config) {
      // Check if config has a nested platform object (some registries)
      const platformData = config.platform || config
      platforms = [{
        os: platformData.os || config.os,
        architecture: platformData.architecture || config.architecture,
        variant: platformData.variant || config.variant || platformData['os.version'] || null
      }]
    }

    return {
      manifest,
      config,
      totalSize,
      platforms,
      isMultiPlatform: false,
      created: config?.created || null,
      architecture: config?.architecture || null,
      os: config?.os || null,
      author: config?.author || null,
      dockerVersion: config?.docker_version || null
    }
  }

  // Delete a manifest (tag)
  async deleteManifest(repository, digest) {
    return this.request(`/${encodeURIComponent(repository)}/manifests/${digest}`, {
      method: 'DELETE'
    })
  }
}

// Singleton instance
export const registryApi = new RegistryApi()
export default registryApi
