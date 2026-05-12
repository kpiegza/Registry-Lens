<template>
  <div class="image-details">
    <!-- Mobile topbar (fullscreen dialog) -->
    <div class="topbar">
      <button class="topbar-btn" @click="$emit('close')" aria-label="Close">
        <i class="pi pi-arrow-left"></i>
      </button>
      <span class="topbar-title">{{ repository }}</span>
      <button class="topbar-btn" aria-label="Close" @click="$emit('close')">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <!-- Desktop floating close (only ≥ 768px) -->
    <button class="floating-close" @click="$emit('close')" aria-label="Close" v-tooltip.left="'Close'">
      <i class="pi pi-times"></i>
    </button>

    <!-- Head -->
    <div class="detail-head">
      <p class="breadcrumb">
        <span>{{ registryHost || 'registry' }}</span>
        <span class="sep">/</span>
        <b>{{ repository }}</b>
      </p>
      <h2>{{ repository }}</h2>
      <p class="desc">
        Inspect tags, manifest layers, platforms and pull command for this image.
      </p>
    </div>

    <!-- Pull command -->
    <div class="pullcmd">
      <div class="cmd">
        <span class="prompt">$</span>docker pull {{ pullCommand }}
      </div>
      <button class="copy-btn" @click="copyPullCommand" :aria-label="copied ? 'Copied!' : 'Copy pull command'">
        <i :class="copied ? 'pi pi-check' : 'pi pi-copy'"></i>
      </button>
    </div>

    <!-- Stats grid -->
    <div class="stats">
      <div class="stat">
        <div class="k">Latest tag</div>
        <div class="v">{{ latestTagLabel }}</div>
      </div>
      <div class="stat">
        <div class="k">Total tags</div>
        <div class="v">{{ tags.length }}</div>
      </div>
      <div class="stat">
        <div class="k">Layers</div>
        <div class="v">{{ layerCount }}</div>
      </div>
      <div class="stat">
        <div class="k">Compressed</div>
        <div class="v">
          {{ totalSizeNumber }}
          <small v-if="totalSizeUnit">{{ totalSizeUnit }}</small>
        </div>
      </div>
    </div>

    <!-- Segmented tabs -->
    <nav class="seg">
      <button
        class="seg-tab"
        :class="{ active: activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >
        Overview
      </button>
      <button
        class="seg-tab"
        :class="{ active: activeTab === 'tags' }"
        @click="activeTab = 'tags'"
      >
        Tags <span class="badge">{{ tags.length }}</span>
      </button>
      <button
        class="seg-tab"
        :class="{ active: activeTab === 'layers' }"
        @click="activeTab = 'layers'"
        :disabled="!imageInfo?.manifest?.layers"
      >
        Layers
      </button>
    </nav>

    <!-- Tab content -->
    <div class="tab-content">
      <!-- OVERVIEW -->
      <section v-if="activeTab === 'overview'" class="overview">
        <div v-if="loadingTags || (selectedTag && loadingInfo && !imageInfo)" class="loading-inline">
          <ProgressSpinner strokeWidth="3" style="width: 22px; height: 22px;" />
          <span>Loading image details…</span>
        </div>

        <div v-else-if="loadError" class="alert alert-error">
          <i class="pi pi-exclamation-circle"></i>
          <div class="alert-body">
            <strong>Failed to load image details</strong>
            <p>{{ loadError }}</p>
            <button class="btn-ghost small" @click="retryLoadInfo">
              <i class="pi pi-refresh"></i> Retry
            </button>
          </div>
        </div>

        <template v-else-if="imageInfo">
          <!-- Platforms -->
          <div v-if="validPlatforms.length" class="info-card">
            <div class="info-card-head">
              <i class="pi pi-microchip"></i>
              <span>Available platforms</span>
              <span v-if="imageInfo.isMultiPlatform" class="pill" style="margin-left:auto;">multi-arch</span>
            </div>
            <div class="platforms-list">
              <span
                v-for="platform in validPlatforms"
                :key="platform.digest || `${platform.os}-${platform.architecture}`"
                class="pill"
              >
                <span class="mono">{{ formatPlatform(platform) }}</span>
                <span v-if="platform.size" class="platform-size">{{ formatSize(platform.size) }}</span>
              </span>
            </div>
          </div>

          <!-- Manifest details -->
          <div class="info-card">
            <div class="info-card-head">
              <i class="pi pi-file"></i>
              <span>Manifest details</span>
            </div>
            <div class="kv-grid">
              <div class="kv">
                <b>Schema version</b>
                <span>{{ imageInfo.manifest.schemaVersion }}</span>
              </div>
              <div v-if="imageInfo.manifest.mediaType" class="kv">
                <b>Media type</b>
                <span class="mono">{{ formatMediaType(imageInfo.manifest.mediaType) }}</span>
              </div>
              <div v-if="imageInfo.dockerVersion" class="kv">
                <b>Docker version</b>
                <span>{{ imageInfo.dockerVersion }}</span>
              </div>
              <div v-if="imageInfo.created" class="kv">
                <b>Created</b>
                <span>{{ formatRelativeTime(imageInfo.created) }}</span>
              </div>
              <div v-if="imageInfo.manifest.config" class="kv full">
                <b>Config digest</b>
                <span class="digest mono">{{ imageInfo.manifest.config.digest }}</span>
              </div>
            </div>
          </div>

          <!-- Raw JSON (collapsible) -->
          <details class="info-card raw-card">
            <summary>
              <i class="pi pi-code"></i>
              <span>Raw manifest JSON</span>
              <i class="pi pi-chevron-down chev"></i>
            </summary>
            <pre class="raw-json">{{ JSON.stringify(imageInfo.manifest, null, 2) }}</pre>
          </details>
        </template>

        <div v-else class="no-data">
          <i class="pi pi-info-circle"></i>
          <p>Select a tag to view image details</p>
        </div>
      </section>

      <!-- TAGS -->
      <section v-if="activeTab === 'tags'" class="tags-section">
        <div class="tag-filter">
          <i class="pi pi-search"></i>
          <input
            type="text"
            v-model="tagFilter"
            placeholder="Filter tags"
            aria-label="Filter tags"
          />
          <span v-if="tagFilter" class="clear" role="button" aria-label="Clear filter" @click="tagFilter = ''">
            <i class="pi pi-times"></i>
          </span>
        </div>

        <div class="tags-meta">
          <span><b>{{ filteredTags.length }}</b> of <b>{{ tags.length }}</b> tags</span>
          <span class="loaded-meta">
            <i class="pi pi-database"></i>
            {{ loadedTagsCount }} loaded
          </span>
        </div>

        <div v-if="loadingTags" class="loading-inline">
          <ProgressSpinner strokeWidth="3" style="width: 22px; height: 22px;" />
          <span>Loading tags…</span>
        </div>

        <div v-else-if="!filteredTags.length" class="no-data">
          <i class="pi pi-inbox"></i>
          <p v-if="tagFilter">No tags match "{{ tagFilter }}"</p>
          <p v-else>No tags found</p>
        </div>

        <div v-else class="tag-rows">
          <article
            v-for="tag in filteredTags"
            :key="tag"
            class="tag-row"
            :class="{ expanded: selectedTag === tag, 'has-data': !!tagInfo(tag), 'failed': failedTags.has(tag) }"
          >
            <button
              type="button"
              class="tag-row-head"
              :aria-expanded="selectedTag === tag"
              @click="selectTag(tag)"
            >
              <span class="tag-name" :class="{ latest: tag === 'latest' }">
                <span class="dot" aria-hidden="true"></span>
                {{ tag }}
              </span>
              <span class="tag-row-end">
                <ProgressSpinner
                  v-if="selectedTag === tag && loadingInfo"
                  strokeWidth="3"
                  style="width: 14px; height: 14px;"
                />
                <span v-else-if="tagInfo(tag)?.totalSize" class="tag-size">{{ formatSize(tagInfo(tag).totalSize) }}</span>
                <span v-else-if="failedTags.has(tag)" class="tag-status danger">
                  <i class="pi pi-exclamation-triangle"></i>
                </span>
                <i class="pi pi-chevron-down chev" :class="{ open: selectedTag === tag }"></i>
              </span>
            </button>

            <div v-if="selectedTag === tag" class="tag-panel">
              <!-- Loading -->
              <div v-if="loadingInfo" class="tag-panel-loading">
                <ProgressSpinner strokeWidth="3" style="width: 20px; height: 20px;" />
                <span>Loading manifest for <code>{{ tag }}</code>…</span>
              </div>

              <!-- Error -->
              <div v-else-if="loadError" class="alert alert-error">
                <i class="pi pi-exclamation-circle"></i>
                <div class="alert-body">
                  <strong>Could not load manifest</strong>
                  <p>{{ loadError }}</p>
                  <button type="button" class="btn-ghost small" @click.stop="retryLoadInfo">
                    <i class="pi pi-refresh"></i> Retry
                  </button>
                </div>
              </div>

              <!-- Content -->
              <template v-else-if="tagInfo(tag)">
                <!-- Per-tag pull command -->
                <div class="pullcmd inset">
                  <div class="cmd">
                    <span class="prompt">$</span>docker pull {{ tagPullCommand(tag) }}
                  </div>
                  <button
                    type="button"
                    class="copy-btn"
                    @click.stop="copyTagPull(tag)"
                    :aria-label="copiedTag === tag ? 'Copied' : 'Copy pull command'"
                  >
                    <i :class="copiedTag === tag ? 'pi pi-check' : 'pi pi-copy'"></i>
                  </button>
                </div>

                <!-- Stats grid -->
                <div class="tag-stats">
                  <div class="stat-mini">
                    <div class="k">Layers</div>
                    <div class="v">{{ tagInfo(tag).manifest?.layers?.length ?? '—' }}</div>
                  </div>
                  <div class="stat-mini">
                    <div class="k">Compressed</div>
                    <div class="v">{{ formatSize(tagInfo(tag).totalSize) }}</div>
                  </div>
                  <div class="stat-mini">
                    <div class="k">Schema</div>
                    <div class="v">v{{ tagInfo(tag).manifest?.schemaVersion ?? '—' }}</div>
                  </div>
                  <div class="stat-mini">
                    <div class="k">Pushed</div>
                    <div class="v">{{ tagInfo(tag).created ? formatRelativeTime(tagInfo(tag).created) : '—' }}</div>
                  </div>
                </div>

                <!-- Arches -->
                <div v-if="tagArches(tag).length" class="tag-arches">
                  <span class="arches-label">Platforms</span>
                  <span
                    v-for="arch in tagArches(tag)"
                    :key="arch"
                    class="pill"
                  >{{ arch }}</span>
                </div>

                <!-- Digest -->
                <div v-if="tagDigest(tag)" class="tag-digest-row">
                  <span class="digest-label">Config digest</span>
                  <code class="digest mono">{{ tagDigest(tag) }}</code>
                </div>
              </template>
            </div>
          </article>
        </div>
      </section>

      <!-- LAYERS -->
      <section v-if="activeTab === 'layers'" class="layers-section">
        <div v-if="!imageInfo?.manifest?.layers" class="no-data">
          <i class="pi pi-info-circle"></i>
          <p>Select a tag with a manifest to view layers</p>
        </div>
        <div v-else class="layers-list">
          <div
            v-for="(layer, index) in imageInfo.manifest.layers"
            :key="layer.digest"
            class="layer-row"
          >
            <div class="layer-index">{{ index + 1 }}</div>
            <div class="layer-meta">
              <div class="layer-size">{{ formatSize(layer.size) }}</div>
              <div class="layer-type">{{ formatLayerType(layer.mediaType) }}</div>
            </div>
            <div class="layer-digest mono">
              {{ shortenDigest(layer.digest) }}
            </div>
            <button
              class="layer-copy"
              @click="copyToClipboard(layer.digest)"
              v-tooltip.left="'Copy digest'"
              aria-label="Copy digest"
            >
              <i class="pi pi-copy"></i>
            </button>
            <div class="layer-bar">
              <div
                class="layer-bar-fill"
                :style="{ width: getLayerPercentage(layer.size) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'
