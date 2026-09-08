import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/test-utils',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/seo',
    'nuxt-security',
  ],

  css: ['~/assets/css/main.css', '~/assets/css/app.scss'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL,
    name: 'Ancient Lens',
    description: 'Ancient Lens',
    defaultLocale: 'ru',
  },

  typescript: {
    strict: true,
  },

  eslint: {
    config: {
      stylistic: false,
    },
  },

  nitro: {
    compressPublicAssets: true,
  },

  experimental: {
    typedPages: true,
  },

  sitemap: {
    zeroRuntime: true,
  },

  security: {
    headers: {
      crossOriginEmbedderPolicy: 'unsafe-none',
    },
  },
})
