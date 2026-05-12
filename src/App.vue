<template>
  <div class="app">
    <!-- Single top bar — brand, host pill, actions -->
    <header class="app-header">
      <div class="header-content">
        <div class="brand">
          <div class="brand-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round">
              <path d="m12 3 9 4.5L12 12 3 7.5 12 3Z"/>
              <path d="m3 12 9 4.5L21 12"/>
              <path d="m3 16.5 9 4.5 9-4.5"/>
            </svg>
          </div>
          <span class="brand-name">Registry Lens</span>
        </div>

        <div v-if="isConnected && registryHost" class="id-host" aria-label="Current registry">
          <span class="live" aria-hidden="true"></span>
          <span class="host">{{ registryHost }}</span>
        </div>

        <div class="header-actions">
          <button
            v-if="isConnected"
            class="id-icon-btn"
            type="button"
            @click="handleRefresh"
            :disabled="isLoading"
            aria-label="Refresh"
            v-tooltip.bottom="'Refresh repositories'"
          >
            <i class="pi pi-refresh" :class="{ spinning: isLoading }"></i>
          </button>
          <button
            v-if="isConnected"
            class="id-icon-btn"
            type="button"
            @click="handleDisconnect"
            aria-label="Disconnect"
            v-tooltip.bottom="'Disconnect'"
          >
            <i class="pi pi-sign-out"></i>
          </button>
          <button
            class="id-icon-btn"
            type="button"
            @click="toggleDarkMode"
            :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            v-tooltip.bottom="isDarkMode ? 'Light mode' : 'Dark mode'"
          >
            <i :class="isDarkMode ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main">
      <div v-if="isInitializing" class="init-loading">
        <ProgressSpinner strokeWidth="3" />
        <span>Loading...</span>
      </div>
      <template v-else>
        <LoginForm v-if="!isConnected" />
        <RegistryBrowser v-else />
      </template>
    </main>

    <Toast position="bottom-right" />

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <span class="status-pill">
          <span class="live-dot" aria-hidden="true"></span>
          All systems operational
        </span>
        <span class="footer-meta">
          <span>v1.0.0</span>
          <span class="dot-sep" aria-hidden="true">·</span>
          <a href="https://github.com/kpiegza" target="_blank" rel="noopener noreferrer" class="author-link">
            <i class="pi pi-github"></i>
            kpiegza
          </a>
        </span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Toast from 'primevue/toast'
import ProgressSpinner from 'primevue/progressspinner'
import LoginForm from './components/LoginForm.vue'
import RegistryBrowser from './components/RegistryBrowser.vue'
import { useRegistry } from './composables/useRegistry'

const {
  isInitializing,
  isConnected,
  isLoading,
  registryUrl,
  reconnect,
  loadRepositories,
  disconnect
} = useRegistry()

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
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark-mode')
  }
  await reconnect()
})

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
}

function handleRefresh() {
  loadRepositories()
}

function handleDisconnect() {
  disconnect()
}
</script>

<style>
:root {
  --header-height: 52px;
  --footer-height: 40px;
  --page-max: 1200px;
  --page-padding-mobile: 16px;
  --page-padding-desktop: 24px;
}

.app {
  min-height: 100vh;
  background: var(--canvas);
  color: var(--fg);
  display: flex;
  flex-direction: column;
}

/* ---- Header (mobile-first) ---- */
.app-header {
  height: var(--header-height);
  background: var(--canvas);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: var(--page-max);
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 var(--page-padding-mobile);
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fg);
  flex-shrink: 0;
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--accent-subtle);
  border: 1px solid color-mix(in oklch, var(--accent) 30%, transparent);
  display: grid;
  place-items: center;
  color: var(--accent);
  flex-shrink: 0;
}

.brand-logo svg {
  width: 16px;
  height: 16px;
}

.brand-name {
  font: 600 14px/1.15 var(--font-ui);
  letter-spacing: -0.01em;
  color: var(--fg);
  display: none;
}

/* Identity strip — host pill (mirrors prototype .id-host) */
.id-host {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--fg);
  letter-spacing: -0.005em;
  min-width: 0;
  flex: 1 1 auto;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--canvas-subtle);
  max-width: max-content;
}

.id-host .live {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success) 20%, transparent);
  flex-shrink: 0;
}

.id-host .host {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.id-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: var(--fg);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-size: 14px;
}

.id-icon-btn:hover:not(:disabled) {
  background: var(--canvas-subtle);
  border-color: var(--border);
}

.id-icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.id-icon-btn .pi-sign-out:hover {
  color: var(--danger);
}

.spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---- Main ---- */
.app-main {
  flex: 1;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  background: var(--canvas);
}

.init-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  gap: 16px;
  color: var(--fg-muted);
  font-size: 14px;
}

/* ---- Footer ---- */
.app-footer {
  height: var(--footer-height);
  background: var(--canvas);
  border-top: 1px solid var(--border);
}

.footer-content {
  max-width: var(--page-max);
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--page-padding-mobile);
  font-size: 11.5px;
  color: var(--fg-muted);
  gap: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--fg);
  min-width: 0;
}

.status-pill > :last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success) 20%, transparent);
  animation: pulse-dot 2s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

.footer-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0;
  flex-shrink: 0;
}

.dot-sep { color: var(--border); }

.author-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.author-link:hover { color: var(--accent-hover); }

.author-link i { font-size: 11px; }

/* ---- Breakpoints up ---- */
@media (min-width: 480px) {
  .brand-name { display: inline; }
}

@media (min-width: 768px) {
  :root {
    --header-height: 56px;
  }
  .header-content {
    padding: 0 var(--page-padding-desktop);
    gap: 14px;
  }
  .brand-logo { width: 32px; height: 32px; border-radius: 8px; }
  .brand-logo svg { width: 18px; height: 18px; }
  .brand-name { font-size: 15px; }
  .id-host { font-size: 13px; padding: 4px 12px; }
  .id-host .live { width: 7px; height: 7px; }
  .id-icon-btn { width: 34px; height: 34px; }
  .footer-content {
    padding: 0 var(--page-padding-desktop);
    font-size: 12px;
  }
}
</style>