import { useRegistry } from '../composables/useRegistry'

const props = defineProps({
  repository: { type: String, required: true }
})

defineEmits(['close'])

const { loadTags, loadImageInfo, tags: allTags, imageInfos, registryUrl } = useRegistry()

const loadingTags = ref(false)
const loadingInfo = ref(false)
const tagFilter = ref('')
const selectedTag = ref(null)
const loadError = ref(null)
const failedTags = ref(new Set())
const activeTab = ref('overview')
const copied = ref(false)
const copiedTag = ref(null)

const tags = computed(() => allTags.value[props.repository] || [])

const registryHost = computed(() => {
  const url = registryUrl.value
  if (!url) return null
  try { return new URL(url).host } catch { return url.replace(/^https?:\/\//, '').split('/')[0] }
})

const sortedTags = computed(() => {
  const tagList = [...tags.value]
  return tagList.sort((a, b) => {
    if (a === 'latest') return -1
    if (b === 'latest') return 1
    const va = parseVersion(a), vb = parseVersion(b)
    if (va && vb) {
      for (let i = 0; i < 3; i++) if (va[i] !== vb[i]) return vb[i] - va[i]
      return (vb[3] || '').localeCompare(va[3] || '')
    }
    return b.localeCompare(a)
  })
})

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
  const f = tagFilter.value.toLowerCase()
  return sortedTags.value.filter(t => t.toLowerCase().includes(f))
})

