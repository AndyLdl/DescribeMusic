/* empty css                                 */
import { c as createComponent, a as renderTemplate, r as renderComponent, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_bED4jumr.mjs';
import { $ as $$Layout } from '../chunks/Layout_DhNej8iM.mjs';
import 'clsx';
import { $ as $$Icon } from '../chunks/footer_CgJVMux7.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(cooked.slice()) }));
var _a;
const $$01Hero = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate(_a || (_a = __template(["", '<div id="hero-section"> ', ' </div> <script src="/scripts/visualizer.js"><\/script>'])), maybeRenderHead(), renderComponent($$result, "HeroSimpleWithProvider", null, { "client:only": "react", "client:component-hydration": "only", "client:component-path": "/Users/andy/VSCodeProjects/DescribeMusic/src/components/HeroSimple.tsx", "client:component-export": "HeroSimpleWithProvider" }));
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/01_Hero.astro", void 0);

const $$03Features = createComponent(($$result, $$props, $$slots) => {
  const features = [
    {
      icon: "music-note",
      image: "/images/features/feature_musical_analysis.jpg",
      title: "Describe Music with AI Analysis",
      description: "Learn how to describe music automatically. Identify mood, genre, instruments, BPM, and key with our AI music description tool."
    },
    {
      icon: "voice",
      image: "/images/features/feature_voice_analysis.jpg",
      title: "Voice & Speech Analysis",
      description: "Analyze speaker emotion, gender, and speech clarity."
    },
    {
      icon: "sound-waves",
      image: "/images/features/feature_sound_effect.jpg",
      title: "Sound Effect Recognition",
      description: "Recognize everything from nature sounds to urban noises."
    },
    {
      icon: "tags",
      image: "/images/features/feature_seo_tags.jpg",
      title: "AI Music Description Tags",
      description: "Automatically generate music description tags and SEO-friendly keywords to describe music effectively."
    },
    {
      icon: "code",
      image: "/images/features/feature_export_center.jpg",
      title: "Export & Share",
      description: "Export analysis results as JSON, CSV, or text reports and share your insights.",
      special: false
    },
    {
      icon: "files",
      image: "/images/features/feature_history.jpg",
      // TODO: 需要创建 feature_history.png
      title: "Analysis History",
      description: "Keep track of all your previous analyses with automatic history saving.",
      special: false
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="features" class="relative py-32 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/30 overflow-hidden"> <!-- Enhanced musical background elements --> <div class="absolute inset-0 opacity-20"> <div class="absolute top-32 right-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl"></div> <div class="absolute bottom-32 left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div> <!-- Floating musical notes --> <div class="absolute top-20 left-1/4 text-violet-400/20 text-6xl animate-bounce" style="animation-delay: 0s; animation-duration: 3s;">♪</div> <div class="absolute top-40 right-1/3 text-blue-400/20 text-4xl animate-bounce" style="animation-delay: 1s; animation-duration: 4s;">♫</div> <div class="absolute bottom-40 left-1/3 text-purple-400/20 text-5xl animate-bounce" style="animation-delay: 2s; animation-duration: 3.5s;">♬</div> <div class="absolute bottom-20 right-1/4 text-violet-400/20 text-3xl animate-bounce" style="animation-delay: 1.5s; animation-duration: 4.5s;">♩</div> <!-- Audio waveform decoration --> <div class="absolute top-1/2 left-10 transform -translate-y-1/2 opacity-10"> <div class="flex items-end gap-1 h-32"> <div class="w-1 bg-violet-400 rounded-full animate-pulse" style="height: 20%; animation-delay: 0s;"></div> <div class="w-1 bg-blue-400 rounded-full animate-pulse" style="height: 60%; animation-delay: 0.1s;"></div> <div class="w-1 bg-purple-400 rounded-full animate-pulse" style="height: 40%; animation-delay: 0.2s;"></div> <div class="w-1 bg-violet-400 rounded-full animate-pulse" style="height: 80%; animation-delay: 0.3s;"></div> <div class="w-1 bg-blue-400 rounded-full animate-pulse" style="height: 30%; animation-delay: 0.4s;"></div> <div class="w-1 bg-purple-400 rounded-full animate-pulse" style="height: 70%; animation-delay: 0.5s;"></div> <div class="w-1 bg-violet-400 rounded-full animate-pulse" style="height: 50%; animation-delay: 0.6s;"></div> <div class="w-1 bg-blue-400 rounded-full animate-pulse" style="height: 90%; animation-delay: 0.7s;"></div> </div> </div> <!-- Right side waveform --> <div class="absolute top-1/3 right-10 transform -translate-y-1/2 opacity-10 rotate-180"> <div class="flex items-end gap-1 h-24"> <div class="w-1 bg-blue-400 rounded-full animate-pulse" style="height: 40%; animation-delay: 0.8s;"></div> <div class="w-1 bg-violet-400 rounded-full animate-pulse" style="height: 70%; animation-delay: 0.9s;"></div> <div class="w-1 bg-purple-400 rounded-full animate-pulse" style="height: 30%; animation-delay: 1s;"></div> <div class="w-1 bg-blue-400 rounded-full animate-pulse" style="height: 85%; animation-delay: 1.1s;"></div> <div class="w-1 bg-violet-400 rounded-full animate-pulse" style="height: 45%; animation-delay: 1.2s;"></div> <div class="w-1 bg-purple-400 rounded-full animate-pulse" style="height: 65%; animation-delay: 1.3s;"></div> </div> </div> </div> <div class="max-w-6xl mx-auto px-6 relative z-10"> <!-- Enhanced Section Header --> <div class="text-center mb-24 animate-on-scroll"> <div class="relative inline-block mb-8"> <!-- Musical decorations around title --> <div class="absolute -top-8 -left-8 text-violet-400/30 text-3xl animate-pulse" style="animation-delay: 0.5s;">♪</div> <div class="absolute -top-6 -right-12 text-blue-400/30 text-2xl animate-pulse" style="animation-delay: 1.5s;">♫</div> <div class="absolute -bottom-8 -left-6 text-purple-400/30 text-2xl animate-pulse" style="animation-delay: 2.5s;">♬</div> <div class="absolute -bottom-6 -right-8 text-violet-400/30 text-xl animate-pulse" style="animation-delay: 3.5s;">♩</div> <h2 class="text-5xl md:text-6xl font-bold tracking-tight"> <span class="bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
Unlock Every Detail
</span> <br> <span class="bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
in Your Audio
</span> </h2> <!-- Enhanced decorative line with waveform pattern --> <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full opacity-60"></div> <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-px opacity-20"> <div class="w-px h-2 bg-violet-400 animate-pulse" style="animation-delay: 0s;"></div> <div class="w-px h-3 bg-blue-400 animate-pulse" style="animation-delay: 0.1s;"></div> <div class="w-px h-1 bg-purple-400 animate-pulse" style="animation-delay: 0.2s;"></div> <div class="w-px h-4 bg-violet-400 animate-pulse" style="animation-delay: 0.3s;"></div> <div class="w-px h-2 bg-blue-400 animate-pulse" style="animation-delay: 0.4s;"></div> <div class="w-px h-3 bg-purple-400 animate-pulse" style="animation-delay: 0.5s;"></div> <div class="w-px h-1 bg-violet-400 animate-pulse" style="animation-delay: 0.6s;"></div> <div class="w-px h-2 bg-blue-400 animate-pulse" style="animation-delay: 0.7s;"></div> </div> </div> <p class="text-xl md:text-2xl text-slate-300/90 max-w-4xl mx-auto leading-relaxed">
Discover how to describe music with AI using our cutting-edge technology that makes
<span class="text-violet-400 font-semibold">music description incredibly accurate and comprehensive</span> </p> </div> <div class="space-y-32"> ${features.map((feature, index) => renderTemplate`<div class="grid lg:grid-cols-2 gap-16 items-center animate-on-scroll group"> <!-- Feature Image (Left/Right alternating) --> <div${addAttribute([{ "lg:order-last": index % 2 === 0 }], "class:list")}> <div class="relative"> <!-- Enhanced background glow --> <div class="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-blue-500/20 blur-3xl group-hover:blur-2xl transition-all duration-500"></div> <!-- Image Panel --> <div class="relative glass-pane aspect-square p-4 group-hover:bg-white/[0.08] transition-all duration-500 border-white/10 group-hover:border-white/20 overflow-hidden"> <!-- Musical background pattern --> <div class="absolute inset-0 opacity-20"> <!-- Mini frequency bars --> <div class="absolute bottom-4 left-4 flex items-end gap-1"> <div class="w-1 h-4 bg-violet-400/60 rounded-full animate-pulse" style="animation-delay: 0s;"></div> <div class="w-1 h-6 bg-blue-400/60 rounded-full animate-pulse" style="animation-delay: 0.1s;"></div> <div class="w-1 h-3 bg-purple-400/60 rounded-full animate-pulse" style="animation-delay: 0.2s;"></div> <div class="w-1 h-8 bg-violet-400/60 rounded-full animate-pulse" style="animation-delay: 0.3s;"></div> <div class="w-1 h-5 bg-blue-400/60 rounded-full animate-pulse" style="animation-delay: 0.4s;"></div> <div class="w-1 h-7 bg-purple-400/60 rounded-full animate-pulse" style="animation-delay: 0.5s;"></div> </div> <!-- Floating mini notes --> <div class="absolute top-4 right-4 text-violet-400/50 text-lg animate-pulse" style="animation-delay: 1s;">♪</div> <div class="absolute bottom-8 right-8 text-blue-400/50 text-sm animate-pulse" style="animation-delay: 2s;">♫</div> <!-- Additional decorative elements --> <div class="absolute top-8 left-8 text-purple-400/40 text-xs animate-pulse" style="animation-delay: 1.5s;">♬</div> </div> <!-- Feature Image --> <div class="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300"> <img${addAttribute(feature.image, "src")}${addAttribute(feature.title, "alt")} class="w-full h-full object-cover rounded-lg shadow-2xl"> <!-- Image overlay for better text readability --> <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg"></div> <!-- Feature title overlay --> <div class="absolute bottom-4 left-4 right-4"> <h4 class="text-lg font-bold text-white mb-1 drop-shadow-lg"> ${feature.title} </h4> ${feature.special && renderTemplate`<div class="inline-block px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full">
Coming Soon
</div>`} </div> </div> </div> </div> </div> <!-- Feature Description (Right/Left alternating) --> <div> <div class="relative"> <!-- Enhanced glass pane with hover effects --> <div class="glass-pane p-10 group-hover:bg-white/[0.08] transition-all duration-500 border-white/10 group-hover:border-white/20"> <h3 class="text-3xl md:text-4xl font-bold tracking-tight text-white mb-6 group-hover:text-white/95 transition-colors"> ${feature.title} </h3> <p class="text-slate-300/80 text-lg leading-relaxed group-hover:text-slate-300/90 transition-colors mb-6"> ${feature.description} </p> <!-- Enhanced feature details --> <div class="space-y-3"> ${feature.icon === "music-note" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">Genre Detection</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">BPM Analysis</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Key Detection</span> </div>`} ${feature.icon === "voice" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">Emotion Analysis</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">Gender Detection</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Clarity Score</span> </div>`} ${feature.icon === "sound-waves" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">Nature Sounds</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">Urban Noise</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Event Detection</span> </div>`} ${feature.icon === "tags" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">SEO Tags</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">Auto Keywords</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Smart Labels</span> </div>`} ${feature.icon === "code" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">JSON Export</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">CSV Export</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Share Links</span> </div>`} ${feature.icon === "files" && renderTemplate`<div class="flex flex-wrap gap-2"> <span class="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">Auto Save</span> <span class="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full">Quick Access</span> <span class="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">Search History</span> </div>`} </div> <!-- Decorative gradient line --> <div class="mt-8 w-16 h-1 bg-gradient-to-r from-violet-400 to-blue-400 rounded-full opacity-60 group-hover:opacity-100 group-hover:w-24 transition-all duration-500"></div> </div> <!-- Subtle glow effect on hover --> <div class="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div> </div> </div> </div>`)} </div> </div></section>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/03_Features.astro", void 0);

const $$03AUseCases = createComponent(($$result, $$props, $$slots) => {
  const useCases = [
    {
      title: "For Podcasters & YouTubers",
      points: [
        "Describe music for show notes & video chapters",
        "Check audio quality before publishing",
        "Find the perfect background music with AI music description"
      ]
    },
    {
      title: "For Musicians & Producers",
      points: [
        "Describe music structure of popular hits automatically",
        "Get unbiased feedback on your demos with AI music analysis",
        "Discover new melodic or rhythmic ideas through music description"
      ]
    },
    {
      title: "For Marketers & Agencies",
      points: [
        "Describe music to ensure ad music is brand-safe",
        "Write compelling copy based on AI music description and mood",
        "Find audio for social media campaigns using music description tags"
      ]
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="use-cases" class="py-24"> <div class="max-w-5xl mx-auto px-6"> <h2 class="text-4xl font-medium tracking-tight text-center animate-on-scroll">
Who Uses Describe Music for AI Music Description?
</h2> <div class="grid md:grid-cols-3 gap-8 mt-16"> ${useCases.map((useCase, index) => renderTemplate`<div class="glass-pane p-8 animate-on-scroll"${addAttribute(`--scroll-delay: ${index * 150}ms`, "style")}> <h3 class="text-xl font-bold text-white">${useCase.title}</h3> <ul class="mt-4 space-y-2"> ${useCase.points.map((point) => renderTemplate`<li class="flex items-start gap-2 text-slate-400"> <span class="text-primary mt-1">&check;</span> <span>${point}</span> </li>`)} </ul> </div>`)} </div> </div> </section>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/03a_UseCases.astro", void 0);

const $$03BFAQ = createComponent(($$result, $$props, $$slots) => {
  const faqs = [
    {
      q: "What is Describe Music and how does it describe music?",
      a: "Describe Music is an AI-powered platform that automatically describes music by analyzing audio files to provide detailed music descriptions, technical data, and creative insights. Our AI can describe music genre, mood, tempo, and instruments instantly."
    },
    {
      q: "How accurate is the music description analysis?",
      a: "Our AI music description is powered by advanced models, providing highly accurate results for describing music across a wide range of genres and styles. However, like any AI, it should be used as a powerful assistant for music description, not an infallible judge."
    },
    {
      q: "Can I use Describe Music to describe music for my content?",
      a: "Yes! Describe Music is perfect for content creators who need to describe music for their projects. Our AI music description helps you generate accurate music descriptions for show notes, social media, and marketing content."
    },
    {
      q: "What audio formats can I use to describe music?",
      a: "We support all major audio formats for music description, including MP3, WAV, FLAC, AAC, and more. Simply upload your audio file and our AI will describe the music instantly."
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="faq" class="py-24"> <div class="max-w-3xl mx-auto px-6"> <h2 class="text-4xl font-medium tracking-tight text-center animate-on-scroll">
Frequently Asked Questions About Describe Music
</h2> <div class="mt-12 space-y-4"> ${faqs.map((faq, index) => renderTemplate`<details class="glass-pane p-6 group animate-on-scroll"${addAttribute(`--scroll-delay: ${index * 100}ms`, "style")}> <summary class="flex items-center justify-between cursor-pointer font-semibold text-lg text-white"> ${faq.q} <span class="transition-transform duration-300 group-open:rotate-180">
&darr;
</span> </summary> <p class="mt-4 text-slate-400">${faq.a}</p> </details>`)} </div> </div> </section>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/03b_FAQ.astro", void 0);

const $$04SocialProof = createComponent(($$result, $$props, $$slots) => {
  const testimonials = [
    {
      name: "Alex Rivera",
      title: "Podcast Producer",
      avatar: "/images/avatars/alex.jpg",
      quote: "Describe Music has become an indispensable part of my workflow. The AI summary is shockingly accurate and saves me hours of manual logging every week."
    },
    {
      name: "Samantha Chen",
      title: "Indie Game Developer",
      avatar: "/images/avatars/samantha.jpg",
      quote: "As a solo developer, I wear many hats. This tool's ability to quickly categorize and tag my sound effects library is a total game-changer. The API is a dream to work with."
    },
    {
      name: "David Lee",
      title: "Musician & Composer",
      avatar: "/images/avatars/david.jpg",
      quote: "I was skeptical at first, but the instrument and key analysis is incredibly accurate. It's like having a second pair of perfectly trained ears in the studio."
    }
  ];
  return renderTemplate`${maybeRenderHead()}<section id="social-proof" class="py-24"> <div class="max-w-5xl mx-auto px-6 text-center"> <h2 class="text-3xl md:text-4xl font-medium tracking-tight animate-on-scroll">
Loved by creators and developers
</h2> <div class="mt-16 grid md:grid-cols-1 lg:grid-cols-3 gap-8"> ${testimonials.map((testimonial, index) => renderTemplate`<div class="glass-pane p-8 animate-on-scroll"${addAttribute(`--scroll-delay: ${index * 150}ms`, "style")}> <p class="text-slate-300 before:content-['“'] after:content-['”']"> ${testimonial.quote} </p> <div class="flex items-center gap-4 mt-6"> <div class="w-12 h-12 rounded-full bg-slate-700 flex-shrink-0">  </div> <div> <p class="font-semibold text-white">${testimonial.name}</p> <p class="text-sm text-slate-400">${testimonial.title}</p> </div> </div> </div>`)} </div> </div> </section>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/04_SocialProof.astro", void 0);

const $$05CTA = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section id="cta" class="py-24"> <div class="max-w-5xl mx-auto px-6 text-center"> <!-- Limited Time Banner --> <div class="mb-8 animate-on-scroll"> <div class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full backdrop-blur-xl"> ${renderComponent($$result, "Icon", $$Icon, { "name": "heroicons:clock-20-solid", "class": "w-5 h-5 text-orange-400" })} <span class="text-lg font-semibold text-orange-300">⏰ Limited Time Beta - Everything Free!</span> ${renderComponent($$result, "Icon", $$Icon, { "name": "heroicons:sparkles-20-solid", "class": "w-5 h-5 text-orange-400" })} </div> </div> <h2 class="text-5xl md:text-7xl font-thin tracking-tighter text-white/90 animate-on-scroll">
Ready to describe music with AI?
</h2> <p class="mt-6 text-xl text-slate-300 max-w-2xl mx-auto animate-on-scroll" style="--scroll-delay: 100ms;">
Upload any audio file and get detailed AI music description results in
      seconds. Learn how to describe music automatically with our advanced AI
      technology.
</p> <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 animate-on-scroll" style="--scroll-delay: 200ms;"> <a href="/analyze/" class="inline-flex items-center justify-center gap-3 px-8 py-4 text-lg md:text-xl font-medium text-white bg-primary rounded-full hover:bg-primary-600 transition duration-300 group">
Start Describing Music with AI
${renderComponent($$result, "Icon", $$Icon, { "name": "heroicons:arrow-right-20-solid", "class": "w-6 h-6 transition-transform group-hover:translate-x-1.5" })} </a> </div> </div> </section>`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/05_CTA.astro", void 0);

const $$06BadgeCarousel = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="py-8 border-t border-slate-800/50" data-astro-cid-3ljhpv7s> <div class="container mx-auto px-4" data-astro-cid-3ljhpv7s> <div class="text-center mb-6" data-astro-cid-3ljhpv7s> <p class="text-sm text-slate-400" data-astro-cid-3ljhpv7s>Featured on</p> </div> <div class="badge-carousel-container overflow-hidden" data-astro-cid-3ljhpv7s> <div class="badge-carousel flex items-center gap-8 animate-scroll" data-astro-cid-3ljhpv7s> <!-- First set of badges --> <a href="https://startupfa.me/s/describe-music?utm_source=www.describemusic.net" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://startupfa.me/badges/featured-badge.webp" alt="Featured on Startup Fame" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://dang.ai/" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png" alt="Dang.ai" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://tinylaunch.com" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://tinylaunch.com/tinylaunch_badge_launching_soon.svg" alt="TinyLaunch Badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://www.toolpilot.ai/" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="/images/badge/toolpilot_badge.png" alt="Toolpilot Badge" class="h-7 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 rounded-sm" data-astro-cid-3ljhpv7s> </a> <a href="https://goodfirms.co/" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="/images/badge/good_firms.svg" alt="Good Firms Badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://turbo0.com/item/describe-music" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://img.turbo0.com/badge-listed-light.svg" alt="Listed on Turbo0" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://fazier.com/launches/describemusic.net" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=neutral" alt="Fazier badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://indie.deals?ref=https%3A%2F%2Fdescribemusic.net%2F" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <div class="opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> <svg width="96" height="32" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" class="indie-deals-badge" data-astro-cid-3ljhpv7s> <defs data-astro-cid-3ljhpv7s> <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%" data-astro-cid-3ljhpv7s> <stop offset="0%" stop-color="#ffffff" data-astro-cid-3ljhpv7s></stop> <stop offset="100%" stop-color="#e6f0fc" data-astro-cid-3ljhpv7s></stop> </linearGradient> </defs> <rect width="120" height="40" rx="10" fill="url(#badgeGradient)" data-astro-cid-3ljhpv7s></rect> <rect x="0.75" y="0.75" width="118.5" height="38.5" rx="9.25" fill="none" stroke="#0070f3" stroke-width="1.5" stroke-opacity="0.3" data-astro-cid-3ljhpv7s></rect> <image href="https://indie.deals/logo_badge.png" x="9.6" y="8" width="24" height="24" preserveAspectRatio="xMidYMid meet" filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.15))" data-astro-cid-3ljhpv7s></image> <text x="80.4" y="15.2" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.2" font-weight="normal" fill="#4b5563" letter-spacing="0.01em" data-astro-cid-3ljhpv7s>Find us on</text> <text x="80.4" y="26" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.8" font-weight="bold" fill="#0070f3" letter-spacing="0.01em" data-astro-cid-3ljhpv7s>Indie.Deals</text> </svg> </div> </a> <a href="https://launchigniter.com/product/ai-describe-music?ref=badge-ai-describe-music" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://launchigniter.com/api/badge/ai-describe-music?theme=light" alt="Featured on LaunchIgniter" width="212" height="55" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://twelve.tools" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://twelve.tools/badge0-dark.svg" alt="Featured on Twelve Tools" width="200" height="54" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://findly.tools/ai-describe-music?utm_source=ai-describe-music" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on findly.tools" width="150" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://goodaitools.com" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://goodaitools.com/assets/images/badge.png" alt="Good AI Tools" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <!-- Duplicate set for seamless loop --> <a href="https://startupfa.me/s/describe-music?utm_source=www.describemusic.net" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://startupfa.me/badges/featured-badge.webp" alt="Featured on Startup Fame" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://dang.ai/" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://cdn.prod.website-files.com/63d8afd87da01fb58ea3fbcb/6487e2868c6c8f93b4828827_dang-badge.png" alt="Dang.ai" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://tinylaunch.com" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://tinylaunch.com/tinylaunch_badge_launching_soon.svg" alt="TinyLaunch Badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://www.toolpilot.ai/" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="/images/badge/toolpilot_badge.png" alt="Toolpilot Badge" class="h-7 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 rounded-sm" data-astro-cid-3ljhpv7s> </a> <a href="https://goodfirms.co/" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="/images/badge/good_firms.svg" alt="Good Firms Badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://turbo0.com/item/describe-music" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://img.turbo0.com/badge-listed-light.svg" alt="Listed on Turbo0" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://fazier.com/launches/describemusic.net" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=neutral" alt="Fazier badge" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://indie.deals?ref=https%3A%2F%2Fdescribemusic.net%2F" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <div class="opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> <svg width="96" height="32" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" class="indie-deals-badge" data-astro-cid-3ljhpv7s> <defs data-astro-cid-3ljhpv7s> <linearGradient id="badgeGradient2" x1="0%" y1="0%" x2="100%" y2="100%" data-astro-cid-3ljhpv7s> <stop offset="0%" stop-color="#ffffff" data-astro-cid-3ljhpv7s></stop> <stop offset="100%" stop-color="#e6f0fc" data-astro-cid-3ljhpv7s></stop> </linearGradient> </defs> <rect width="120" height="40" rx="10" fill="url(#badgeGradient2)" data-astro-cid-3ljhpv7s></rect> <rect x="0.75" y="0.75" width="118.5" height="38.5" rx="9.25" fill="none" stroke="#0070f3" stroke-width="1.5" stroke-opacity="0.3" data-astro-cid-3ljhpv7s></rect> <image href="https://indie.deals/logo_badge.png" x="9.6" y="8" width="24" height="24" preserveAspectRatio="xMidYMid meet" filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.15))" data-astro-cid-3ljhpv7s></image> <text x="80.4" y="15.2" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.2" font-weight="normal" fill="#4b5563" letter-spacing="0.01em" data-astro-cid-3ljhpv7s>Find us on</text> <text x="80.4" y="26" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.8" font-weight="bold" fill="#0070f3" letter-spacing="0.01em" data-astro-cid-3ljhpv7s>Indie.Deals</text> </svg> </div> </a> <a href="https://launchigniter.com/product/ai-describe-music?ref=badge-ai-describe-music" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://launchigniter.com/api/badge/ai-describe-music?theme=light" alt="Featured on LaunchIgniter" width="212" height="55" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://twelve.tools" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://twelve.tools/badge0-dark.svg" alt="Featured on Twelve Tools" width="200" height="54" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://findly.tools/ai-describe-music?utm_source=ai-describe-music" target="_blank" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://findly.tools/badges/findly-tools-badge-light.svg" alt="Featured on findly.tools" width="150" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> <a href="https://goodaitools.com" target="_blank" rel="noopener" class="badge-item flex-shrink-0" data-astro-cid-3ljhpv7s> <img src="https://goodaitools.com/assets/images/badge.png" alt="Good AI Tools" class="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" data-astro-cid-3ljhpv7s> </a> </div> </div> </div> </section> `;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/components/sections/06_BadgeCarousel.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, {}, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Section01_Hero", $$01Hero, {})} ${renderComponent($$result2, "Section03_Features", $$03Features, {})} ${renderComponent($$result2, "Section03a_UseCases", $$03AUseCases, {})} ${renderComponent($$result2, "Section03b_FAQ", $$03BFAQ, {})} ${renderComponent($$result2, "Section04_SocialProof", $$04SocialProof, {})} ${renderComponent($$result2, "Section05_CTA", $$05CTA, {})} ${renderComponent($$result2, "Section06_BadgeCarousel", $$06BadgeCarousel, {})} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/index.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
