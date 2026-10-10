<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { Notify } from 'quasar'
import AuthCard from '@/components/auth/AuthCard.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import { REGISTER_ROUTE } from '@/router/auth'
import { toApiRequestError, type ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import type { LoginRequest } from '@/types/auth'
import { safeRedirect } from '@/utils/authForm'
import { queryString } from '@/utils/query'

/** Seeded on the backend for demos (AUTH.md). */
const DEMO_ACCOUNT: LoginRequest = { username: 'demo', password: 'Pokemon123!' }

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** Set by the register page: the normalized username of the account just created. */
const registeredUsername = computed(() => queryString(route.query.registered))
/** Where the user was going (a protected page, or the page where they clicked Sync/Edit). */
const redirect = computed(() => queryString(route.query.redirect))

const registerLink = computed<RouteLocationRaw>(() => ({
  name: REGISTER_ROUTE,
  query: redirect.value ? { redirect: redirect.value } : {},
}))

const loading = ref(false)
const serverError = shallowRef<ApiRequestError | null>(null)
const formRef = ref<InstanceType<typeof LoginForm> | null>(null)

async function login(request: LoginRequest) {
  if (loading.value) return
  loading.value = true
  serverError.value = null
  try {
    const session = await auth.login(request)
    Notify.create({ type: 'positive', message: `Welcome, ${session.username}!` })
    // Replace: "Back" shouldn't return to the login form.
    await router.replace(safeRedirect(redirect.value))
  } catch (err) {
    // 401 "Invalid username or password.": stay here and show it as-is.
    serverError.value = toApiRequestError(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <q-page padding class="row items-start justify-center">
    <div class="col-12 q-pt-sm">
      <AuthCard
        title="Log in"
        subtitle="Log in to add Pokémon to your collection and edit their details."
        icon="catching_pokemon"
      >
        <q-banner
          v-if="registeredUsername"
          rounded
          class="auth-banner auth-banner--positive q-mb-md"
          role="status"
          data-test="registered-banner"
        >
          <template #avatar>
            <q-icon name="check_circle" color="positive" aria-hidden="true" />
          </template>
          Account created. Log in as <strong>{{ registeredUsername }}</strong> to continue.
        </q-banner>
        <q-banner
          v-else-if="redirect"
          rounded
          class="auth-banner auth-banner--info q-mb-md"
          role="status"
          data-test="redirect-banner"
        >
          <template #avatar>
            <q-icon name="lock" color="info" aria-hidden="true" />
          </template>
          Please log in to continue. You'll return to where you were.
        </q-banner>

        <LoginForm
          ref="formRef"
          :loading="loading"
          :server-error="serverError"
          :initial-username="registeredUsername"
          @submit="login"
        />

        <div class="row items-center justify-center q-mt-md text-body2 text-grey-8">
          <span>Trying it out? Demo account: <code>demo</code> / <code>Pokemon123!</code></span>
          <q-btn
            flat
            dense
            no-caps
            color="secondary"
            label="Use it"
            class="q-ml-xs"
            :disable="loading"
            data-test="use-demo"
            @click="formRef?.fill(DEMO_ACCOUNT)"
          />
        </div>

        <template #footer>
          New here?
          <router-link :to="registerLink" class="text-secondary text-weight-medium">
            Create an account
          </router-link>
        </template>
      </AuthCard>
    </div>
  </q-page>
</template>

<style scoped>
.auth-banner {
  background: #fff;
  border: 1px solid currentColor;
  border-left-width: 4px;
}
.auth-banner--positive {
  border-color: var(--q-positive);
}
.auth-banner--info {
  border-color: var(--q-info);
}
</style>