const imageInfo = computed(() => {
  if (!selectedTag.value) return null
  return imageInfos.value[`${props.repository}:${selectedTag.value}`]
})

const validPlatforms = computed(() => {
  if (!imageInfo.value?.platforms) return []
  return imageInfo.value.platforms.filter(p => p.os || p.architecture)
})

const maxLayerSize = computed(() => {
  if (!imageInfo.value?.manifest?.layers) return 0
  return Math.max(...imageInfo.value.manifest.layers.map(l => l.size || 0))
})

const layerCount = computed(() => imageInfo.value?.manifest?.layers?.length || '—')

const totalSizeParts = computed(() => {
  if (!imageInfo.value?.totalSize) return { num: '—', unit: '' }
  const formatted = formatSize(imageInfo.value.totalSize)
  const match = formatted.match(/^([\d.]+)\s*(\S+)$/)
  return match ? { num: match[1], unit: match[2] } : { num: formatted, unit: '' }
})

const totalSizeNumber = computed(() => totalSizeParts.value.num)
const totalSizeUnit = computed(() => totalSizeParts.value.unit)

const latestTagLabel = computed(() => {
  if (sortedTags.value.includes('latest')) return 'latest'
  return sortedTags.value[0] || '—'
})

const pullCommand = computed(() => {
  const registry = registryHost.value || 'registry'
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
  activeTab.value = 'overview'
  await fetchTags()
})

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
  if (selectedTag.value === tag) {
    activeTab.value = activeTab.value === 'tags' ? 'overview' : activeTab.value
    return
  }
  selectedTag.value = tag
}

