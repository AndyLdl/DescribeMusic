# Logo 生成器使用说明

这个 Python 脚本可以自动将您的 3D 耳机图片转换成项目所需的各种格式和尺寸的 logo 文件。

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements_logo.txt
```

### 2. 运行脚本

```bash
# 基本用法（生成所有版本：方形 + 圆角 + 圆形）
python logo_generator.py your_headphone_image.png

# 指定输出目录
python logo_generator.py your_headphone_image.png -o custom/output/path

# 只生成圆角版本（不生成圆形）
python logo_generator.py your_headphone_image.png --no-circle

# 只生成方形版本（不生成圆角和圆形）
python logo_generator.py your_headphone_image.png --only-basic

# 禁用圆角但保留圆形
python logo_generator.py your_headphone_image.png --no-rounded
```

## 📁 生成的文件结构

脚本会自动创建以下目录结构：

```
public/images/logo/
├── favicon/
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon-48x48.png
│   ├── favicon.ico          # 包含多尺寸
│   └── favicon.svg          # SVG模板（需手动优化）
├── header/
│   ├── logo-32.png
│   ├── logo-32-rounded.png  # 圆角版本
│   ├── logo-32-circle.png   # 圆形版本
│   ├── logo-40.png
│   ├── logo-40-rounded.png
│   ├── logo-40-circle.png
│   ├── logo-64.png
│   ├── logo-64-rounded.png
│   ├── logo-64-circle.png
│   ├── logo-high-res.png        # 用于SVG转换
│   ├── logo-high-res-rounded.png
│   └── logo-high-res-circle.png
├── social/
│   ├── opengraph-1200x630.jpg
│   └── twitter-1200x600.jpg
├── app-icons/
│   ├── icon-128.png
│   ├── icon-128-rounded.png     # iOS风格圆角
│   ├── icon-128-circle.png      # 圆形版本
│   ├── icon-128-bg-rounded.png  # 带背景圆角
│   ├── icon-192.png
│   ├── icon-192-rounded.png
│   ├── icon-192-circle.png
│   ├── icon-192-bg-rounded.png
│   ├── icon-256.png
│   ├── icon-256-rounded.png
│   ├── icon-256-circle.png
│   ├── icon-256-bg-rounded.png
│   ├── icon-512.png
│   ├── icon-512-rounded.png
│   ├── icon-512-circle.png
│   └── icon-512-bg-rounded.png
└── brand/
    ├── logo-100.png
    ├── logo-100-rounded.png     # 轻微圆角
    ├── logo-100-circle.png      # 圆形版本
    ├── logo-200.png
    ├── logo-200-rounded.png
    ├── logo-200-circle.png
    ├── logo-400.png
    ├── logo-400-rounded.png
    └── logo-400-circle.png
```

## ✨ 功能特点

- ✅ **自动生成所有尺寸**: 从 16x16 到 1200x630 的所有必需尺寸
- ✅ **保持宽高比**: 确保 logo 不会变形
- ✅ **透明背景支持**: 自动处理 PNG 透明度
- ✅ **ICO 多尺寸**: 生成包含多个尺寸的 favicon.ico 文件
- ✅ **社交媒体图片**: 自动生成带渐变背景的分享图
- ✅ **文件大小优化**: 自动优化生成的图片文件
- 🆕 **圆角支持**: 自动生成现代化圆角版本
- 🆕 **圆形版本**: 生成完全圆形的 logo 变体
- 🆕 **iOS 风格图标**: 符合 Apple 设计规范的应用图标
- 🆕 **灵活控制**: 可选择性生成方形、圆角或圆形版本

## 📋 输入要求

- **格式**: PNG、JPG、JPEG
- **建议尺寸**: 至少 512x512px（越大越好）
- **背景**: 推荐透明背景或纯色背景
- **质量**: 高分辨率原图效果更佳

## 🛠️ 手动优化建议

生成文件后，您可能需要：

1. **优化 SVG 文件**: `favicon.svg` 是自动生成的模板，建议手动替换为矢量版本
2. **调整社交媒体图片**: 可能需要调整文字位置或背景色
3. **测试小尺寸效果**: 检查 16x16px 等小尺寸下的清晰度

## 🔧 自定义选项

脚本支持的参数：

```bash
python logo_generator.py --help

用法: logo_generator.py [-h] [-o OUTPUT] [--no-rounded] [--no-circle] [--only-basic] input_image

参数:
  input_image          输入的logo图片文件路径
  -o OUTPUT, --output OUTPUT
                      输出目录（默认: public/images/logo）
  --no-rounded        禁用圆角版本生成
  --no-circle         禁用圆形版本生成
  --only-basic        只生成基础方形版本（等同于 --no-rounded --no-circle）
```

## 🎨 圆角设计规范

脚本会根据不同用途自动计算合适的圆角半径：

- **Header 图标**: 半径 = 尺寸/6 (轻微圆角，适合界面)
- **应用图标**: 半径 = 尺寸\*22.22% (iOS 设计规范)
- **品牌资产**: 半径 = 尺寸/8 (适中圆角，适合展示)

## 📱 图标版本说明

**方形版本**: 保持原始设计，适用于：

- 传统网站 favicon
- 基础品牌展示
- 需要方形设计的场合

**圆角版本**: 现代化设计，适用于：

- 现代网站界面
- 应用图标（iOS/Android）
- 社交媒体头像

**圆形版本**: 完全圆形，适用于：

- 用户头像
- 社交平台图标
- 特殊设计需求

## 🚨 注意事项

1. **确保输入图片质量高**: 原图越清晰，生成的小尺寸图标越好
2. **检查透明背景**: 如果原图有复杂背景，可能需要先去除背景
3. **SVG 需要手动优化**: 自动生成的 SVG 只是模板
4. **测试各种设备**: 生成后在不同设备上测试显示效果

## 📞 问题排查

### 常见错误

1. **"输入文件不存在"**: 检查图片路径是否正确
2. **"Permission denied"**: 确保有写入输出目录的权限
3. **"图片格式不支持"**: 确保输入文件是 PNG/JPG 格式

### 依赖问题

如果安装 Pillow 遇到问题：

```bash
# macOS
brew install libjpeg libpng
pip install Pillow

# Ubuntu/Debian
sudo apt-get install libjpeg-dev libpng-dev
pip install Pillow

# Windows
pip install Pillow
```

## 🎯 下一步

生成 logo 文件后：

1. 运行项目集成脚本更新引用
2. 测试网站 favicon 显示
3. 检查社交媒体分享效果
4. 根据需要微调某些尺寸

---

**提示**: 这个脚本是为 DescribeMusic 项目特别定制的，如果您需要其他项目的 logo 生成，可能需要调整一些参数。
