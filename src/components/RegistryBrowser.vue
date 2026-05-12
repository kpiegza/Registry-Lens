<template>
  <div class="registry-browser">
    <!-- Storage gauge / overview -->
    <div class="gauge">
      <div class="gauge-row">
        <span class="gauge-label">Repositories index</span>
        <span class="gauge-value">
          <b>{{ filteredRepositories.length }}</b> / {{ repositories.length }}
        </span>
      </div>
      <div class="gauge-bar">
        <i :style="{ width: gaugePercent + '%' }"></i>
      </div>
      <div class="gauge-foot">
        <span><b>{{ repositories.length }}</b> repos</span>
        <span><b>{{ totalTagsLoaded }}</b> tags</span>
        <span><b>{{ totalManifestsLoaded }}</b> cached</span>
      </div>
    </div>

    <!-- Search -->
    <div class="searchbar">
      <i class="pi pi-search"></i>
      <input
        type="text"
        v-model="filterText"
        placeholder="Search repositories"
        @input="handleFilter"
        aria-label="Filter repositories"
      />
      <span v-if="filterText" class="clear" @click="clearFilter" role="button" aria-label="Clear filter">
        <i class="pi pi-times"></i>
      </span>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-error" role="alert">
      <i class="pi pi-exclamation-circle"></i>
      <span>{{ error }}</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && !repositories.length" class="loading-section">
      <ProgressSpinner strokeWidth="3" style="width: 36px; height: 36px;" />
      <p>Loading repositories…</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredRepositories.length" class="empty-state">
      <i class="pi pi-inbox"></i>
      <p v-if="filterText">No repositories match "{{ filterText }}"</p>
      <p v-else>No repositories found in this registry</p>
    </div>

    <!-- Repo grid -->
    <div v-else class="repo-list">
      <article
        v-for="repo in filteredRepositories"
        :key="repo"
        class="repo"
        :class="{ selected: selectedRepo === repo }"
        @click="selectRepository(repo)"
        @keydown.enter="selectRepository(repo)"
        tabindex="0"
        role="button"
      >
        <div class="repo-head">
          <div class="repo-name">
            <b>{{ repoNamespace(repo) }}</b>
            <span v-if="repoTail(repo)">/{{ repoTail(repo) }}</span>
          </div>
          <span class="repo-private">private</span>
        </div>
        <p class="repo-desc">
          Docker image hosted on this registry. Tap to inspect tags, layers and pull command.
        </p>
        <div class="repo-tags">
          <span class="pill latest">
            <i class="pi pi-tag" style="font-size: 10px;"></i>
            {{ tagCountLabel(repo) }}
          </span>
          <span class="pill">linux/amd64</span>
        </div>
        <div class="repo-stats">
          <span><i class="pi pi-clone"></i>{{ tagCount(repo) }} tags</span>
          <span><i class="pi pi-arrow-right"></i>open</span>
        </div>
      </article>
    </div>

    <!-- Image Details Dialog -->
    <Dialog
      v-model:visible="showDetails"
      :modal="true"
      :showHeader="false"
      :dismissableMask="true"
      class="details-dialog"
    >
      <ImageDetails
        v-if="selectedRepo"
        :repository="selectedRepo"
        @close="closeDetails"
      />
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ProgressSpinner from 'primevue/progressspinner'
import Dialog from 'primevue/dialog'
import ImageDetails from './ImageDetails.vue'
import { useRegistry } from '../composables/useRegistry'

const {
  isLoading,
  error,
  repositories,
  filteredRepositories,
  selectedRepo,
  filter,
  tags,
  imageInfos,
  loadRepositories,
  setFilter,
  selectRepo
} = useRegistry()

const filterText = ref(filter.value || '')
const showDetails = ref(false)

const totalTagsLoaded = computed(() =>
  Object.values(tags.value || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0)
)

const totalManifestsLoaded = computed(() => Object.keys(imageInfos.value || {}).length)

const gaugePercent = computed(() => {
  if (!repositories.value.length) return 0
  return Math.round((filteredRepositories.value.length / repositories.value.length) * 100)
})

onMounted(() => {
  if (!repositories.value.length) {
    loadRepositories()
  }
})

function handleFilter() {
  setFilter(filterText.value)
}

function clearFilter() {
  filterText.value = ''
  setFilter('')
}

function selectRepository(repo) {
  selectRepo(repo)
  showDetails.value = true
}

function closeDetails() {
  showDetails.value = false
}

