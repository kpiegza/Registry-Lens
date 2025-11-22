<template>
  <div class="app" :class="{ 'dark-mode': isDarkMode }">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="brand">
          <svg class="brand-logo" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Container boxes icon -->
            <rect x="2" y="6" width="28" height="20" rx="3" stroke="currentColor" stroke-width="2"/>
            <rect x="6" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
            <rect x="13" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.6"/>
            <rect x="20" y="10" width="6" height="6" rx="1" fill="currentColor" opacity="0.4"/>
            <rect x="6" y="18" width="20" height="2" rx="1" fill="currentColor" opacity="0.3"/>
          </svg>
          <div class="brand-text">
            <span class="brand-name">Registry Lens</span>
            <span v-if="registryHost" class="registry-name">{{ registryHost }}</span>
          </div>
        </div>
        <div class="header-actions">
          <Button
            :icon="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"
            text
            rounded
            @click="toggleDarkMode"
            v-tooltip="isDarkMode ? 'Light mode' : 'Dark mode'"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <!-- Loading screen during initialization -->
      <div v-if="isInitializing" class="init-loading">
        <ProgressSpinner strokeWidth="3" />
        <span>Loading...</span>
      </div>
      <!-- Content after initialization -->
      <template v-else>
        <LoginForm v-if="!isConnected" />
        <RegistryBrowser v-else />
      </template>
    </main>

    <!-- Toast for notifications -->
    <Toast position="bottom-right" />

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">
          <span>Registry Lens</span>
          <span class="separator">|</span>
          <span>Docker Registry Browser</span>
        </div>
        <div class="footer-right">
          <span>Made by</span>
          <a href="https://github.com/kpiegza" target="_blank" rel="noopener noreferrer" class="author-link">
            <i class="pi pi-github"></i>
            kpiegza
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import LoginForm from './components/LoginForm.vue'
import RegistryBrowser from './components/RegistryBrowser.vue'
import { useRegistry } from './composables/useRegistry'

const { isInitializing, isConnected, registryUrl, reconnect } = useRegistry()

// Extract hostname from registry URL
const registryHost = computed(() => {
  const url = registryUrl.value
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0]
  }
})

const isDarkMode = ref(false)

onMounted(async () => {
  // Check saved theme preference
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark-mode')
  }

  // Try to reconnect with saved credentials
  await reconnect()
})

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')

  // Apply dark mode class to document root for PrimeVue
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}
</script>

<style>
:root {
  --header-height: 60px;
  --footer-height: 48px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app {
  min-height: 100vh;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
}

.app-header {
  height: var(--header-height);
  background: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--p-primary-color);
}

.brand-logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.registry-name {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.app-main {
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
}

.init-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  gap: 1rem;
  color: var(--p-text-muted-color);
  font-size: 1rem;
}

/* Footer */
.app-footer {
  height: var(--footer-height);
  background: var(--p-surface-card);
  border-top: 1px solid var(--p-surface-border);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-left .separator {
  opacity: 0.5;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.author-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--p-primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.author-link:hover {
  opacity: 0.8;
}

.author-link i {
  font-size: 1rem;
}

@media (max-width: 480px) {
  .footer-content {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
  }
}
</style>
