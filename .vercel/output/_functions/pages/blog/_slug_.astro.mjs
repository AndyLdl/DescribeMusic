/* empty css                                    */
import { b as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, g as addAttribute } from '../../chunks/astro/server_bED4jumr.mjs';
import { g as getCollection } from '../../chunks/_astro_content_C6eFRIES.mjs';
import { $ as $$Layout } from '../../chunks/Layout_DhNej8iM.mjs';
import { $ as $$Container } from '../../chunks/container_CSdxKEov.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://describemusic.net");
async function getStaticPaths() {
  const blogEntries = await getCollection("blog");
  return blogEntries.map((entry) => ({
    params: { slug: entry.slug },
    props: { entry }
  }));
}
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { entry } = Astro2.props;
  const { Content } = await entry.render();
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `${entry.data.title} | Describe Music Blog`, "description": entry.data.snippet }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Container", $$Container, {}, { "default": async ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto max-w-4xl mt-14"> <!-- Header --> <div class="text-center mb-12"> <span class="inline-block px-3 py-1 text-xs font-medium tracking-wider uppercase bg-violet-500/20 text-violet-300 rounded-full mb-4"> ${entry.data.category} </span> <h1 class="text-4xl lg:text-6xl font-bold lg:tracking-tight text-white leading-tight"> ${entry.data.title} </h1> <div class="flex gap-3 mt-6 items-center justify-center flex-wrap text-sm"> <span class="text-slate-300 font-medium"> ${entry.data.author} </span> <span class="text-slate-600">•</span> <time class="text-slate-400"${addAttribute(entry.data.publishDate.toISOString(), "datetime")}> ${new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(entry.data.publishDate)} </time> <span class="text-slate-600 hidden md:block">•</span> <div class="flex flex-wrap gap-2 justify-center"> ${entry.data.tags.map((tag) => renderTemplate`<span class="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
#${tag} </span>`)} </div> </div> </div> <!-- Featured Image --> ${entry.data.image?.src ? renderTemplate`<div class="relative mb-12 rounded-xl overflow-hidden"> <img${addAttribute(entry.data.image.src, "src")}${addAttribute(entry.data.image.alt, "alt")} class="w-full h-[400px] object-cover bg-slate-700"> <div class="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent"></div> </div>` : renderTemplate`<div class="relative mb-12 rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 h-[400px] flex items-center justify-center"> <div class="flex flex-col items-center justify-center text-slate-400"> <svg class="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path> </svg> <span class="text-lg font-medium">${entry.data.category}</span> </div> <div class="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent"></div> </div>`} </div>  <div class="mx-auto prose prose-lg prose-invert mt-6 max-w-3xl prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300 prose-code:text-violet-300 prose-code:bg-slate-800 prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700"> ${renderComponent($$result3, "Content", Content, {})} </div>  <div class="max-w-3xl mx-auto mt-12 pt-8 border-t border-slate-700"> <div class="flex flex-col sm:flex-row gap-4 justify-between items-center"> <a href="/blog" class="flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition-all duration-300 group"> <svg class="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path> </svg>
Back to Blog
</a> <div class="flex gap-3"> <a href="/analyze" class="px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all duration-300 font-medium">
Try Audio Analysis
</a> </div> </div> </div> ` })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/blog/[slug].astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/blog/[slug].astro";
const $$url = "/blog/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  getStaticPaths,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
