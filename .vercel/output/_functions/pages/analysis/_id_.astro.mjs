/* empty css                                    */
import { b as createAstro, c as createComponent, r as renderComponent, a as renderTemplate } from '../../chunks/astro/server_bED4jumr.mjs';
import { $ as $$AnalyzeLayout } from '../../chunks/AnalyzeLayout_CcWDwjH5.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://describemusic.net");
const prerender = false;
const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  if (!id) {
    throw new Error("Analysis ID is required");
  }
  const title = `Audio Analysis Result ${id} - AI Music Analysis Tool`;
  const description = `View detailed AI analysis results for audio file ${id}. Get insights on music, voice, emotions, and more with our AI-powered audio analysis tool.`;
  return renderTemplate`${renderComponent($$result, "AnalyzeLayout", $$AnalyzeLayout, { "title": title, "description": description }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AnalysisResultViewerWithAuth", null, { "analysisId": id, "client:only": "react", "client:component-hydration": "only", "client:component-path": "@/components/analysis/AnalysisResultViewerWithAuth.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/analysis/[id].astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/analysis/[id].astro";
const $$url = "/analysis/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
