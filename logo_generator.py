#!/usr/bin/env python3
"""
Logo Generator Script for DescribeMusic
自动生成各种格式和尺寸的logo文件

Requirements:
pip install Pillow

Usage:
python logo_generator.py input_image.png
"""

import os
import sys
from PIL import Image, ImageDraw
import argparse
from pathlib import Path


class LogoGenerator:
    def __init__(self, input_image_path, output_dir="public/images/logo", enable_rounded=True, enable_circle=True):
        """
        初始化Logo生成器
        
        Args:
            input_image_path (str): 输入图片路径
            output_dir (str): 输出目录
            enable_rounded (bool): 是否生成圆角版本
            enable_circle (bool): 是否生成圆形版本
        """
        self.input_path = Path(input_image_path)
        self.output_dir = Path(output_dir)
        self.enable_rounded = enable_rounded
        self.enable_circle = enable_circle
        
        if not self.input_path.exists():
            raise FileNotFoundError(f"输入文件不存在: {input_image_path}")
        
        # 创建输出目录结构
        self.create_directories()
        
        # 加载原始图片
        self.original_image = Image.open(self.input_path)
        print(f"原始图片尺寸: {self.original_image.size}")
        print(f"圆角功能: {'✅ 启用' if self.enable_rounded else '❌ 禁用'}")
        print(f"圆形功能: {'✅ 启用' if self.enable_circle else '❌ 禁用'}")
        
        # 确保图片有透明通道
        if self.original_image.mode != 'RGBA':
            self.original_image = self.original_image.convert('RGBA')
    
    def create_directories(self):
        """创建所需的目录结构"""
        directories = [
            self.output_dir / "favicon",
            self.output_dir / "header", 
            self.output_dir / "social",
            self.output_dir / "app-icons",
            self.output_dir / "brand"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"创建目录: {directory}")
    
    def resize_image(self, size, maintain_aspect=True, background_color=None, border_radius=0):
        """
        调整图片尺寸
        
        Args:
            size (tuple): 目标尺寸 (width, height)
            maintain_aspect (bool): 是否保持宽高比
            background_color (tuple): 背景颜色，None为透明
            border_radius (int): 圆角半径，0为方形
        
        Returns:
            PIL.Image: 调整后的图片
        """
        if maintain_aspect:
            # 保持宽高比，居中放置
            img = self.original_image.copy()
            img.thumbnail(size, Image.Resampling.LANCZOS)
            
            # 创建新图片
            if background_color:
                new_img = Image.new('RGBA', size, background_color)
            else:
                new_img = Image.new('RGBA', size, (0, 0, 0, 0))
            
            # 居中粘贴
            paste_x = (size[0] - img.width) // 2
            paste_y = (size[1] - img.height) // 2
            new_img.paste(img, (paste_x, paste_y), img)
            
            # 如果需要圆角，应用圆角效果
            if border_radius > 0:
                new_img = self.add_rounded_corners(new_img, border_radius)
            
            return new_img
        else:
            # 直接拉伸到目标尺寸
            resized = self.original_image.resize(size, Image.Resampling.LANCZOS)
            
            # 如果需要圆角，应用圆角效果
            if border_radius > 0:
                resized = self.add_rounded_corners(resized, border_radius)
            
            return resized
    
    def add_rounded_corners(self, image, radius):
        """
        为图片添加圆角
        
        Args:
            image (PIL.Image): 输入图片
            radius (int): 圆角半径
        
        Returns:
            PIL.Image: 带圆角的图片
        """
        # 创建圆角遮罩
        width, height = image.size
        
        # 创建一个黑色背景的遮罩
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        # 绘制圆角矩形（白色部分会被保留）
        draw.rounded_rectangle((0, 0, width, height), radius, fill=255)
        
        # 将原图转换为RGBA模式
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # 应用遮罩
        output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        output.paste(image, (0, 0))
        output.putalpha(mask)
        
        return output
    
    def create_circle_image(self, image):
        """
        将图片裁剪为圆形
        
        Args:
            image (PIL.Image): 输入图片
        
        Returns:
            PIL.Image: 圆形图片
        """
        # 确保图片是正方形
        width, height = image.size
        size = min(width, height)
        
        # 裁剪为正方形
        left = (width - size) // 2
        top = (height - size) // 2
        right = left + size
        bottom = top + size
        square_img = image.crop((left, top, right, bottom))
        
        # 创建圆形遮罩
        mask = Image.new('L', (size, size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        
        # 应用遮罩
        if square_img.mode != 'RGBA':
            square_img = square_img.convert('RGBA')
        
        output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        output.paste(square_img, (0, 0))
        output.putalpha(mask)
        
        return output
    
    def generate_favicons(self):
        """生成favicon系列"""
        print("\n🔥 生成Favicon图标...")
        
        favicon_sizes = [
            (16, 16),
            (32, 32),
            (48, 48)
        ]
        
        favicon_images = []
        
        for width, height in favicon_sizes:
            img = self.resize_image((width, height))
            
            # 保存PNG格式
            png_path = self.output_dir / "favicon" / f"favicon-{width}x{height}.png"
            img.save(png_path, 'PNG', optimize=True)
            print(f"  ✓ 生成: {png_path}")
            
            # 收集用于ICO文件
            favicon_images.append(img)
        
        # 生成ICO文件（包含多个尺寸）
        ico_path = self.output_dir / "favicon" / "favicon.ico"
        favicon_images[0].save(ico_path, format='ICO', sizes=[(16,16), (32,32), (48,48)])
        print(f"  ✓ 生成: {ico_path} (包含多尺寸)")
        
        # 生成SVG版本（简化处理，实际可能需要手动优化）
        self.generate_svg_favicon()
    
    def generate_svg_favicon(self):
        """生成SVG格式的favicon"""
        # 这里生成一个基础的SVG模板，您可能需要手动替换为实际的SVG内容
        svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- 这里需要替换为您的实际SVG内容 -->
  <rect width="32" height="32" fill="#4338ca" rx="6"/>
  <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial" font-size="20">🎧</text>
  <style>
    @media (prefers-color-scheme: dark) {
      rect { fill: #6366f1; }
    }
  </style>
</svg>'''
        
        svg_path = self.output_dir / "favicon" / "favicon.svg"
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        print(f"  ✓ 生成: {svg_path} (SVG模板，需要手动优化)")
    
    def generate_header_logos(self):
        """生成Header logo系列"""
        print("\n📱 生成Header Logo...")
        
        header_sizes = [32, 40, 64]
        
        for size in header_sizes:
            # 普通版本
            img = self.resize_image((size, size))
            png_path = self.output_dir / "header" / f"logo-{size}.png"
            img.save(png_path, 'PNG', optimize=True)
            print(f"  ✓ 生成: {png_path}")
            
            # 圆角版本
            if self.enable_rounded:
                img_rounded = self.resize_image((size, size), border_radius=size//6)
                rounded_path = self.output_dir / "header" / f"logo-{size}-rounded.png"
                img_rounded.save(rounded_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {rounded_path}")
            
            # 圆形版本
            if self.enable_circle:
                img_circle = self.create_circle_image(self.resize_image((size, size)))
                circle_path = self.output_dir / "header" / f"logo-{size}-circle.png"
                img_circle.save(circle_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {circle_path}")
        
        # 生成高质量版本用于SVG转换
        high_res = self.resize_image((256, 256))
        svg_base_path = self.output_dir / "header" / "logo-high-res.png"
        high_res.save(svg_base_path, 'PNG', optimize=True)
        print(f"  ✓ 生成: {svg_base_path} (用于SVG转换)")
        
        # 高质量圆角版本
        high_res_rounded = self.resize_image((256, 256), border_radius=42)
        rounded_svg_path = self.output_dir / "header" / "logo-high-res-rounded.png"
        high_res_rounded.save(rounded_svg_path, 'PNG', optimize=True)
        print(f"  ✓ 生成: {rounded_svg_path} (圆角高分辨率)")
        
        # 高质量圆形版本
        high_res_circle = self.create_circle_image(self.resize_image((256, 256)))
        circle_svg_path = self.output_dir / "header" / "logo-high-res-circle.png"
        high_res_circle.save(circle_svg_path, 'PNG', optimize=True)
        print(f"  ✓ 生成: {circle_svg_path} (圆形高分辨率)")
    
    def generate_social_images(self):
        """生成社交媒体分享图"""
        print("\n📤 生成社交媒体图片...")
        
        # OpenGraph标准尺寸
        og_img = self.create_social_image((1200, 630), "Describe Music")
        og_path = self.output_dir / "social" / "opengraph-1200x630.jpg"
        og_img.save(og_path, 'JPEG', quality=90, optimize=True)
        print(f"  ✓ 生成: {og_path}")
        
        # Twitter卡片尺寸
        twitter_img = self.create_social_image((1200, 600), "Describe Music")
        twitter_path = self.output_dir / "social" / "twitter-1200x600.jpg"
        twitter_img.save(twitter_path, 'JPEG', quality=90, optimize=True)
        print(f"  ✓ 生成: {twitter_path}")
    
    def create_social_image(self, size, title):
        """
        创建社交媒体分享图
        
        Args:
            size (tuple): 图片尺寸
            title (str): 标题文字
        
        Returns:
            PIL.Image: 社交媒体图片
        """
        # 创建渐变背景
        img = Image.new('RGB', size, (67, 56, 202))  # 紫色背景
        draw = ImageDraw.Draw(img)
        
        # 添加渐变效果（简化版）
        for i in range(size[1]):
            alpha = i / size[1]
            color = (
                int(67 + alpha * (99 - 67)),      # R: 67 -> 99
                int(56 + alpha * (102 - 56)),     # G: 56 -> 102  
                int(202 + alpha * (241 - 202))    # B: 202 -> 241
            )
            draw.line([(0, i), (size[0], i)], fill=color)
        
        # 添加logo（居中偏左）
        logo_size = min(200, size[1] // 3)
        logo = self.resize_image((logo_size, logo_size))
        
        # 转换RGBA到RGB（去除透明度）
        if logo.mode == 'RGBA':
            logo_rgb = Image.new('RGB', logo.size, (255, 255, 255))
            logo_rgb.paste(logo, mask=logo.split()[-1])
            logo = logo_rgb
        
        logo_x = size[0] // 4
        logo_y = (size[1] - logo_size) // 2
        img.paste(logo, (logo_x, logo_y))
        
        # 添加标题文字（这里简化处理，实际可能需要更好的字体）
        try:
            from PIL import ImageFont
            # 尝试使用系统字体
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 60)
        except:
            # 如果没有找到字体，使用默认字体
            font = ImageFont.load_default()
        
        text_x = logo_x + logo_size + 50
        text_y = size[1] // 2 - 30
        draw.text((text_x, text_y), title, fill=(255, 255, 255), font=font)
        
        return img
    
    def generate_app_icons(self):
        """生成PWA应用图标"""
        print("\n📱 生成应用图标...")
        
        app_sizes = [128, 192, 256, 512]
        
        for size in app_sizes:
            # 普通方形版本
            img = self.resize_image((size, size))
            app_path = self.output_dir / "app-icons" / f"icon-{size}.png"
            img.save(app_path, 'PNG', optimize=True)
            print(f"  ✓ 生成: {app_path}")
            
            # 圆角版本（iOS风格）
            if self.enable_rounded:
                # iOS应用图标标准圆角半径约为尺寸的22.22%
                radius = int(size * 0.2222)
                img_rounded = self.resize_image((size, size), border_radius=radius)
                rounded_path = self.output_dir / "app-icons" / f"icon-{size}-rounded.png"
                img_rounded.save(rounded_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {rounded_path}")
                
                # 带背景的圆角版本（适合某些平台）
                img_bg = self.resize_image((size, size), background_color=(67, 56, 202, 255), border_radius=radius)
                bg_path = self.output_dir / "app-icons" / f"icon-{size}-bg-rounded.png"
                img_bg.save(bg_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {bg_path}")
            
            # 完全圆形版本
            if self.enable_circle:
                img_circle = self.create_circle_image(self.resize_image((size, size)))
                circle_path = self.output_dir / "app-icons" / f"icon-{size}-circle.png"
                img_circle.save(circle_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {circle_path}")
    
    def generate_brand_assets(self):
        """生成品牌资产"""
        print("\n🎨 生成品牌资产...")
        
        brand_sizes = [100, 200, 400]
        
        for size in brand_sizes:
            # 普通方形版本
            img = self.resize_image((size, size))
            brand_path = self.output_dir / "brand" / f"logo-{size}.png"
            img.save(brand_path, 'PNG', optimize=True)
            print(f"  ✓ 生成: {brand_path}")
            
            # 圆角版本
            if self.enable_rounded:
                radius = size // 8  # 较小的圆角，适合品牌展示
                img_rounded = self.resize_image((size, size), border_radius=radius)
                rounded_path = self.output_dir / "brand" / f"logo-{size}-rounded.png"
                img_rounded.save(rounded_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {rounded_path}")
            
            # 圆形版本
            if self.enable_circle:
                img_circle = self.create_circle_image(self.resize_image((size, size)))
                circle_path = self.output_dir / "brand" / f"logo-{size}-circle.png"
                img_circle.save(circle_path, 'PNG', optimize=True)
                print(f"  ✓ 生成: {circle_path}")
    
    def generate_all(self):
        """生成所有格式的logo"""
        print(f"🚀 开始生成Logo文件...")
        print(f"输入文件: {self.input_path}")
        print(f"输出目录: {self.output_dir}")
        
        try:
            self.generate_favicons()
            self.generate_header_logos()
            self.generate_social_images()
            self.generate_app_icons()
            self.generate_brand_assets()
            
            print(f"\n✅ 所有Logo文件生成完成！")
            print(f"📁 文件位置: {self.output_dir}")
            
            # 显示文件列表
            self.show_generated_files()
            
        except Exception as e:
            print(f"\n❌ 生成过程中出现错误: {e}")
            raise
    
    def show_generated_files(self):
        """显示生成的文件列表"""
        print(f"\n📋 生成的文件列表:")
        
        for root, dirs, files in os.walk(self.output_dir):
            level = root.replace(str(self.output_dir), '').count(os.sep)
            indent = ' ' * 2 * level
            print(f"{indent}{os.path.basename(root)}/")
            
            subindent = ' ' * 2 * (level + 1)
            for file in files:
                file_path = Path(root) / file
                file_size = file_path.stat().st_size
                size_str = self.format_file_size(file_size)
                print(f"{subindent}{file} ({size_str})")
    
    def format_file_size(self, size_bytes):
        """格式化文件大小"""
        if size_bytes < 1024:
            return f"{size_bytes}B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f}KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f}MB"


def main():
    parser = argparse.ArgumentParser(
        description="为DescribeMusic项目生成各种格式和尺寸的logo文件"
    )
    parser.add_argument(
        "input_image", 
        help="输入的logo图片文件路径（PNG/JPG格式）"
    )
    parser.add_argument(
        "-o", "--output",
        default="public/images/logo",
        help="输出目录（默认: public/images/logo）"
    )
    parser.add_argument(
        "--no-rounded",
        action="store_true",
        help="禁用圆角版本生成"
    )
    parser.add_argument(
        "--no-circle",
        action="store_true",
        help="禁用圆形版本生成"
    )
    parser.add_argument(
        "--only-basic",
        action="store_true",
        help="只生成基础方形版本（等同于 --no-rounded --no-circle）"
    )
    
    args = parser.parse_args()
    
    # 处理圆角和圆形选项
    enable_rounded = not args.no_rounded and not args.only_basic
    enable_circle = not args.no_circle and not args.only_basic
    
    try:
        generator = LogoGenerator(
            args.input_image, 
            args.output,
            enable_rounded=enable_rounded,
            enable_circle=enable_circle
        )
        generator.generate_all()
        
        print(f"\n🎉 恭喜！所有logo文件已生成完成。")
        print(f"💡 下一步：")
        print(f"   1. 检查生成的favicon.svg文件，可能需要手动优化")
        print(f"   2. 在项目中更新favicon和logo引用")
        print(f"   3. 测试各种尺寸的显示效果")
        
        if enable_rounded or enable_circle:
            print(f"   4. 根据设计需求选择使用方形、圆角或圆形版本")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()