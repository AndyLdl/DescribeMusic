/* empty css                                 */
import { b as createAstro, c as createComponent, m as maybeRenderHead, s as spreadAttributes, g as addAttribute, e as renderSlot, a as renderTemplate, r as renderComponent } from '../chunks/astro/server_bED4jumr.mjs';
import 'clsx';
/* empty css                                   */
import { $ as $$Container } from '../chunks/container_CSdxKEov.mjs';
import { $ as $$Layout } from '../chunks/Layout_DhNej8iM.mjs';
import { $ as $$Icon } from '../chunks/footer_CgJVMux7.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://describemusic.net");
const $$Button = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Button;
  const {
    size = "md",
    style = "primary",
    block,
    class: className,
    ...rest
  } = Astro2.props;
  const sizes = {
    md: "px-5 py-2.5",
    lg: "px-6 py-3"
  };
  const styles = {
    outline: "border-2 border-violet-500 hover:bg-violet-500 text-violet-400 hover:text-white bg-transparent",
    primary: "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 border-2 border-transparent shadow-lg hover:shadow-xl hover:shadow-violet-500/25"
  };
  return renderTemplate`${maybeRenderHead()}<button${spreadAttributes(rest)}${addAttribute([
    "rounded-xl text-center font-semibold transition-all duration-300 focus-visible:ring-2 ring-offset-2 ring-violet-500/50 focus:outline-none",
    block && "w-full",
    sizes[size],
    styles[style],
    className
  ], "class:list")}>${renderSlot($$result, $$slots["default"])} </button>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/ui/button.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$Contactform = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(["<!-- To make this contact form work, create your free access key from https://web3forms.com/\n     Then you will get all form submissions in your email inbox. -->", '<form action="https://api.web3forms.com/submit" method="POST" id="form" class="needs-validation" novalidate data-astro-cid-uwnxe3i2> <input type="hidden" name="access_key" value="74b58fda-cf65-4291-85ce-c0669fa42f39" data-astro-cid-uwnxe3i2> <!-- Web3Forms access key configured --> <input type="checkbox" class="hidden" style="display:none" name="botcheck" data-astro-cid-uwnxe3i2> <div class="mb-5" data-astro-cid-uwnxe3i2> <input type="text" placeholder="Full Name" required class="w-full px-4 py-3 border-2 placeholder:text-slate-400 bg-slate-800/50 text-white rounded-md outline-none focus:ring-4 border-slate-600 focus:border-violet-500 focus:ring-violet-500/20" name="name" data-astro-cid-uwnxe3i2> <div class="empty-feedback invalid-feedback text-red-400 text-sm mt-1" data-astro-cid-uwnxe3i2>\nPlease provide your full name.\n</div> </div> <div class="mb-5" data-astro-cid-uwnxe3i2> <label for="email_address" class="sr-only" data-astro-cid-uwnxe3i2>Email Address</label><input id="email_address" type="email" placeholder="Email Address" name="email" required class="w-full px-4 py-3 border-2 placeholder:text-slate-400 bg-slate-800/50 text-white rounded-md outline-none focus:ring-4 border-slate-600 focus:border-violet-500 focus:ring-violet-500/20" data-astro-cid-uwnxe3i2> <div class="empty-feedback text-red-400 text-sm mt-1" data-astro-cid-uwnxe3i2>\nPlease provide your email address.\n</div> <div class="invalid-feedback text-red-400 text-sm mt-1" data-astro-cid-uwnxe3i2>\nPlease provide a valid email address.\n</div> </div> <div class="mb-3" data-astro-cid-uwnxe3i2> <textarea name="message" required placeholder="Your Message" class="w-full px-4 py-3 border-2 placeholder:text-slate-400 bg-slate-800/50 text-white rounded-md outline-none h-36 focus:ring-4 border-slate-600 focus:border-violet-500 focus:ring-violet-500/20 resize-none" data-astro-cid-uwnxe3i2></textarea> <div class="empty-feedback invalid-feedback text-red-400 text-sm mt-1" data-astro-cid-uwnxe3i2>\nPlease enter your message.\n</div> </div> ', ' <div id="result" class="mt-3 text-center" data-astro-cid-uwnxe3i2></div> </form>  <script>\n  const form = document.getElementById("form");\n  const result = document.getElementById("result");\n\n  form.addEventListener("submit", function (e) {\n    e.preventDefault();\n    form.classList.add("was-validated");\n    if (!form.checkValidity()) {\n      form.querySelectorAll(":invalid")[0].focus();\n      return;\n    }\n    const formData = new FormData(form);\n    const object = Object.fromEntries(formData);\n    const json = JSON.stringify(object);\n\n    result.innerHTML = "Sending...";\n\n    fetch("https://api.web3forms.com/submit", {\n      method: "POST",\n      headers: {\n        "Content-Type": "application/json",\n        Accept: "application/json",\n      },\n      body: json,\n    })\n      .then(async (response) => {\n        let json = await response.json();\n        if (response.status == 200) {\n          result.classList.add("text-green-500");\n          result.innerHTML = json.message;\n        } else {\n          console.log(response);\n          result.classList.add("text-red-500");\n          result.innerHTML = json.message;\n        }\n      })\n      .catch((error) => {\n        console.log(error);\n        result.innerHTML = "Something went wrong!";\n      })\n      .then(function () {\n        form.reset();\n        form.classList.remove("was-validated");\n        setTimeout(() => {\n          result.style.display = "none";\n        }, 5000);\n      });\n  });\n<\/script>'])), maybeRenderHead(), renderComponent($$result, "Button", $$Button, { "type": "submit", "size": "lg", "block": true, "data-astro-cid-uwnxe3i2": true }, { "default": async ($$result2) => renderTemplate`Send Message` }));
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/contactform.astro", void 0);

const $$Contact = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Contact Describe Music - Get Support for AI Audio Analysis", "description": "Contact Describe Music for support, sales inquiries, or technical questions about our AI-powered audio analysis platform. Get help with music, voice, and sound analysis features from our support team." }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="relative bg-gradient-to-b from-slate-900 to-slate-950 -mt-20 pt-32 pb-20"> <!-- Decorative background elements --> <div class="absolute inset-0 overflow-hidden"> <div class="absolute top-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div> <div class="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div> </div> ${renderComponent($$result2, "Container", $$Container, {}, { "default": ($$result3) => renderTemplate` <div class="relative text-center max-w-4xl mx-auto"> <h1 class="text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
Contact Us
</h1> <p class="text-xl text-slate-300 leading-relaxed">
We're here to help with all your audio analysis needs
</p> </div> ` })} </div> ${renderComponent($$result2, "Container", $$Container, {}, { "default": ($$result3) => renderTemplate` <div class="py-20"> <!-- Main Contact Section --> <div class="grid lg:grid-cols-3 gap-12 max-w-6xl mx-auto"> <!-- Contact Info Sidebar --> <div class="lg:col-span-1"> <!-- Email Contact Card --> <div class="text-center p-8 bg-slate-800/30 rounded-xl border border-slate-700 mb-8"> <div class="w-16 h-16 mx-auto mb-6 bg-violet-500/20 rounded-xl flex items-center justify-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:envelope-20-solid", "class": "w-8 h-8 text-violet-400" })} </div> <h3 class="text-xl font-semibold text-white mb-4">Contact Us</h3> <p class="text-slate-300 mb-4">
For support, sales inquiries, partnerships, and all questions
</p> <a href="mailto:support@describemusic.net" class="text-violet-400 hover:text-violet-300 transition-colors font-medium">
support@describemusic.net
</a> </div> <!-- Quick Info --> <div class="space-y-6"> <div class="flex items-center gap-4"> <div class="w-12 h-12 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:clock-20-solid", "class": "w-6 h-6 text-violet-400" })} </div> <div> <h4 class="text-white font-medium">Response Time</h4> <p class="text-slate-400 text-sm">Within 24 hours</p> </div> </div> <div class="flex items-center gap-4"> <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:calendar-days-20-solid", "class": "w-6 h-6 text-blue-400" })} </div> <div> <h4 class="text-white font-medium">Support Hours</h4> <p class="text-slate-400 text-sm">Mon-Fri, 9AM-6PM PST</p> </div> </div> <div class="flex items-center gap-4"> <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:users-20-solid", "class": "w-6 h-6 text-green-400" })} </div> <div> <h4 class="text-white font-medium">Community</h4> <div class="flex gap-3 mt-1"> <a href="https://discord.gg/describemusic" class="text-green-400 hover:text-green-300 transition-colors text-sm">
Discord
</a> <a href="https://github.com/describemusic" class="text-green-400 hover:text-green-300 transition-colors text-sm">
GitHub
</a> </div> </div> </div> <div class="flex items-center gap-4"> <div class="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:book-open-20-solid", "class": "w-6 h-6 text-orange-400" })} </div> <div> <h4 class="text-white font-medium">Help Articles</h4> <a href="/blog" class="text-orange-400 hover:text-orange-300 transition-colors text-sm">
View Articles →
</a> </div> </div> </div> </div> <!-- Contact Form --> <div class="lg:col-span-2"> <h2 class="text-3xl font-bold text-white mb-6">Send us a message</h2> <p class="text-lg text-slate-300 mb-8">
Have a question about our features or pricing? Need help with a
            technical issue? Fill out the form below and we'll get back to you
            within 24 hours.
