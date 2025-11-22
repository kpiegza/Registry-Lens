import { computed, reactive } from 'vue'
import { registryApi } from '../services/registryApi'
import imageCache from '../services/imageCache'

// Reactive state
const state = reactive({
  isInitializing: true,  // True until first reconnect attempt completes
  isConnected: false,
  isLoading: false,
  error: null,
  repositories: [],
  selectedRepo: null,
  tags: {},           // { repoName: [tags] }
  manifests: {},      // { 'repo:tag': manifest }
  imageInfos: {},     // { 'repo:tag': imageInfo with metadata }
  filter: '',
  storageInfo: null,  // Info about how credentials are stored
  registryUrl: null   // Current registry URL for reactive access
})

export function useRegistry() {
  // Computed
  const credentials = computed(() => registryApi.getCredentials())

  const filteredRepositories = computed(() => {
    if (!state.filter) return state.repositories
    const filterLower = state.filter.toLowerCase()
    return state.repositories.filter(repo =>
      repo.toLowerCase().includes(filterLower)
    )
  })

  // Actions
  async function connect(registryUrl, username, password) {
    state.isLoading = true
    state.error = null

    try {
      const saveResult = await registryApi.saveCredentials(registryUrl, username, password)
      state.storageInfo = registryApi.getStorageInfo()

      const result = await registryApi.testConnection()

      if (result.success) {
        state.isConnected = true
        state.registryUrl = registryUrl
        await loadRepositories()
        return { success: true, storageMethod: saveResult.method }
      } else {
        state.error = result.error
        state.registryUrl = null
        await registryApi.clearCredentials()
        return { success: false, error: result.error }
      }
    } catch (err) {
      state.error = err.message
      state.registryUrl = null
      await registryApi.clearCredentials()
      return { success: false, error: err.message }
    } finally {
      state.isLoading = false
    }
  }

  async function reconnect() {
    try {
      // First try to load credentials from storage
      await registryApi.initCredentials()

      if (!registryApi.isAuthenticated()) return false

      state.isLoading = true
      state.error = null
      state.storageInfo = registryApi.getStorageInfo()

      try {
        const result = await registryApi.testConnection()
        if (result.success) {
          state.isConnected = true
          // Get registryUrl from loaded credentials
          const creds = registryApi.getCredentials()
          state.registryUrl = creds?.registryUrl || null
          await loadRepositories()
          return true
        }
      } catch {
        // Ignore, will return false
      } finally {
        state.isLoading = false
      }
      return false
    } finally {
      // Always mark initialization as complete
      state.isInitializing = false
    }
  }

  async function disconnect() {
    await registryApi.clearCredentials()
    state.isConnected = false
    state.repositories = []
    state.tags = {}
    state.manifests = {}
    state.imageInfos = {}
    state.selectedRepo = null
    state.filter = ''
    state.storageInfo = null
    state.registryUrl = null
  }

  async function loadRepositories() {
    state.isLoading = true
    state.error = null

    try {
      // Try to get from cache first
      const cached = imageCache.getRepositories()
      if (cached) {
        state.repositories = cached
        return
      }

      // Fetch from API and cache
      state.repositories = await registryApi.getAllRepositories()
      imageCache.saveRepositories(state.repositories)
    } catch (err) {
      state.error = err.message
    } finally {
      state.isLoading = false
    }
  }

  async function loadTags(repository) {
    if (state.tags[repository]) return state.tags[repository]

    try {
      // Try to get from cache first
      const cached = imageCache.getTags(repository)
      if (cached) {
        state.tags[repository] = cached
        return cached
      }

      // Fetch from API and cache
      const result = await registryApi.getTags(repository)
      state.tags[repository] = result.tags || []
      imageCache.saveTags(repository, state.tags[repository])
      return state.tags[repository]
    } catch (err) {
      console.error(`Failed to load tags for ${repository}:`, err)
      state.tags[repository] = []
      return []
    }
  }

  // Lazy load manifest only when requested
  async function loadManifest(repository, tag) {
    const key = `${repository}:${tag}`
    if (state.manifests[key]) return state.manifests[key]

    try {
      const manifest = await registryApi.getManifest(repository, tag)
      state.manifests[key] = manifest
      return manifest
    } catch (err) {
      console.error(`Failed to load manifest for ${key}:`, err)
      return null
    }
  }

  // Load full image info with metadata (creation date, size, etc.)
  async function loadImageInfo(repository, tag) {
    const key = `${repository}:${tag}`
    if (state.imageInfos[key]) return state.imageInfos[key]

    try {
      // Try to get from cache first
      const cached = imageCache.getImageInfo(repository, tag)
      if (cached) {
        state.imageInfos[key] = cached
        state.manifests[key] = cached.manifest
        return cached
      }

      // Fetch from API and cache
      const imageInfo = await registryApi.getImageInfo(repository, tag)
      state.imageInfos[key] = imageInfo
      state.manifests[key] = imageInfo.manifest
      imageCache.saveImageInfo(repository, tag, imageInfo)
      return imageInfo
    } catch (err) {
      console.error(`Failed to load image info for ${key}:`, err)
      return null
    }
  }

  function setFilter(filter) {
    state.filter = filter
  }

  function selectRepo(repo) {
    state.selectedRepo = repo
  }

  function getStorageInfo() {
    return registryApi.getStorageInfo()
  }

  function clearCache() {
    imageCache.clearAll()
  }

  function getCacheStats() {
    return imageCache.getStats()
  }

  function clearImageCache(repository, tag) {
    imageCache.clearImageInfo(repository, tag)
    const key = `${repository}:${tag}`
    delete state.imageInfos[key]
    delete state.manifests[key]
  }

  return {
    // State (readonly refs for reactivity)
    isInitializing: computed(() => state.isInitializing),
    isConnected: computed(() => state.isConnected),
    isLoading: computed(() => state.isLoading),
    error: computed(() => state.error),
    repositories: computed(() => state.repositories),
    filteredRepositories,
    selectedRepo: computed(() => state.selectedRepo),
    tags: computed(() => state.tags),
    manifests: computed(() => state.manifests),
    imageInfos: computed(() => state.imageInfos),
    filter: computed(() => state.filter),
    credentials,
    storageInfo: computed(() => state.storageInfo),
    registryUrl: computed(() => state.registryUrl),

    // Actions
    connect,
    reconnect,
    disconnect,
    loadRepositories,
    loadTags,
    loadManifest,
    loadImageInfo,
    setFilter,
    selectRepo,
    getStorageInfo,
    clearCache,
    getCacheStats,
    clearImageCache
  }
}
