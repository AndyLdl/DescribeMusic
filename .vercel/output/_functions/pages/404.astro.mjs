/* empty css                                 */
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_bED4jumr.mjs';
import { $ as $$Container } from '../chunks/container_CSdxKEov.mjs';
import { $ as $$Layout } from '../chunks/Layout_DhNej8iM.mjs';
export { renderers } from '../renderers.mjs';

const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "404 Not Found" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Container", $$Container, {}, { "default": ($$result3) => renderTemplate` ${maybeRenderHead()}<div class="min-h-[calc(100vh-16rem)] flex items-center justify-center"> <div class="text-center"> <h1 class="text-4xl lg:text-5xl font-bold lg:tracking-tight">404</h1> <p class="text-lg mt-4 text-slate-600">Page not found.</p> </div> </div> ` })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/404.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/404.astro";
const $$url = "/404";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$404,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
