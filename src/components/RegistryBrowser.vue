<template>
  <div class="registry-browser">
    <!-- Header -->
    <div class="browser-header">
      <div class="header-left">
        <h2>Docker Registry</h2>
        <Tag :value="credentials?.registryUrl" severity="info" />
      </div>
      <div class="header-right">
        <Button
          icon="pi pi-refresh"
          text
          rounded
          @click="refresh"
          :loading="isLoading"
          v-tooltip="'Refresh repositories'"
        />
        <Button
          icon="pi pi-sign-out"
          text
          rounded
          severity="danger"
          @click="handleDisconnect"
          v-tooltip="'Disconnect'"
        />
      </div>
    </div>

    <!-- Search/Filter -->
    <div class="filter-section">
      <IconField>
        <InputIcon class="pi pi-search" />
        <InputText
          v-model="filterText"
          placeholder="Filter repositories..."
          class="w-full"
          @input="handleFilter"
        />
      </IconField>
      <div class="filter-stats">
        Showing {{ filteredRepositories.length }} of {{ repositories.length }} repositories
      </div>
    </div>

    <!-- Error message -->
    <Message v-if="error" severity="error" :closable="true" @close="clearError">
      {{ error }}
    </Message>

    <!-- Loading -->
    <div v-if="isLoading && !repositories.length" class="loading-section">
      <ProgressSpinner />
      <p>Loading repositories...</p>
    </div>

    <!-- Repository List -->
    <div v-else class="repository-list">
      <DataView
        :value="filteredRepositories"
        :layout="'list'"
        :paginator="filteredRepositories.length > 20"
        :rows="20"
        :rowsPerPageOptions="[10, 20, 50, 100]"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-inbox"></i>
            <p v-if="filter">No repositories match "{{ filter }}"</p>
            <p v-else>No repositories found in this registry</p>
          </div>
        </template>

        <template #list="slotProps">
          <div class="repository-items">
            <div
              v-for="repo in slotProps.items"
              :key="repo"
              class="repository-item"
              :class="{ selected: selectedRepo === repo }"
              @click="selectRepository(repo)"
            >
              <div class="repo-info">
                <i class="pi pi-box repo-icon"></i>
                <span class="repo-name">{{ repo }}</span>
              </div>
              <div class="repo-actions">
                <Button
                  icon="pi pi-chevron-right"
                  text
                  rounded
                  size="small"
                />
              </div>
            </div>
          </div>
        </template>
      </DataView>
    </div>

    <!-- Image Details Dialog -->
    <Dialog
      v-model:visible="showDetails"
      :header="selectedRepo"
      :modal="true"
      :style="{ width: '80vw', maxWidth: '900px' }"
      :maximizable="true"
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
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import DataView from 'primevue/dataview'
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
  credentials,
  disconnect,
  loadRepositories,
  setFilter,
  selectRepo
} = useRegistry()

const filterText = ref(filter.value || '')
const showDetails = ref(false)

onMounted(() => {
  if (!repositories.value.length) {
    loadRepositories()
  }
})

function handleFilter() {
  setFilter(filterText.value)
}

function handleDisconnect() {
  disconnect()
}

function refresh() {
  loadRepositories()
}

function selectRepository(repo) {
  selectRepo(repo)
  showDetails.value = true
}

function closeDetails() {
  showDetails.value = false
}

function clearError() {
  // Error will be cleared on next action
}
</script>

<style scoped>
.registry-browser {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  margin: 0;
  color: var(--p-text-color);
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.filter-section {
  margin-bottom: 1rem;
}

.w-full {
  width: 100%;
}

.filter-stats {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.repository-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.repository-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--p-surface-card);
  border: 1px solid var(--p-surface-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.repository-item:hover {
  background: var(--p-surface-hover);
  border-color: var(--p-primary-color);
}

.repository-item.selected {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background);
}

.repo-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.repo-icon {
  font-size: 1.25rem;
  color: var(--p-primary-color);
}

.repo-name {
  font-weight: 500;
  color: var(--p-text-color);
}
</style>
