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
    '@nuxtjs/i18n',
  ],

  icon: {
    mode: 'svg',
    clientBundle: {
      scan: true,
      // Dynamic tab icons in Scoreboard.vue are not string-literal scanned.
      icons: [
        'lucide:layout-list',
        'lucide:coins',
        'lucide:swords',
        'lucide:volume-2',
        'lucide:volume-x',
      ],
    },
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/app.scss',
    '~/assets/css/ui-motion.css',
    '~/assets/css/match.css',
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      title: 'Ancient Lens — Dota 2 match review',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [{ name: 'theme-color', content: '#171a18' }],
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL,
    name: 'Ancient Lens',
    description:
      'Ancient Lens — Dota 2 match stats: result, players, economy, and items. OpenDota data.',
    defaultLocale: 'en',
  },

  i18n: {
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'uk', language: 'uk', name: 'Українська', file: 'uk.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    baseUrl:
      process.env.NUXT_PUBLIC_SITE_URL &&
      !/localhost|127\.0\.0\.1/i.test(process.env.NUXT_PUBLIC_SITE_URL)
        ? process.env.NUXT_PUBLIC_SITE_URL
        : 'https://ancientlens.info',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'al_locale',
      redirectOn: 'root',
      fallbackLocale: 'en',
    },
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
    // On Workers Builds, wrangler.toml would otherwise pick cloudflare-module
    // and `wrangler pages deploy` fails on reserved ASSETS. Do not hardcode
    // static — that removes the Node server and breaks @nuxt/test-utils e2e.
    preset:
      process.env.NITRO_PRESET ||
      (process.env.WORKERS_CI === '1' || process.env.CF_PAGES === '1'
        ? 'static'
        : undefined),
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ['/', '/uk'],
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
