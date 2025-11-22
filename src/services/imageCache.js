/**
 * Image Cache Service
 * Stores image info, tags, and repository data in localStorage
 * to reduce API calls and improve performance
 */

const CACHE_PREFIX = 'registry_lens_cache:'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
const CACHE_KEYS = {
  IMAGE_INFO: 'image_info',      // repo:tag -> image info
  TAGS: 'tags',                  // repository -> tags array
  REPOSITORIES: 'repositories',  // full repositories list
  CACHE_META: 'meta'             // metadata about cache
}

class ImageCache {
  /**
   * Get full cache key with prefix
   */
  static getKey(type, identifier) {
    return `${CACHE_PREFIX}${type}:${identifier}`
  }

  /**
   * Save image info to cache
   */
  static saveImageInfo(repository, tag, imageInfo) {
    try {
      const key = this.getKey(CACHE_KEYS.IMAGE_INFO, `${repository}:${tag}`)
      const data = {
        value: imageInfo,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save image info to cache:', e)
    }
  }

  /**
   * Get image info from cache
   */
  static getImageInfo(repository, tag) {
    try {
      const key = this.getKey(CACHE_KEYS.IMAGE_INFO, `${repository}:${tag}`)
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const data = JSON.parse(cached)
      // Check if cache is still valid (TTL)
      if (Date.now() - data.timestamp > CACHE_TTL) {
        this.clearImageInfo(repository, tag)
        return null
      }

      return data.value
    } catch (e) {
      console.warn('Failed to get image info from cache:', e)
      return null
    }
  }

  /**
   * Save tags for a repository
   */
  static saveTags(repository, tags) {
    try {
      const key = this.getKey(CACHE_KEYS.TAGS, repository)
      const data = {
        value: tags,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save tags to cache:', e)
    }
  }

  /**
   * Get tags for a repository
   */
  static getTags(repository) {
    try {
      const key = this.getKey(CACHE_KEYS.TAGS, repository)
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const data = JSON.parse(cached)
      // Check if cache is still valid
      if (Date.now() - data.timestamp > CACHE_TTL) {
        this.clearTags(repository)
        return null
      }

      return data.value
    } catch (e) {
      console.warn('Failed to get tags from cache:', e)
      return null
    }
  }

  /**
   * Save repositories list
   */
  static saveRepositories(repositories) {
    try {
      const key = this.getKey(CACHE_KEYS.REPOSITORIES, 'list')
      const data = {
        value: repositories,
        timestamp: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.warn('Failed to save repositories to cache:', e)
    }
  }

  /**
   * Get repositories list
   */
  static getRepositories() {
    try {
      const key = this.getKey(CACHE_KEYS.REPOSITORIES, 'list')
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const data = JSON.parse(cached)
      // Check if cache is still valid
      if (Date.now() - data.timestamp > CACHE_TTL) {
        this.clearRepositories()
        return null
      }

      return data.value
    } catch (e) {
      console.warn('Failed to get repositories from cache:', e)
      return null
    }
  }

  /**
   * Clear specific image info
   */
  static clearImageInfo(repository, tag) {
    try {
      const key = this.getKey(CACHE_KEYS.IMAGE_INFO, `${repository}:${tag}`)
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Failed to clear image info from cache:', e)
    }
  }

  /**
   * Clear tags for a repository
   */
  static clearTags(repository) {
    try {
      const key = this.getKey(CACHE_KEYS.TAGS, repository)
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Failed to clear tags from cache:', e)
    }
  }

  /**
   * Clear repositories list
   */
  static clearRepositories() {
    try {
      const key = this.getKey(CACHE_KEYS.REPOSITORIES, 'list')
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('Failed to clear repositories from cache:', e)
    }
  }

  /**
   * Clear all cache
   */
  static clearAll() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.warn('Failed to clear all cache:', e)
    }
  }

  /**
   * Get cache size in bytes
   */
  static getCacheSize() {
    try {
      let size = 0
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          size += localStorage.getItem(key).length
        }
      })
      return size
    } catch (e) {
      console.warn('Failed to get cache size:', e)
      return 0
    }
  }

  /**
   * Get cache stats
   */
  static getStats() {
    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX))

      return {
        count: cacheKeys.length,
        size: this.getCacheSize(),
        sizeKB: (this.getCacheSize() / 1024).toFixed(2),
        keys: cacheKeys
      }
    } catch (e) {
      console.warn('Failed to get cache stats:', e)
      return { count: 0, size: 0, sizeKB: 0, keys: [] }
    }
  }
}

export default ImageCache
