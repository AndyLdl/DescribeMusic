# Describe Music - MVP 实施方案 (V5.4)

**项目名称**: Describe Music - 最小可行性产品 (MVP)
**版本**: 5.4
**状态**: **已批准，待执行**
**核心目标**: 启动一个功能专注、体验惊艳的 MVP，通过“首页即时体验模块”和清晰的“适用场景/FAQ”最大化降低用户跳出率，验证市场对 AI 音频分析的核心需求，并为未来的社区化运营和全球化扩展植入种子。

---

## 1. 战略与增长 (Strategy & Growth)

*   **1.1. 市场与内容策略**:
    *   **1.1.1. SEO 关键词**:
        *   **核心**: `Describe Music`
        *   **次要**: `describe audio`, `describe voice`, `AI music analysis`, `audio recognition API`, `music analysis tool`, `voice emotion analysis`
    *   **1.1.2. 关键词整合策略**:
        *   **目标**: 确保核心关键词 "Describe Music" 的自然覆盖率在 1-2% 左右，避免过度堆砌。
        *   **主要位置**: 必须出现在首页 `<h1>` 标签、网站全局 `<title>` 标签和Meta Description中。
        *   **自然融入**: 在各页面（尤其是首页、关于页）的介绍性段落中，自然地使用品牌名作为主语。例如，使用“Describe Music can help you...”而不是“The tool can help you...”。
        *   **内容应用**: 在博客文章的标题、开头和结尾段落中，当上下文合适时，应包含 "Describe Music"。
    *   **1.1.3. 博客内容规格**: 所有文章创建于 `src/content/blog/en/` 目录下。撰写并发布以下三篇具体文章，并确保遵循关键词整合策略。
        1.  `why-ai-music-analysis-is-a-game-changer.md`
        2.  `how-to-describe-audio-for-better-seo.md`
        3.  `a-developers-guide-to-understanding-audio-data.md`

## 2. 架构设计 (Architecture & Design)

*   **2.1. 国际化 (i18n) 架构**:
    *   **策略**: 从第一天起就为全球化做准备，构建支持多语言的架构基础。
    *   **实现**: 采用基于路径的路由、JSON 文件管理 UI 文本、按语言组织博客内容，并在页脚预留语言切换器组件。

*   **2.2. 关键页面设计与规格 (Key Page Design & Specs)**
    *   **2.2.1. 首页 (`/`) - 营销与即时体验**:
        *   **页面结构**: Hero Section -> Instant Experience Module -> Features Section -> **Use Cases Section** -> **FAQ Section** -> Final CTA -> Footer.
        *   **H1 标题**: `Describe Music: Your AI-Powered Audio Analysis Engine`
        *   **即时体验模块**: 提供 3 个预设样本按钮，瞬间展示预加载的结果摘要。
        *   **功能区 (Features Section)**:
            *   **H2 标题**: `Unlock Every Detail in Your Audio`
            *   **布局**: 三列网格，展示六个功能卡片。
            *   **卡片 1**: **图标**: `music-note`. **标题**: `In-depth Music Analysis`. **描述**: `Identify mood, genre, instruments, BPM, and key.`
            *   **卡片 2**: **图标**: `voice`. **标题**: `Voice & Speech Analysis`. **描述**: `Analyze speaker emotion, gender, and speech clarity.`
            *   **卡片 3**: **图标**: `sound-waves`. **标题**: `Sound Effect Recognition`. **描述**: `Recognize everything from nature sounds to urban noises.`
            *   **卡片 4**: **图标**: `tags`. **标题**: `AI-Powered Tagging`. **描述**: `Automatically generate SEO-friendly and searchable tags.`
            *   **卡片 5**: **图标**: `code`. **标题**: `Developer API`. **描述**: `Integrate our analysis engine into your applications.` (此卡片背景色略深或有特殊标签)
            *   **卡片 6**: **图标**: `files`. **标题**: `Batch Processing`. **描述**: `Analyze multiple files at once to speed up your workflow.`
        *   **适用场景模块 (Use Cases Section)**:
            *   **H2 标题**: `Who is Describe Music for?`
            *   **布局**: 采用标签页或可折叠的手风琴布局，展示不同用户画像的场景。
            *   **内容**:
                *   **For Podcasters & YouTubers**: `Generate show notes & video chapters`, `Check audio quality before publishing`, `Find the perfect background music`.
                *   **For Musicians & Producers**: `Analyze song structures of popular hits`, `Get unbiased feedback on your demos`, `Discover new melodic or rhythmic ideas`.
                *   **For Marketers & Agencies**: `Ensure ad music is brand-safe`, `Write compelling copy based on audio mood`, `Find audio for social media campaigns`.
        *   **FAQ 模块 (FAQ Section)**:
            *   **H2 标题**: `Frequently Asked Questions`
            *   **布局**: 简洁的问答列表，问题加粗，答案默认折叠。
            *   **内容**:
                *   `Q1: What is Describe Music?`
                *   `Q2: How accurate is the analysis?`
                *   `Q3: What happens to the audio files I upload?`
                *   `Q4: What audio formats do you support?`
    *   **2.2.2. 分析器页面 (`/analyze`) - 核心产品体验**:
        *   **上传**: 支持拖拽/点击上传，并为 URL/录音功能提供禁用的占位符。
        *   **分析**: 动态声波图和进度文本的过场动画。
        *   **仪表盘**: 专业三栏式布局，使用占位/示例数据填充。
            *   **分享**: “Share”按钮，可复制唯一结果链接。

## 3. 实施路线图 (Implementation Roadmap)

*   **阶段一: 品牌与基础建设**:
    *   修改 `package.json`, `astro.config.mjs`。
    *   **配置 Astro 的 i18n 路由，设置英语为默认语言。**
    *   **创建 `src/i18n/en.json` 文件。**
    *   重塑 `Layout.astro`, `navbar.astro`, `footer.astro`。
*   **阶段二: 核心页面改造**:
    *   严格按规格重写 `index.astro`，**包括新增的“适用场景”和“FAQ”模块**。
    *   重写其他静态页面，并确保所有文本通过 i18n 调用。
*   **阶段三: SEO 内容部署**:
    *   在 `src/content/blog/en/` 下创建三篇指定的博客文章。
*   **阶段四: 核心功能 UI 搭建**:
    *   创建 `/analyze` 页面，并用占位/示例数据实现所有 UI 和交互。
*   **阶段五: 最终验证与交付**:
    *   本地审查，`pnpm build` 无错，交付完整静态前端。
