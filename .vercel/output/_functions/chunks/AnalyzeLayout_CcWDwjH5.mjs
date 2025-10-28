import { b as createAstro, c as createComponent, a as renderTemplate, d as renderScript, r as renderComponent, e as renderSlot, f as renderHead, g as addAttribute } from './astro/server_bED4jumr.mjs';
import { a as $$Footer, b as $$SEO, e as en } from './footer_CgJVMux7.mjs';
/* empty css                        */

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Astro = createAstro("https://describemusic.net");
const $$AnalyzeLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AnalyzeLayout;
  const t = (key) => key.split(".").reduce((o, i) => o[i], en);
  const { title, description } = Astro2.props;
  const canonicalURL = new URL(Astro2.url.pathname, Astro2.site).toString();
  const resolvedImageWithDomain = new URL(
    "/images/logo/social/opengraph-1200x630.jpg",
    Astro2.site
  ).toString();
  const siteTitle = t("site.title");
  const siteDescription = t("site.description");
  const siteKeywords = t("site.keywords");
  const makeTitle = title ? `${title} | Describe Music` : siteTitle;
  return renderTemplate(_a || (_a = __template(['<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><!-- Favicon --><link rel="icon" type="image/x-icon" href="/images/logo/favicon/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/images/logo/favicon/favicon-32x32.png"><link rel="icon" type="image/png" sizes="16x16" href="/images/logo/favicon/favicon-16x16.png"><!-- Apple Touch Icon --><link rel="apple-touch-icon" sizes="180x180" href="/images/logo/app-icons/icon-192-rounded.png"><!-- PWA Icons --><link rel="manifest" href="/manifest.json"><meta name="generator"', '><meta name="keywords"', ">", '<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-HJL4M202R6"><\/script>', '<script type="text/javascript">\n      (function (c, l, a, r, i, t, y) {\n        c[a] =\n          c[a] ||\n          function () {\n            (c[a].q = c[a].q || []).push(arguments);\n          };\n        t = l.createElement(r);\n        t.async = 1;\n        t.src = "https://www.clarity.ms/tag/" + i;\n        y = l.getElementsByTagName(r)[0];\n        y.parentNode.insertBefore(t, y);\n      })(window, document, "clarity", "script", "sxmrkwyxg7");\n    <\/script>', '</head> <body> <!-- \u5206\u6790\u9875\u9762\u4E0D\u4F7F\u7528\u9ED8\u8BA4\u7684header\uFF0C\u7531AnalyzeAppWithAuth\u81EA\u5DF1\u7BA1\u7406 --> <main class="page-content" style="padding-top: 0 !important;"> ', " </main> ", " <!-- Load analyze export functions --> ", " ", " </body> </html>"])), addAttribute(Astro2.generator, "content"), addAttribute(siteKeywords, "content"), renderComponent($$result, "SEO", $$SEO, { "title": makeTitle, "description": description || siteDescription, "canonical": canonicalURL, "twitter": {
    creator: "@describemusic",
    site: "@describemusic",
    card: "summary_large_image"
  }, "openGraph": {
    basic: {
      url: canonicalURL,
      type: "website",
      title: makeTitle,
      image: resolvedImageWithDomain
    },
    image: {
      alt: "Describe Music AI-Powered Audio Analysis"
    }
  } }), renderScript($$result, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/AnalyzeLayout.astro?astro&type=script&index=0&lang.ts"), renderHead(), renderSlot($$result, $$slots["default"]), renderComponent($$result, "Footer", $$Footer, {}), renderScript($$result, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/AnalyzeLayout.astro?astro&type=script&index=1&lang.ts"), renderScript($$result, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/AnalyzeLayout.astro?astro&type=script&index=2&lang.ts"));
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/layouts/AnalyzeLayout.astro", void 0);

export { $$AnalyzeLayout as $ };
