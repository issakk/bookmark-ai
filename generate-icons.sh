#!/bin/bash

# 生成图标脚本
# 需要安装 ImageMagick: brew install imagemagick

if ! command -v convert &> /dev/null; then
    echo "错误: 需要安装 ImageMagick"
    echo "运行: brew install imagemagick"
    exit 1
fi

echo "正在生成图标..."

# 从 SVG 生成不同尺寸的 PNG
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 32x32 icons/icon32.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png

echo "图标生成完成！"
echo "生成的文件:"
ls -lh icons/*.png
