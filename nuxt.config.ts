// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Opt-in: solo con key, la oficial de Google va primera. Sin key, cadena 100% gratis.
    // Se configura con NUXT_TRANSLATE_API_KEY en .env (nunca NUXT_PUBLIC_*).
    translateApiKey: '',
    public: {
      translateProvider: 'gtx'
    }
  },

  routeRules: {
    '/': { ssr: true }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
