<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Heading -->
      <div class="login-head">
        <h2>Sign in</h2>
        <p>Use your registry credentials to browse images, tags and pull commands.</p>
      </div>

      <form @submit.prevent="handleSubmit" autocomplete="on">
        <!-- Registry URL: fixed (from env) or user-entered -->
        <div v-if="hasFixedRegistry" class="server-card" aria-label="Your registry">
          <span class="ic" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <rect x="3" y="4" width="18" height="6" rx="1.5"/>
              <rect x="3" y="14" width="18" height="6" rx="1.5"/>
              <circle cx="7" cy="7" r="0.9" fill="currentColor"/>
              <circle cx="7" cy="17" r="0.9" fill="currentColor"/>
            </svg>
          </span>
          <div class="meta">
            <div class="label">Your registry</div>
            <div class="val mono">{{ fixedRegistryHost }}</div>
          </div>
          <span class="server-ok" aria-label="Configured">
            <i class="pi pi-lock"></i>
          </span>
        </div>

        <div v-else class="field">
          <label for="registryUrl">Registry URL</label>
          <div class="input" :class="{ focus: focusField === 'registryUrl', invalid: showUrlError }">
            <span class="lead" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <rect x="3" y="4" width="18" height="6" rx="1.5"/>
                <rect x="3" y="14" width="18" height="6" rx="1.5"/>
                <circle cx="7" cy="7" r="0.9" fill="currentColor"/>
                <circle cx="7" cy="17" r="0.9" fill="currentColor"/>
              </svg>
            </span>
            <input
              id="registryUrl"
              v-model="registryUrl"
              type="url"
              placeholder="https://registry.example.com"
              :disabled="isLoading"
              autocomplete="url"
              @focus="focusField = 'registryUrl'"
              @blur="focusField = null"
            />
          </div>
          <small class="hint">The URL of your self-hosted Docker Registry</small>
        </div>

        <div class="field">
          <label for="username">Username <span class="optional">optional</span></label>
          <div class="input" :class="{ focus: focusField === 'username' }">
            <span class="lead" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <circle cx="12" cy="8" r="3.5"/>
                <path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5"/>
              </svg>
            </span>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="admin"
              :disabled="isLoading"
              autocomplete="username"
              @focus="focusField = 'username'"
              @blur="focusField = null"
            />
          </div>
        </div>

        <div class="field">
          <label for="password">Password <span class="optional">optional</span></label>
          <div class="input" :class="{ focus: focusField === 'password' }">
            <span class="lead" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <rect x="4" y="11" width="16" height="9" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
              </svg>
            </span>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              :disabled="isLoading"
              autocomplete="current-password"
              @focus="focusField = 'password'"
              @blur="focusField = null"
            />
            <button
              type="button"
              class="eye"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              tabindex="-1"
            >
              <svg v-if="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <path d="M3 3l18 18"/>
                <path d="M10.5 10.5a2.6 2.6 0 0 0 3 3"/>
                <path d="M9.7 5.5A10.5 10.5 0 0 1 12 5.5c5.5 0 9 6.5 9 6.5a13.7 13.7 0 0 1-2.3 3.1"/>
                <path d="M6.6 6.6A13.6 13.6 0 0 0 3 12s3.5 6.5 9 6.5a9.3 9.3 0 0 0 4.4-1.1"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
                <path d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12Z"/>
                <circle cx="12" cy="12" r="2.6"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="toggle-row">
          <label class="check-label">
            <span class="check" :class="{ on: rememberDevice }" aria-hidden="true">
              <svg v-if="rememberDevice" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 8 3 3 7-7"/>
              </svg>
            </span>
            <input
              type="checkbox"
              v-model="rememberDevice"
              class="sr-only"
            />
            Remember device
          </label>
          <span class="storage-hint" v-if="storageInfo.method">
            <i class="pi pi-shield"></i>
            {{ storageInfo.method }}
          </span>
        </div>

        <button
          type="submit"
          class="btn-primary"
          :disabled="(!hasFixedRegistry && !registryUrl) || isLoading"
        >
          <span v-if="isLoading" class="btn-spinner" aria-hidden="true"></span>
          {{ isLoading ? 'Connecting…' : 'Sign in' }}
        </button>
      </form>

      <!-- Login footer -->
      <footer class="login-footer">
        <div class="footer-row">
          <span class="status-pill">
            <span class="live-dot" aria-hidden="true"></span>
            CORS proxy via Vite dev server
          </span>
          <span class="footer-links">
            <a href="https://docs.docker.com/registry/" target="_blank" rel="noopener">Docs</a>
            <span class="dot-sep" aria-hidden="true">·</span>
            <a href="https://github.com/kpiegza" target="_blank" rel="noopener">GitHub</a>
          </span>
        </div>
        <div class="footer-row mono">
          <span>{{ storageInfo.description }}</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRegistry } from '../composables/useRegistry'
import { ErrorHandler } from '../services/errorHandler'
import { FIXED_REGISTRY_URL, HAS_FIXED_REGISTRY } from '../config'

const { connect, isLoading, error, errorDetails: registryErrorDetails, getStorageInfo } = useRegistry()
const toast = useToast()

