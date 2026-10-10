<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { Notify } from 'quasar'
import AuthCard from '@/components/auth/AuthCard.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import { LOGIN_ROUTE } from '@/router/auth'
import { toApiRequestError, type ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import type { RegisterRequest } from '@/types/auth'
import { queryString } from '@/utils/query'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

/** Carried over to the login page so the user still ends up where they were going. */
const redirect = computed(() => queryString(route.query.redirect))

const loginLink = computed<RouteLocationRaw>(() => ({
  name: LOGIN_ROUTE,
  query: redirect.value ? { redirect: redirect.value } : {},
}))

const loading = ref(false)
const serverError = shallowRef<ApiRequestError | null>(null)

async function register(request: RegisterRequest) {
  if (loading.value) return
  loading.value = true
  serverError.value = null
  try {
    // Registering doesn't log in: go to the login page with the normalized username filled in.
    const user = await auth.register(request)
    Notify.create({
      type: 'positive',
      message: `Account created. Your username is “${user.username}”.`,
    })
    await router.replace({
      name: LOGIN_ROUTE,
      query: { registered: user.username, ...(redirect.value ? { redirect: redirect.value } : {}) },
    })
  } catch (err) {
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
        title="Create an account"
        subtitle="An account lets you build your own Pokémon collection."
        icon="person_add"
      >
        <RegisterForm :loading="loading" :server-error="serverError" @submit="register" />

        <template #footer>
          Already have an account?
          <router-link :to="loginLink" class="text-secondary text-weight-medium"
            >Log in</router-link
          >
        </template>
      </AuthCard>
    </div>
  </q-page>
</template>
