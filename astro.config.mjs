import {
  defineConfig
} from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://describemusic.net",
  output: "server",
  adapter: vercel(),
  integrations: [mdx(), sitemap(), icon({
    include: {
      'heroicons': ['*'],
      'simple-icons': ['*']
    }
  }), tailwind(), react()],
  vite: {
    envPrefix: ['VITE_'],
    esbuild: {
      // 在生产环境中移除调试日志，但保留错误日志
      drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
      pure: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.warn'] : [],
    },
  }
});