</p> ${renderComponent($$result3, "Contactform", $$Contactform, {})} </div> </div> <!-- FAQ Section --> <div class="mt-20"> <div class="text-center mb-12"> <h2 class="text-3xl font-bold text-white mb-4">
Frequently Asked Questions
</h2> <p class="text-xl text-slate-300">
Quick answers to common questions
</p> </div> <div class="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto"> <div class="p-6 bg-slate-800/30 rounded-xl border border-slate-700"> <h3 class="text-lg font-semibold text-white mb-3">
How accurate is the audio analysis?
</h3> <p class="text-slate-300">
Our AI models achieve 95%+ accuracy for music genre classification
              and 90%+ for voice emotion detection, continuously improving with
              new data.
</p> </div> <div class="p-6 bg-slate-800/30 rounded-xl border border-slate-700"> <h3 class="text-lg font-semibold text-white mb-3">
What file formats do you support?
</h3> <p class="text-slate-300">
We support all major audio formats including MP3, WAV, FLAC, AAC,
              OGG, M4A, and more. Files up to 50MB are supported.
</p> </div> <div class="p-6 bg-slate-800/30 rounded-xl border border-slate-700"> <h3 class="text-lg font-semibold text-white mb-3">
Is my audio data secure?
</h3> <p class="text-slate-300">
Yes, we process files securely and never store them permanently.
              All uploads are encrypted and deleted after analysis completion.
</p> </div> <div class="p-6 bg-slate-800/30 rounded-xl border border-slate-700"> <h3 class="text-lg font-semibold text-white mb-3">
How fast is the analysis?
</h3> <p class="text-slate-300">
Most audio files are analyzed within seconds. Processing time
              depends on file size and complexity, but we optimize for speed
              without compromising accuracy.
</p> </div> </div> </div> </div> ` })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/contact.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/contact.astro";
const $$url = "/contact";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Contact,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