async function loadImageInfoForTag(tag) {
  loadingInfo.value = true
  loadError.value = null
  try {
    const result = await loadImageInfo(props.repository, tag)
    if (!result) throw new Error('Failed to load image details')
    failedTags.value.delete(tag)
  } catch (err) {
    loadError.value = err.message || 'Failed to load image details.'
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

function tagInfo(tag) {
  return imageInfos.value[`${props.repository}:${tag}`] || null
}

function tagDigest(tag) {
  return tagInfo(tag)?.manifest?.config?.digest || ''
}

function tagArches(tag) {
  const info = tagInfo(tag)
  if (!info?.platforms) return []
  return info.platforms
    .filter(p => p.architecture)
    .map(p => `${p.os || 'linux'}/${p.architecture}${p.variant ? `/${p.variant}` : ''}`)
    .slice(0, 6)
}

function tagPullCommand(tag) {
  const registry = registryHost.value || 'registry'
  return `${registry}/${props.repository}:${tag}`
}

async function copyTagPull(tag) {
  await copyToClipboard(`docker pull ${tagPullCommand(tag)}`)
  copiedTag.value = tag
  setTimeout(() => {
    if (copiedTag.value === tag) copiedTag.value = null
  }, 1600)
}

const loadedTagsCount = computed(() => {
  const prefix = `${props.repository}:`
  return Object.keys(imageInfos.value || {}).filter(k => k.startsWith(prefix)).length
})

function shortenDigest(digest) {
  if (!digest) return ''
  const parts = digest.split(':')
  if (parts.length === 2) return `${parts[0]}:${parts[1].substring(0, 12)}`
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
  if (!platform.os && !platform.architecture) return null
  let result = `${platform.os || '?'}/${platform.architecture || '?'}`
  if (platform.variant) result += `/${platform.variant}`
  return result
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  } catch { return '' }
}

function getLayerPercentage(size) {
  if (!maxLayerSize.value || !size) return 0
  return (size / maxLayerSize.value) * 100
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text) } catch { /* clipboard unavailable */ }
}

