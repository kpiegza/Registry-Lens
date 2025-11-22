<template>
  <div class="image-details">
    <!-- Tags Section -->
    <div class="section">
      <div class="section-header">
        <h3>
          <i class="pi pi-tags"></i>
          Tags
          <span class="tag-count">({{ tags.length }})</span>
        </h3>
      </div>

      <!-- Tag filter -->
      <div class="tag-filter" v-if="tags.length > 5">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="tagFilter"
            placeholder="Filter tags..."
            size="small"
          />
        </IconField>
      </div>

      <!-- Loading tags -->
      <div v-if="loadingTags" class="loading-inline">
        <ProgressSpinner style="width: 20px; height: 20px" />
        <span>Loading tags...</span>
      </div>

      <!-- Tags list -->
      <div v-else-if="filteredTags.length" class="tags-container">
        <div
          v-for="tag in filteredTags"
          :key="tag"
          class="tag-item"
          :class="{ selected: selectedTag === tag, loading: selectedTag === tag && loadingInfo }"
          @click="selectTag(tag)"
        >
          <Tag :value="tag" :severity="tag === 'latest' ? 'success' : 'secondary'" />
          <ProgressSpinner
            v-if="selectedTag === tag && loadingInfo"
            style="width: 16px; height: 16px"
          />
          <i v-else-if="failedTags.has(tag)" class="pi pi-exclamation-circle tag-error" v-tooltip="'Failed to load'"></i>
          <i v-else-if="selectedTag === tag && imageInfo" class="pi pi-check-circle tag-loaded"></i>
        </div>
      </div>

      <div v-else class="empty-state">
        <i class="pi pi-inbox"></i>
        <p v-if="tagFilter">No tags match "{{ tagFilter }}"</p>
        <p v-else>No tags found</p>
      </div>
    </div>

    <!-- Image Info Section -->
    <div class="section" v-if="selectedTag">
      <!-- Loading state -->
      <div v-if="loadingInfo" class="loading-section">
        <ProgressSpinner style="width: 40px; height: 40px" />
        <span>Loading image details...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="loadError" class="error-section">
        <Message severity="error" :closable="false" class="error-message">
          <template #icon>
            <i class="pi pi-times-circle"></i>
          </template>
          <div class="error-content">
            <strong>Failed to load image details</strong>
            <p>{{ loadError }}</p>
            <div class="error-actions">
              <Button
                label="Retry"
                icon="pi pi-refresh"
                size="small"
                @click="retryLoadInfo"
              />
            </div>
          </div>
        </Message>
      </div>

      <!-- Image info loaded -->
      <div v-else-if="imageInfo" class="image-info">
        <!-- Key Metrics Row -->
        <div class="metrics-row">
          <div class="metric">
            <i class="pi pi-database"></i>
            <div class="metric-content">
              <span class="metric-value">{{ formatSize(imageInfo.totalSize) }}</span>
              <span class="metric-label">Total Size</span>
            </div>
          </div>

          <div class="metric" v-if="imageInfo.manifest.layers">
            <i class="pi pi-bars"></i>
            <div class="metric-content">
              <span class="metric-value">{{ imageInfo.manifest.layers.length }}</span>
              <span class="metric-label">Layers</span>
            </div>
          </div>

          <div class="metric" v-if="getValidPlatforms(imageInfo.platforms).length">
            <i class="pi pi-microchip"></i>
            <div class="metric-content">
              <span class="metric-value">{{ getValidPlatforms(imageInfo.platforms).length }}</span>
              <span class="metric-label">{{ getValidPlatforms(imageInfo.platforms).length > 1 ? 'Platforms' : 'Platform' }}</span>
            </div>
          </div>

          <div class="metric" v-if="imageInfo.created">
            <i class="pi pi-calendar"></i>
            <div class="metric-content">
              <span class="metric-value">{{ formatRelativeTime(imageInfo.created) }}</span>
              <span class="metric-label">{{ formatDate(imageInfo.created) }}</span>
            </div>
          </div>
        </div>

        <!-- Platforms Section -->
        <div v-if="getValidPlatforms(imageInfo.platforms).length" class="platforms-section">
          <div class="platforms-header">
            <i class="pi pi-microchip"></i>
            <span>Available Platforms</span>
            <Tag v-if="imageInfo.isMultiPlatform" value="Multi-arch" severity="info" class="multi-arch-badge" />
          </div>
          <div class="platforms-list">
            <div
              v-for="platform in getValidPlatforms(imageInfo.platforms)"
              :key="platform.digest || `${platform.os}-${platform.architecture}`"
              class="platform-chip"
            >
              <span class="platform-name">{{ formatPlatform(platform) }}</span>
              <span v-if="platform.size" class="platform-size">{{ formatSize(platform.size) }}</span>
            </div>
          </div>
        </div>

        <!-- Details Panel -->
        <Panel header="Manifest Details" toggleable :collapsed="false" class="details-panel">
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Schema Version</span>
              <span class="detail-value">{{ imageInfo.manifest.schemaVersion }}</span>
            </div>

            <div class="detail-item" v-if="imageInfo.manifest.mediaType">
              <span class="detail-label">Media Type</span>
              <span class="detail-value">{{ formatMediaType(imageInfo.manifest.mediaType) }}</span>
            </div>

            <div class="detail-item" v-if="imageInfo.dockerVersion">
              <span class="detail-label">Docker Version</span>
              <span class="detail-value">{{ imageInfo.dockerVersion }}</span>
            </div>

            <div class="detail-item full-width" v-if="imageInfo.manifest.config">
              <span class="detail-label">Config Digest</span>
              <code class="detail-value digest">{{ imageInfo.manifest.config.digest }}</code>
            </div>
          </div>
        </Panel>

        <!-- Layers Panel -->
        <Panel
          v-if="imageInfo.manifest.layers"
          header="Image Layers"
          toggleable
          :collapsed="false"
          class="layers-panel"
        >
          <div class="layers-list">
            <div
              v-for="(layer, index) in imageInfo.manifest.layers"
              :key="layer.digest"
              class="layer-item"
            >
              <div class="layer-index">{{ index + 1 }}</div>
              <div class="layer-info">
                <div class="layer-size">{{ formatSize(layer.size) }}</div>
                <div class="layer-type">{{ formatLayerType(layer.mediaType) }}</div>
              </div>
              <div class="layer-digest">
                <code>{{ shortenDigest(layer.digest) }}</code>
                <Button
                  icon="pi pi-copy"
                  text
                  rounded
                  size="small"
                  @click="copyToClipboard(layer.digest)"
                  v-tooltip.left="'Copy digest'"
                  class="copy-btn"
                />
              </div>
              <div class="layer-bar">
                <div
                  class="layer-bar-fill"
                  :style="{ width: getLayerPercentage(layer.size) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </Panel>

        <!-- Raw Data Panel -->
        <Panel header="Raw Data" toggleable :collapsed="true" class="raw-panel">
          <TabView>
            <TabPanel header="Manifest">
              <pre class="raw-json">{{ JSON.stringify(imageInfo.manifest, null, 2) }}</pre>
            </TabPanel>
            <TabPanel header="Config" v-if="imageInfo.config">
              <pre class="raw-json">{{ JSON.stringify(imageInfo.config, null, 2) }}</pre>
            </TabPanel>
          </TabView>
        </Panel>
      </div>

      <!-- No data yet -->
      <div v-else class="no-data">
        <i class="pi pi-info-circle"></i>
        <p>Select a tag to view image details</p>
      </div>
    </div>

    <!-- Pull command -->
    <div class="section pull-section">
      <div class="pull-header">
        <i class="pi pi-download"></i>
        <span>Pull Command</span>
      </div>
      <div class="pull-command">
        <code>docker pull {{ pullCommand }}</code>
        <Button
          icon="pi pi-copy"
          text
          rounded
          @click="copyPullCommand"
          v-tooltip="'Copy to clipboard'"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Panel from 'primevue/panel'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { useRegistry } from '../composables/useRegistry'

