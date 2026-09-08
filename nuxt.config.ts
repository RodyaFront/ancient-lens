import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/test-utils',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/seo',
    'nuxt-security',
  ],

  css: [
    '~/assets/css/main.css',
    '~/assets/css/app.scss',
    '~/assets/css/match.css',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'uk' },
      title: 'Ancient Lens — розбір матчів Dota 2',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#171a18' }],
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL,
    name: 'Ancient Lens',
    description:
      'Ancient Lens — статистика матчів Dota 2: результат, гравці, економіка та предмети. Дані OpenDota.',
    defaultLocale: 'uk',
  },

  fonts: {
    families: [
      {
        name: 'IBM Plex Sans',
        provider: 'google',
        global: true,
        weights: [400, 500, 600, 700],
        styles: ['normal'],
      },
      {
        name: 'Roboto Condensed',
        provider: 'google',
        global: true,
        weights: [500, 600, 700, 800],
        styles: ['normal'],
      },
    ],
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
    // Workers Builds sees wrangler.toml and would otherwise pick
    // cloudflare-module, then `wrangler pages deploy` fails on ASSETS.
    preset: 'static',
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  experimental: {
    typedPages: true,
  },

  sitemap: {
    zeroRuntime: true,
  },

  ogImage: {
    enabled: false,
  },

  security: {
    headers: {
      crossOriginEmbedderPolicy: 'unsafe-none',
      contentSecurityPolicy: {
        'img-src': [
          "'self'",
          'data:',
          'https://cdn.cloudflare.steamstatic.com',
        ],
        'connect-src': ["'self'", 'https://api.opendota.com'],
      },
    },
  },
})