async function copyPullCommand() {
  await copyToClipboard(`docker pull ${pullCommand.value}`)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1600)
}
</script>

<style scoped>
.image-details {
  background: var(--canvas);
  color: var(--fg);
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  border-radius: 0;
  overflow: hidden;
  position: relative;
}

@media (min-width: 768px) {
  .image-details {
    border-radius: 14px;
    max-height: 88vh;
  }
}

/* Mobile topbar — only shown when dialog is fullscreen (< 768px) */
.topbar {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 12px;
  flex-shrink: 0;
  gap: 6px;
  border-bottom: 1px solid var(--border-subtle);
  position: sticky;
  top: 0;
  background: var(--canvas);
  z-index: 5;
}

@media (min-width: 768px) {
  .topbar { display: none; }
}

/* Desktop floating close (only on ≥ 768px) */
.floating-close {
  display: none;
}

@media (min-width: 768px) {
  .floating-close {
    display: grid;
    place-items: center;
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--fg-muted);
    cursor: pointer;
    z-index: 10;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
  }
  .floating-close:hover {
    background: var(--canvas-subtle);
    border-color: var(--border);
    color: var(--fg);
  }
}

.topbar-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--fg);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
}

.topbar-btn:hover {
  background: var(--canvas-subtle);
  border-color: var(--border);
}

.topbar-btn:first-child { color: var(--accent); }

.topbar-title {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--fg);
  letter-spacing: -0.005em;
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Head */
.detail-head {
  padding: 14px 16px 4px;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .detail-head { padding: 20px 56px 4px 24px; }
}

.breadcrumb {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--fg-muted);
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb b { color: var(--accent); font-weight: 500; }
.breadcrumb .sep { color: var(--border); }

.detail-head h2 {
  font: 600 22px/1.2 var(--font-mono);
  letter-spacing: -0.015em;
  margin: 0 0 6px;
  color: var(--fg);
  word-break: break-all;
}

.detail-head .desc {
  font-size: 13px;
  color: var(--fg-muted);
  margin: 0 0 14px;
  line-height: 1.5;
}

/* Pull command */
.pullcmd {
  margin: 0 16px 14px;
  display: flex;
  align-items: stretch;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--canvas-subtle);
  overflow: hidden;
}

@media (min-width: 768px) {
  .pullcmd { margin: 0 24px 16px; }
}

.pullcmd .cmd {
  flex: 1;
  padding: 10px 14px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--fg);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.pullcmd .prompt { color: var(--fg-muted); margin-right: 8px; }

.pullcmd .copy-btn {
  width: 44px;
  display: grid;
  place-items: center;
  border: none;
  border-left: 1px solid var(--border);
  background: var(--canvas);
  color: var(--fg-muted);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}

.pullcmd .copy-btn:hover { color: var(--accent); background: var(--canvas-subtle); }
.pullcmd .copy-btn:active { color: var(--accent); }

