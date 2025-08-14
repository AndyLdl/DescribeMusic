import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://describemusic.ai",
  integrations: [mdx(), sitemap(), icon({
    include: {
      'heroicons': ['*'],
      'simple-icons': ['*']
    }
  }), tailwind(), react()],
});