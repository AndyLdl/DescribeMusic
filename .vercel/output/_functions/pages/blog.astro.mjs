/* empty css                                 */
import { b as createAstro, c as createComponent, m as maybeRenderHead, g as addAttribute, e as renderSlot, a as renderTemplate, r as renderComponent, F as Fragment } from '../chunks/astro/server_bED4jumr.mjs';
import { g as getCollection } from '../chunks/_astro_content_C6eFRIES.mjs';
import '../chunks/index_CYyG6us9.mjs';
import { $ as $$Picture } from '../chunks/_astro_assets_HOR_qL3-.mjs';
import { $ as $$Layout } from '../chunks/Layout_DhNej8iM.mjs';
import { $ as $$Container } from '../chunks/container_CSdxKEov.mjs';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://describemusic.net");
const $$Sectionhead = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Sectionhead;
  const { align = "center" } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["mt-16", align === "center" && "text-center"], "class:list")}> <h1 class="text-4xl lg:text-5xl font-bold lg:tracking-tight text-white"> ${renderSlot($$result, $$slots["title"], renderTemplate`Title`)} </h1> <p class="text-xl mt-4 text-slate-300"> ${renderSlot($$result, $$slots["desc"], renderTemplate`Some description goes here`)} </p> </div>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sectionhead.astro", void 0);

const $$Blog = createComponent(async ($$result, $$props, $$slots) => {
  const publishedBlogEntries = await getCollection("blog", ({ data }) => {
    return !data.draft && data.publishDate < /* @__PURE__ */ new Date();
  });
  publishedBlogEntries.sort(function(a, b) {
    return b.data.publishDate.valueOf() - a.data.publishDate.valueOf();
  });
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Blog - AI Audio Analysis Insights & Tutorials | Describe Music", "description": "Discover expert insights on AI audio analysis, music technology, developer tutorials, and industry trends. Learn how to leverage audio AI for content creation, SEO, and accessibility." }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Container", $$Container, {}, { "default": async ($$result3) => renderTemplate` ${renderComponent($$result3, "Sectionhead", $$Sectionhead, {}, { "desc": async ($$result4) => renderTemplate`${renderComponent($$result4, "Fragment", Fragment, { "slot": "desc" }, { "default": async ($$result5) => renderTemplate`
Expert insights on AI audio analysis, developer guides, and industry
        trends to help you master audio technology.
` })}`, "title": async ($$result4) => renderTemplate`${renderComponent($$result4, "Fragment", Fragment, { "slot": "title" }, { "default": async ($$result5) => renderTemplate`Audio AI Insights & Tutorials` })}` })} ${maybeRenderHead()}<main class="mt-16"> <ul class="grid gap-16 max-w-4xl mx-auto"> ${publishedBlogEntries.map((blogPostEntry, index) => renderTemplate`<li> <article class="group bg-slate-800/30 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-violet-500/10"> <a${addAttribute(`/blog/${blogPostEntry.slug}`, "href")} class="block"> <div class="grid md:grid-cols-2 gap-0"> <div class="relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 min-h-[250px] flex items-center justify-center"> ${blogPostEntry.data.image?.src ? renderTemplate`${renderComponent($$result3, "Picture", $$Picture, { "src": blogPostEntry.data.image.src, "alt": blogPostEntry.data.image.alt, "sizes": "(max-width: 800px) 100vw, 400px", "width": 400, "height": 300, "loading": index <= 2 ? "eager" : "lazy", "decoding": index <= 2 ? "sync" : "async", "class": "w-full h-full min-h-[250px] object-cover object-center group-hover:scale-105 transition-transform duration-300" })}` : renderTemplate`<div class="flex flex-col items-center justify-center text-slate-400 p-8"> <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path> </svg> <span class="text-sm text-center"> ${blogPostEntry.data.category} </span> </div>`} <div class="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent"></div> </div> <div class="p-8"> <span class="inline-block px-3 py-1 text-xs font-medium tracking-wider uppercase bg-violet-500/20 text-violet-300 rounded-full"> ${blogPostEntry.data.category} </span> <h2 class="text-2xl font-bold leading-tight tracking-tight mt-4 text-white group-hover:text-violet-200 transition-colors"> ${blogPostEntry.data.title} </h2> <p class="text-slate-200 mt-3 leading-relaxed line-clamp-3"> ${blogPostEntry.data.snippet} </p> <div class="flex items-center gap-2 mt-6 text-sm"> <span class="text-slate-300"> ${blogPostEntry.data.author} </span> <span class="text-slate-500">•</span> <time class="text-slate-300"${addAttribute(blogPostEntry.data.publishDate.toISOString(), "datetime")}> ${new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(blogPostEntry.data.publishDate)} </time> </div> <div class="flex flex-wrap gap-2 mt-4"> ${blogPostEntry.data.tags.map((tag) => renderTemplate`<span class="text-xs text-slate-400 bg-slate-700/70 px-2 py-1 rounded">
#${tag} </span>`)} </div> </div> </div> </a> </article> </li>`)} </ul> </main> ` })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/blog.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/blog.astro";
const $$url = "/blog";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Blog,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
