import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Dialog, Notify, Loading } from 'quasar'

import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import './css/app.scss'

import App from './App.vue'
import router from './router'
import { installSessionHandlers } from './router/auth'

const app = createApp(App)

app.use(createPinia())
// Before the router starts its first navigation, so every request carries the session.
installSessionHandlers(router)
app.use(router)
app.use(Quasar, {
  plugins: { Dialog, Notify, Loading },
})

app.mount('#app')
