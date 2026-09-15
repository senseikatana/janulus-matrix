// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nitro-cloudflare-dev'],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Privadas (server-only): se mapean desde NUXT_TRANSLATE_API_KEY,
    // NUXT_MYMEMORY_EMAIL, NUXT_OPENROUTER_API_KEY y NUXT_INSFORGE_API_KEY.
    // Vacías por default = cadena gratis (diccionario + proveedores públicos).
    translateApiKey: '',
    myMemoryEmail: '',
    openrouterApiKey: '',
    insforgeApiKey: '',
    public: {
      translateProvider: 'gtx',
      insforgeUrl: ''
    }
  },

  routeRules: {
    '/': { ssr: true, prerender: true }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    // En Netlify (NETLIFY=true) Nitro debe usar el preset `netlify` (publica en dist/
    // + functions en .netlify/). Un preset hardcodeado a cloudflare rompería el deploy.
    preset: process.env.NETLIFY ? 'netlify' : 'cloudflare_module',

    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