/* Stats grid — mobile-first: 2 cols, scales to 4 */
.stats {
  margin: 0 16px 14px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

@media (min-width: 640px) {
  .stats { grid-template-columns: repeat(4, 1fr); }
}

@media (min-width: 768px) {
  .stats { margin: 0 24px 16px; }
}

.stat {
  background: var(--canvas);
  padding: 12px 14px;
}

.stat .k {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  font-family: var(--font-mono);
  margin-bottom: 4px;
}

.stat .v {
  font: 600 18px/1.2 var(--font-ui);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat .v small {
  font: 400 12px/1 var(--font-mono);
  color: var(--fg-muted);
}

/* Segmented tabs */
.seg {
  margin: 4px 16px 0;
  display: flex;
  border-bottom: 1px solid var(--border);
  gap: 4px;
  flex-shrink: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.seg::-webkit-scrollbar { display: none; }

@media (min-width: 768px) {
  .seg { margin: 4px 24px 0; }
}

.seg-tab {
  flex: 0 0 auto;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-muted);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.seg-tab:hover:not(:disabled) { color: var(--fg); }

.seg-tab.active {
  color: var(--fg);
  border-bottom-color: var(--accent);
}

.seg-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.seg-tab .badge {
  display: inline-block;
  margin-left: 5px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
  background: var(--canvas-inset);
  padding: 1px 6px;
  border-radius: 999px;
  font-weight: 500;
  vertical-align: 1px;
}

.seg-tab.active .badge {
  background: var(--accent-subtle);
  color: var(--accent);
}

/* Tab content */
.tab-content {
  flex: 1;
  overflow: auto;
  padding: 14px 16px 24px;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) {
  .tab-content { padding: 16px 24px 24px; }
}

/* Overview cards */
.info-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--canvas);
  margin-bottom: 14px;
  overflow: hidden;
}

.info-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--canvas-subtle);
  border-bottom: 1px solid var(--border-subtle);
  font: 500 12.5px/1 var(--font-ui);
  color: var(--fg);
}

.info-card-head i { color: var(--fg-muted); font-size: 12px; }

.platforms-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 14px;
}

.platform-size {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--fg-muted);
  padding-left: 6px;
  border-left: 1px solid var(--border);
}

.kv-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px 16px;
  padding: 14px;
}

@media (min-width: 640px) {
  .kv-grid { grid-template-columns: repeat(2, 1fr); }
}

.kv {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.kv.full { grid-column: 1 / -1; }

.kv b {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
}

.kv span {
  font-size: 12.5px;
  color: var(--fg);
  word-break: break-all;
}

.kv .digest {
  font-size: 11.5px;
  color: var(--accent);
  background: var(--canvas-inset);
  padding: 4px 6px;
  border-radius: 4px;
}

/* Raw JSON */
.raw-card summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--canvas-subtle);
  font: 500 12.5px/1 var(--font-ui);
  color: var(--fg);
}

.raw-card summary::-webkit-details-marker { display: none; }
.raw-card summary i { color: var(--fg-muted); font-size: 12px; }
.raw-card summary .chev { margin-left: auto; transition: transform 0.2s; }
.raw-card[open] summary .chev { transform: rotate(180deg); }
.raw-card[open] summary { border-bottom: 1px solid var(--border-subtle); }

.raw-json {
  margin: 0;
  padding: 14px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.5;
  background: var(--canvas-inset);
  color: var(--fg);
  overflow: auto;
  max-height: 360px;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Loading / alerts */
.loading-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  color: var(--fg-muted);
  font-size: 13px;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.alert-error {
  background: var(--danger-subtle);
  border: 1px solid color-mix(in oklch, var(--danger) 30%, transparent);
  color: var(--danger);
}

.alert-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alert-body strong { font-size: 13px; }
.alert-body p { margin: 0; font-size: 12px; color: inherit; opacity: 0.9; }

.btn-ghost.small {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  width: max-content;
  margin-top: 4px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--fg-muted);
  background: var(--canvas-subtle);
  border-radius: 10px;
}

.no-data i { font-size: 24px; }
.no-data p { margin: 0; font-size: 13px; }

/* Tags section */
.tag-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  background: var(--canvas-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
  color: var(--fg-muted);
}

.tag-filter:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 22%, transparent);
}

.tag-filter i { font-size: 12px; flex-shrink: 0; }

