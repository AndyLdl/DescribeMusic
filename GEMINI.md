# Astroship - 现代化 SAAS 网站模板

## 项目简介

Astroship 是一个基于 Astro 框架构建的免费 SAAS 网站模板，专为初创公司、营销网站、落地页和博客而设计。该模板采用现代化的技术栈，结合了 Astro 的强大功能和 TailwindCSS 的灵活样式系统。

## 主要特性

### 🚀 技术栈
- **Astro v3** - 现代化的静态站点生成器
- **TailwindCSS** - 实用优先的 CSS 框架
- **TypeScript** - 类型安全的 JavaScript
- **响应式设计** - 完美适配各种设备

### ✨ 核心功能
- 📱 移动端响应式设计
- 📝 内容集合管理
- 📧 可用的联系页面
- 🎨 现代化 UI 设计
- ⚡ 快速加载性能
- 🔧 易于定制和扩展

## 项目结构

```
/
├── public/          # 静态资源文件
├── src/
│   ├── components/  # 可复用组件
│   ├── layouts/     # 页面布局
│   ├── pages/       # 页面文件
│   └── styles/      # 样式文件
├── astro.config.mjs # Astro 配置文件
└── package.json     # 项目依赖
```

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 开发模式
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

### 预览构建结果
```bash
pnpm preview
```

## 使用场景

- **SAAS 产品官网** - 展示产品特性和定价
- **初创公司网站** - 公司介绍和团队展示
- **营销落地页** - 产品推广和用户转化
- **个人博客** - 内容创作和分享平台
- **企业官网** - 品牌展示和业务介绍

## 定制指南

### 修改主题色彩
在 `tailwind.config.js` 中自定义颜色方案：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        secondary: '#your-color'
      }
    }
  }
}
```

### 添加新页面
在 `src/pages/` 目录下创建新的 `.astro` 文件即可自动生成路由。

### 自定义组件
在 `src/components/` 目录下创建可复用的组件，支持 Astro、React、Vue 等多种框架。

## 部署选项

- **Vercel** - 一键部署，自动 CI/CD
- **Netlify** - 静态站点托管
- **GitHub Pages** - 免费托管选项
- **自定义服务器** - 完全控制部署环境

## 许可证

本项目采用 GPL-2.0 许可证，允许自由使用和修改。

## 支持与贡献

如果你在使用过程中遇到问题或有改进建议，欢迎：
- 提交 Issue 报告问题
- 发起 Pull Request 贡献代码
- 参与社区讨论和交流

---

*由 [Web3Templates](https://web3templates.com) 赞助提供*