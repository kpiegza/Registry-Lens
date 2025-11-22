<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Docker Registry Connection</h2>

      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
      </Message>

      <form @submit.prevent="handleSubmit">
        <div class="field">
          <label for="registryUrl">Registry URL</label>
          <InputText
            id="registryUrl"
            v-model="registryUrl"
            placeholder="https://registry.example.com"
            :disabled="isLoading"
            class="w-full"
          />
          <small class="hint">The URL of your self-hosted Docker Registry</small>
        </div>

        <div class="field">
          <label for="username">Username (optional)</label>
          <InputText
            id="username"
            v-model="username"
            placeholder="admin"
            :disabled="isLoading"
            class="w-full"
            autocomplete="username"
          />
        </div>

        <div class="field">
          <label for="password">Password (optional)</label>
          <Password
            id="password"
            v-model="password"
            :feedback="false"
            :disabled="isLoading"
            toggleMask
            class="w-full"
            inputClass="w-full"
            autocomplete="current-password"
          />
        </div>

        <div class="actions">
          <Button
            type="submit"
            label="Connect"
            icon="pi pi-link"
            :loading="isLoading"
            :disabled="!registryUrl"
          />
        </div>
      </form>

      <!-- Security Information -->
      <div class="security-section">
        <div class="security-header">
          <i class="pi pi-shield"></i>
          <h4>Security</h4>
        </div>
        <div class="security-info">
          <div class="security-item" :class="{ supported: storageInfo.secure }">
            <i :class="storageInfo.secure ? 'pi pi-check-circle' : 'pi pi-info-circle'"></i>
            <div>
              <strong>{{ storageInfo.method }}</strong>
              <p>{{ storageInfo.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CORS Info -->
      <div class="info-section">
        <h4>CORS Proxy</h4>
        <p>
          This app uses a development proxy to handle CORS. Your browser connects
          to the local Vite server, which forwards requests to the registry.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useRegistry } from '../composables/useRegistry'

const { connect, isLoading, error, getStorageInfo } = useRegistry()

const registryUrl = ref('')
const username = ref('')
const password = ref('')
const storageInfo = ref({ method: 'Session Storage', description: 'Loading...', secure: true })

onMounted(() => {
  storageInfo.value = getStorageInfo()
})

async function handleSubmit() {
  await connect(registryUrl.value, username.value, password.value)
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 2rem;
}

.login-card {
  background: var(--p-surface-card);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.login-card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--p-text-color);
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.hint {
  display: block;
  margin-top: 0.25rem;
  color: var(--p-text-muted-color);
}

.w-full {
  width: 100%;
}

.actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

/* Security Section */
.security-section {
  margin-top: 2rem;
  padding: 1rem;
  background: var(--p-surface-ground);
  border-radius: 8px;
}

.security-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.security-header i {
  color: var(--p-green-500);
  font-size: 1.1rem;
}

.security-header h4 {
  margin: 0;
  color: var(--p-text-color);
  font-size: 0.95rem;
}

.security-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.security-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 6px;
}

.security-item.supported {
  background: rgba(34, 197, 94, 0.1);
}

.security-item > i {
  color: var(--p-green-500);
  margin-top: 0.125rem;
}

.security-item strong {
  display: block;
  font-size: 0.85rem;
  color: var(--p-text-color);
}

.security-item p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  line-height: 1.4;
}

/* Info Section */
.info-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-border);
}

.info-section h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--p-text-color);
  font-size: 0.9rem;
}

.info-section p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  line-height: 1.5;
}
</style>