const props = defineProps({
  repository: {
    type: String,
    required: true
  }
})

const { loadTags, loadImageInfo, tags: allTags, imageInfos, credentials } = useRegistry()

const loadingTags = ref(false)
const loadingInfo = ref(false)
const tagFilter = ref('')
const selectedTag = ref(null)
const loadError = ref(null)
const failedTags = ref(new Set()) // Track which tags failed to load

const tags = computed(() => allTags.value[props.repository] || [])

// Sort tags: "latest" first, then by semantic version (descending), then alphabetically
const sortedTags = computed(() => {
  const tagList = [...tags.value]

  return tagList.sort((a, b) => {
    // "latest" always first
    if (a === 'latest') return -1
    if (b === 'latest') return 1

    // Try semantic version comparison (descending - newest first)
    const versionA = parseVersion(a)
    const versionB = parseVersion(b)

    if (versionA && versionB) {
      // Compare major.minor.patch descending
      for (let i = 0; i < 3; i++) {
        if (versionA[i] !== versionB[i]) {
          return versionB[i] - versionA[i] // Descending
        }
      }
      // If versions equal, compare suffix alphabetically descending
      return (versionB[3] || '').localeCompare(versionA[3] || '')
    }

    // Non-version tags: alphabetically descending (newer usually has higher chars)
    return b.localeCompare(a)
  })
})