function repoNamespace(repo) {
  const idx = repo.indexOf('/')
  return idx === -1 ? repo : repo.slice(0, idx)
}

function repoTail(repo) {
  const idx = repo.indexOf('/')
  return idx === -1 ? '' : repo.slice(idx + 1)
}

function tagCount(repo) {
  return tags.value?.[repo]?.length || 0
}

function tagCountLabel(repo) {
  const count = tagCount(repo)
  return count > 0 ? `${count} tag${count === 1 ? '' : 's'}` : 'inspect tags'
}
</script>

<style scoped>
.registry-browser {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 16px var(--page-padding-mobile) 32px;
}

/* Gauge */
.gauge {
  margin-bottom: 14px;
  padding: 12px 14px;
  background: var(--canvas-subtle);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.gauge-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.gauge-label {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
}

.gauge-value {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
}

.gauge-value b {
  color: var(--fg);
  font-weight: 500;
}

.gauge-bar {
  height: 4px;
  background: color-mix(in oklch, var(--border) 60%, transparent);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}

.gauge-bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.25s ease;
}

.gauge-foot {
  display: flex;
  gap: 12px;
  font-size: 11.5px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
  flex-wrap: wrap;
}

.gauge-foot span {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.gauge-foot span + span {
  border-inline-start: 1px solid var(--border);
  padding-inline-start: 12px;
}

.gauge-foot b {
  color: var(--fg);
  font-weight: 500;
  font-family: var(--font-mono);
  font-size: 12px;
}

/* Search */
.searchbar {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  background: var(--canvas-subtle);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg-muted);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.searchbar:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 22%, transparent);
}

.searchbar i { font-size: 13px; flex-shrink: 0; }

.searchbar input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--fg);
  padding: 0;
}

.searchbar input::placeholder { color: var(--fg-muted); }

.searchbar .clear {
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.searchbar .clear:hover { background: var(--canvas); color: var(--fg); }

/* Alert */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
}

.alert-error {
  background: var(--danger-subtle);
  border: 1px solid color-mix(in oklch, var(--danger) 30%, transparent);
  color: var(--danger);
}

/* Loading / empty */
.loading-section,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 16px;
  color: var(--fg-muted);
  background: var(--canvas-subtle);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;
}

.empty-state i { font-size: 28px; }
.empty-state p, .loading-section p { margin: 0; }

/* Repo list — mobile-first single column */
.repo-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.repo {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--canvas);
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  outline: none;
}

.repo:hover {
  border-color: color-mix(in oklch, var(--accent) 50%, var(--border));
  background: color-mix(in oklch, var(--accent-subtle) 35%, var(--canvas));
}

.repo:focus-visible {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 22%, transparent);
}

.repo.selected { border-color: var(--accent); }

.repo-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.repo-name {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-name b {
  color: var(--accent);
  font-weight: 500;
}

.repo-private {
  font-size: 11px;
  color: var(--fg-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 8px;
  font-weight: 500;
  flex-shrink: 0;
  background: var(--canvas);
}

.repo-desc {
  font-size: 12.5px;
  color: var(--fg-muted);
  line-height: 1.45;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.repo-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.repo-stats {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 11.5px;
  color: var(--fg-muted);
  font-variant-numeric: tabular-nums;
}

.repo-stats span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.repo-stats i { font-size: 11px; }

/* ---- Breakpoints up ---- */
@media (min-width: 768px) {
  .registry-browser {
    padding: 24px var(--page-padding-desktop) 48px;
  }
  .repo-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (min-width: 1024px) {
  .repo-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .repo-list {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

<style>
/* Dialog overrides — Primer-style chrome, mobile-first */
.details-dialog.p-dialog {
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  background: var(--canvas) !important;
  box-shadow: none !important;
  overflow: hidden;
}

.details-dialog .p-dialog-content {
  background: var(--canvas) !important;
  color: var(--fg) !important;
  padding: 0 !important;
  height: 100% !important;
  display: flex;
  flex-direction: column;
}

.details-dialog .p-dialog-header { display: none !important; }

@media (min-width: 768px) {
  .details-dialog.p-dialog {
    width: 92vw !important;
    height: auto !important;
    max-width: 960px !important;
    max-height: 88vh !important;
    border-radius: 14px !important;
    border: 1px solid var(--border) !important;
    box-shadow: 0 24px 48px -12px rgba(0,0,0,0.25) !important;
  }
}
</style>
