/* empty css                                 */
import { c as createComponent, r as renderComponent, a as renderTemplate } from '../chunks/astro/server_bED4jumr.mjs';
import { $ as $$AnalyzeLayout } from '../chunks/AnalyzeLayout_CcWDwjH5.mjs';
export { renderers } from '../renderers.mjs';

const $$Analyze = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AnalyzeLayout", $$AnalyzeLayout, { "title": "AI Audio Analysis Tool - Analyze Music, Voice & Sounds", "description": "Free AI-powered audio analyzer that provides instant detailed analysis of music, voice recordings, and sound effects. Upload your audio files and get professional insights with instrument detection, emotion analysis, and SEO-friendly descriptions." }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AnalyzeAppWithAuth", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "@/components/AnalyzeAppWithAuth.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/analyze.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/analyze.astro";
const $$url = "/analyze";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Analyze,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