// Parse semantic version string, returns [major, minor, patch, suffix] or null
function parseVersion(tag) {
  const match = tag.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)$/)
  if (!match) return null
  return [
    parseInt(match[1]) || 0,
    parseInt(match[2]) || 0,
    parseInt(match[3]) || 0,
    match[4] || ''
  ]
}

const filteredTags = computed(() => {
  if (!tagFilter.value) return sortedTags.value
  const filter = tagFilter.value.toLowerCase()
  return sortedTags.value.filter(tag => tag.toLowerCase().includes(filter))
})

const imageInfo = computed(() => {
  if (!selectedTag.value) return null
  return imageInfos.value[`${props.repository}:${selectedTag.value}`]
})

const maxLayerSize = computed(() => {
  if (!imageInfo.value?.manifest?.layers) return 0
  return Math.max(...imageInfo.value.manifest.layers.map(l => l.size || 0))
})

const pullCommand = computed(() => {
  const registry = credentials.value?.registryUrl?.replace(/^https?:\/\//, '') || 'registry'
  const tag = selectedTag.value || 'latest'
  return `${registry}/${props.repository}:${tag}`
})

onMounted(async () => {
  await fetchTags()
})

watch(() => props.repository, async () => {
  selectedTag.value = null
  loadError.value = null
  failedTags.value = new Set()
  await fetchTags()
})

// Auto-load details when tag is selected
watch(selectedTag, async (newTag) => {
  loadError.value = null
  if (newTag && !imageInfos.value[`${props.repository}:${newTag}`] && !failedTags.value.has(newTag)) {
    await loadImageInfoForTag(newTag)
  }
})

async function fetchTags() {
  loadingTags.value = true
  try {
    await loadTags(props.repository)
    // Auto-select 'latest' if available, otherwise first tag
    if (tags.value.includes('latest')) {
      selectedTag.value = 'latest'
    } else if (tags.value.length > 0) {
      selectedTag.value = tags.value[0]
    }
  } finally {
    loadingTags.value = false
  }
}

function selectTag(tag) {
  if (selectedTag.value !== tag) {
    selectedTag.value = tag
  }
}

async function loadImageInfoForTag(tag) {
  loadingInfo.value = true
  loadError.value = null
  try {
    const result = await loadImageInfo(props.repository, tag)
    if (!result) {
      throw new Error('Failed to load image details')
    }
    // Remove from failed tags if retry succeeded
    failedTags.value.delete(tag)
  } catch (err) {
    loadError.value = err.message || 'Failed to load image details. Please check if the registry is accessible.'
    failedTags.value.add(tag)
  } finally {
    loadingInfo.value = false
  }
}

function retryLoadInfo() {
  if (selectedTag.value) {
    failedTags.value.delete(selectedTag.value)
    loadImageInfoForTag(selectedTag.value)
  }
}

function shortenDigest(digest) {
  if (!digest) return ''
  // Show algorithm prefix + first 12 chars of hash
  const parts = digest.split(':')
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1].substring(0, 12)}`
  }
  return digest.substring(0, 19)
}

function formatMediaType(mediaType) {
  if (!mediaType) return ''
  return mediaType
    .replace('application/vnd.docker.distribution.manifest.', 'docker.manifest.')
    .replace('application/vnd.oci.image.manifest.', 'oci.manifest.')
}

function formatLayerType(mediaType) {
  if (!mediaType) return ''
  if (mediaType.includes('gzip')) return 'gzip'
  if (mediaType.includes('zstd')) return 'zstd'
  if (mediaType.includes('tar')) return 'tar'
  return mediaType.split('.').pop()
}

function formatPlatform(platform) {
  if (!platform) return null
  // Don't show if both os and architecture are missing
  if (!platform.os && !platform.architecture) return null

  let result = `${platform.os || '?'}/${platform.architecture || '?'}`
  if (platform.variant) {
    result += `/${platform.variant}`
  }
  return result
}

// Filter out platforms with unknown/unknown
function getValidPlatforms(platforms) {
  if (!platforms) return []
  return platforms.filter(p => p.os || p.architecture)
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return ''
  }
}

function getLayerPercentage(size) {
  if (!maxLayerSize.value || !size) return 0
  return (size / maxLayerSize.value) * 100
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    console.error('Failed to copy to clipboard')
  }
}

async function copyPullCommand() {
  await copyToClipboard(`docker pull ${pullCommand.value}`)
}
</script>

<style scoped>
.image-details {
  padding: 0.5rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: var(--p-text-color);
  font-size: 1rem;
}

.section-header h3 i {
  color: var(--p-primary-color);
}

.tag-count {
  font-weight: normal;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.tag-filter {
  margin-bottom: 1rem;
  max-width: 300px;
}

.loading-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  padding: 0.5rem 0;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

/* Error Section */
.error-section {
  padding: 1rem 0;
}

.error-message {
  width: 100%;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-content strong {
  font-size: 1rem;
}

.error-content p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.9;
}

.error-actions {
  margin-top: 0.5rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.tag-item:hover {
  background: var(--p-surface-hover);
}

.tag-item.selected {
  background: var(--p-highlight-background);
  border-color: var(--p-primary-color);
}

.tag-item.loading {
  opacity: 0.7;
}

.tag-loaded {
  color: var(--p-green-500);
  font-size: 0.875rem;
}

.tag-error {
  color: var(--p-red-500);
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 2rem;
}

/* Metrics Row */
.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 10px;
}

.metric > i {
  font-size: 1.5rem;
  color: var(--p-primary-color);
  opacity: 0.8;
}

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.metric-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Platforms Section */
.platforms-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 10px;
}

.platforms-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.platforms-header i {
  color: var(--p-primary-color);
}

.multi-arch-badge {
  margin-left: auto;
}

.platforms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.platform-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-ground);
  border: 1px solid var(--p-surface-border);
  border-radius: 20px;
  font-size: 0.875rem;
}

.platform-name {
  font-family: monospace;
  font-weight: 500;
  color: var(--p-text-color);
}

.platform-size {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  padding-left: 0.5rem;
  border-left: 1px solid var(--p-surface-border);
}

/* Details Panel */
.details-panel,
.layers-panel,
.raw-panel {
  margin-bottom: 1rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 0.9rem;
  color: var(--p-text-color);
}

.detail-value.digest {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--p-primary-color);
  word-break: break-all;
  background: var(--p-surface-ground);
  padding: 0.5rem;
  border-radius: 4px;
}

/* Layers List */
.layers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.layer-item {
  display: grid;
  grid-template-columns: 40px 120px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  background: var(--p-surface-ground);
  border-radius: 8px;
  position: relative;
}

.layer-index {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.875rem;
}

.layer-info {
  display: flex;
  flex-direction: column;
}

.layer-size {
  font-weight: 600;
  color: var(--p-text-color);
}

.layer-type {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.layer-digest {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.layer-digest code {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.copy-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.layer-item:hover .copy-btn {
  opacity: 1;
}

.layer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--p-surface-border);
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.layer-bar-fill {
  height: 100%;
  background: var(--p-primary-color);
  transition: width 0.3s ease;
}

/* Raw JSON */
.raw-json {
  margin: 0;
  padding: 1rem;
  font-size: 0.75rem;
  background: var(--p-surface-ground);
  border-radius: 6px;
  overflow: auto;
  max-height: 400px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* No Data */
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--p-text-muted-color);
  background: var(--p-surface-ground);
  border-radius: 8px;
}

.no-data i {
  font-size: 2rem;
}

/* Pull Section */
.pull-section {
  border-top: 1px solid var(--p-surface-border);
  padding-top: 1rem;
}

.pull-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.pull-header i {
  color: var(--p-primary-color);
}

.pull-command {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--p-surface-ground);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--p-surface-border);
}

.pull-command code {
  flex: 1;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--p-text-color);
  word-break: break-all;
}

/* Responsive */
@media (max-width: 768px) {
  .layer-item {
    grid-template-columns: 32px 1fr;
    gap: 0.5rem;
  }

  .layer-digest {
    grid-column: 1 / -1;
  }

  .metrics-row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