.tag-filter input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--fg);
  min-width: 0;
}

.tag-filter input::placeholder { color: var(--fg-muted); }

.tag-filter .clear {
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.tag-filter .clear:hover { background: var(--canvas); color: var(--fg); }

.tags-meta {
  padding: 4px 2px 10px;
  font-size: 12px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.tags-meta b { color: var(--fg); font-weight: 500; }

.tags-meta .loaded-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--fg-muted);
}

.tags-meta .loaded-meta i { font-size: 11px; }

.tag-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tag-row {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--canvas);
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.tag-row:hover {
  border-color: color-mix(in oklch, var(--accent) 30%, var(--border));
}

.tag-row.expanded {
  border-color: var(--accent);
  background: var(--canvas-subtle);
}

.tag-row.failed {
  border-color: color-mix(in oklch, var(--danger) 30%, var(--border));
}

.tag-row-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  min-height: 48px;
}

.tag-row-head:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: 9px;
}

.tag-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  letter-spacing: -0.005em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-name .dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--border);
  flex-shrink: 0;
}

.tag-name.latest .dot {
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success) 18%, transparent);
}

.tag-row.has-data .tag-name .dot {
  background: var(--accent);
}

.tag-row-end {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  color: var(--fg-muted);
}

.tag-size {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
}

.tag-status.danger { color: var(--danger); }
.tag-status i { font-size: 12px; }

.chev {
  font-size: 11px;
  color: var(--fg-muted);
  transition: transform 0.2s;
}

.chev.open { transform: rotate(180deg); }

/* Expanded panel */
.tag-panel {
  padding: 0 14px 14px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.tag-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--fg-muted);
  padding: 6px 0;
}

.tag-panel-loading code {
  font-family: var(--font-mono);
  font-size: 12px;
  background: var(--canvas-inset);
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--fg);
}

.pullcmd.inset {
  margin: 0;
  background: var(--canvas);
}

.tag-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

@media (min-width: 640px) {
  .tag-stats { grid-template-columns: repeat(4, 1fr); }
}

.stat-mini {
  background: var(--canvas);
  padding: 10px 12px;
}

.stat-mini .k {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  margin-bottom: 4px;
}

.stat-mini .v {
  font: 600 14px/1.2 var(--font-ui);
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}

.tag-arches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.tag-arches .arches-label {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  margin-right: 4px;
}

.tag-digest-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.digest-label {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--fg-muted);
}

.tag-digest-row .digest {
  font-size: 11.5px;
  color: var(--accent);
  background: var(--canvas-inset);
  padding: 6px 8px;
  border-radius: 5px;
  word-break: break-all;
}

/* Layers */
.layers-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-row {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  grid-template-areas:
    "idx meta copy"
    "idx digest digest";
  gap: 4px 10px;
  align-items: center;
  padding: 12px;
  background: var(--canvas-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.layer-row .layer-index { grid-area: idx; }
.layer-row .layer-meta { grid-area: meta; }
.layer-row .layer-digest { grid-area: digest; }
.layer-row .layer-copy { grid-area: copy; }

@media (min-width: 640px) {
  .layer-row {
    grid-template-columns: 36px 140px 1fr auto;
    grid-template-areas: none;
    gap: 12px;
  }
  .layer-row .layer-index,
  .layer-row .layer-meta,
  .layer-row .layer-digest,
  .layer-row .layer-copy { grid-area: auto; }
}

.layer-index {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: 50%;
  font: 600 12px/1 var(--font-mono);
  border: 1px solid color-mix(in oklch, var(--accent) 30%, transparent);
}

.layer-meta { display: flex; flex-direction: column; gap: 2px; }
.layer-size {
  font-weight: 600;
  color: var(--fg);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.layer-type {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--fg-muted);
}

.layer-digest {
  font-size: 12px;
  color: var(--fg-muted);
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layer-copy {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--fg-muted);
  cursor: pointer;
}

.layer-copy:hover {
  background: var(--canvas);
  border-color: var(--border);
  color: var(--accent);
}

.layer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
  overflow: hidden;
}

.layer-bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

</style>