const hasFixedRegistry = HAS_FIXED_REGISTRY
const fixedRegistryHost = computed(() => {
  if (!FIXED_REGISTRY_URL) return ''
  try {
    return new URL(FIXED_REGISTRY_URL).host
  } catch {
    return FIXED_REGISTRY_URL.replace(/^https?:\/\//, '').split('/')[0]
  }
})

const registryUrl = ref(FIXED_REGISTRY_URL || '')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberDevice = ref(true)
const focusField = ref(null)
const showUrlError = ref(false)
const storageInfo = ref({ method: 'Session Storage', description: 'Loading storage capabilities…', secure: true })

onMounted(() => {
  storageInfo.value = getStorageInfo()
})

watch(error, (newError) => {
  if (!newError) return

  let errorInfo
  if (registryErrorDetails && registryErrorDetails.value) {
    errorInfo = registryErrorDetails.value
  } else {
    errorInfo = ErrorHandler.getDisplayMessage(newError)
  }

  const detail = errorInfo.details && errorInfo.suggestion
    ? `${errorInfo.details}\n\n💡 ${errorInfo.suggestion}`
    : errorInfo.suggestion || errorInfo.details || ''

  toast.add({
    severity: 'error',
    summary: errorInfo.message,
    detail,
    life: 8000
  })
})

async function handleSubmit() {
  const url = hasFixedRegistry ? FIXED_REGISTRY_URL : registryUrl.value
  if (!url) {
    showUrlError.value = true
    return
  }
  showUrlError.value = false
  await connect(url, username.value, password.value)
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - var(--header-height) - var(--footer-height));
  padding: 20px 16px 32px;
}

.login-card {
  width: 100%;
  max-width: 440px;
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 8px 0 0;
  box-shadow: none;
}

@media (min-width: 480px) {
  .login-page { padding: 48px 24px; align-items: center; }
  .login-card {
    background: var(--canvas);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px 28px 22px;
    box-shadow: var(--shadow-card);
  }
}

@media (min-width: 768px) {
  .login-card { padding: 32px 32px 24px; }
}

/* Head */
.login-head {
  margin-bottom: 24px;
}

.login-head h2 {
  font: 600 24px/1.15 var(--font-ui);
  letter-spacing: -0.02em;
  color: var(--fg);
  margin: 0 0 6px;
}

.login-head p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--fg-muted);
  margin: 0;
}

/* Server card — shown when URL is locked via env */
.server-card {
  margin-bottom: 20px;
  border: 1px solid var(--border);
  background: var(--canvas-subtle);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.server-card .ic {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: var(--canvas);
  border: 1px solid var(--border-muted);
  display: grid;
  place-items: center;
  color: var(--fg-muted);
  flex-shrink: 0;
}

.server-card .meta {
  flex: 1;
  min-width: 0;
}

.server-card .label {
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  margin-bottom: 4px;
}

.server-card .val {
  font-size: 13px;
  color: var(--fg);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-card .server-ok {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: color-mix(in oklch, var(--accent) 16%, transparent);
  color: var(--accent);
  font-size: 11px;
}

/* Fields */
.field {
  margin-bottom: 16px;
}

.field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 500 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  margin-bottom: 6px;
}

.optional {
  font: 400 9.5px/1 var(--font-mono);
  letter-spacing: 0.06em;
  color: var(--fg-muted);
  background: var(--canvas-subtle);
  border: 1px solid var(--border-muted);
  padding: 2px 5px;
  border-radius: 999px;
  text-transform: lowercase;
}

.input {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--canvas);
  border: 1px solid var(--border);
  border-radius: 8px;
  height: 44px;
  padding: 0 12px;
  color: var(--fg);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.input.focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 25%, transparent);
}

.input.invalid {
  border-color: var(--danger);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--danger) 25%, transparent);
}

.input .lead {
  color: var(--fg-muted);
  flex-shrink: 0;
  display: grid;
  place-items: center;
}

.input input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  font: 400 14px/1 var(--font-ui);
  color: var(--fg);
  padding: 0;
}

.input input::placeholder {
  color: var(--fg-muted);
}

.input .eye {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--fg-muted);
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  padding: 0;
  flex-shrink: 0;
}

.input .eye:hover { color: var(--fg); }

.hint {
  display: block;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--fg-muted);
}

/* Toggle row */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 20px;
  gap: 12px;
}

.check-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--fg);
  cursor: pointer;
  user-select: none;
}

.check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--canvas);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.check.on {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

.storage-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--fg-muted);
}

.storage-hint i { font-size: 11px; }

/* Submit */
.btn-primary {
  height: 44px;
  width: 100%;
  border-radius: 8px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
  border: 1px solid var(--btn-primary-border);
  font: 600 14px/1 var(--font-ui);
  letter-spacing: -0.005em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 1px 0 rgba(31,35,40,0.1);
  transition: background 0.15s, transform 0.05s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: none;
}

.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer */
.login-footer {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 8px;
  font: 400 11.5px/1.5 var(--font-ui);
  color: var(--fg-muted);
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.footer-row.mono {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: color-mix(in oklch, var(--fg-muted) 80%, transparent);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--fg);
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--success);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--success) 22%, transparent);
}

.footer-links {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.footer-links a {
  color: var(--accent);
  text-decoration: none;
}

.footer-links a:hover { text-decoration: underline; }

.dot-sep { color: var(--border); }
</style>
