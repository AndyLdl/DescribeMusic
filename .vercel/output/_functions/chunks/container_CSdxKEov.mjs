import { b as createAstro, c as createComponent, m as maybeRenderHead, g as addAttribute, e as renderSlot, a as renderTemplate } from './astro/server_bED4jumr.mjs';
import 'clsx';

const $$Astro = createAstro("https://describemusic.net");
const $$Container = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Container;
  const { class: className } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(["max-w-(--breakpoint-xl) mx-auto px-5", className], "class:list")}> ${renderSlot($$result, $$slots["default"])} </div>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/container.astro", void 0);

export { $$Container as $ };
