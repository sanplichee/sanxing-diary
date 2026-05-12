#!/bin/bash
# ============================================================
# 三省日记 Android 构建脚本
# 一键构建 APK，支持调试版和发布版
# ============================================================

set -e

echo "========================================"
echo "   三省日记 Android 构建"
echo "========================================"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
check_tool() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ 缺少工具: $1${NC}"
        echo "   请安装: $2"
        return 1
    fi
    echo -e "${GREEN}✅ $1${NC}"
    return 0
}

echo ""
echo "📋 检查环境..."
echo "----------------------------------------"

MISSING=0
check_tool "node" "https://nodejs.org/ (推荐 v18+)" || MISSING=1
check_tool "npm" "随 Node.js 安装" || MISSING=1
check_tool "java" "https://adoptium.net/ (推荐 JDK 17)" || MISSING=1

# 检查 Android SDK
if [ -z "$ANDROID_SDK_ROOT" ] && [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}❌ ANDROID_SDK_ROOT 未设置${NC}"
    echo "   请安装 Android Studio 或 Android SDK Command Line Tools"
    echo "   参考: https://developer.android.com/studio"
    MISSING=1
else
    echo -e "${GREEN}✅ Android SDK${NC}"
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}⛔ 环境不满足，请先安装缺失的工具${NC}"
    exit 1
fi

echo ""
echo "🧹 清理旧构建..."
cd "$(dirname "$0")"
rm -rf dist/

echo ""
echo "🔨 构建 Web 应用..."
npm run build

echo ""
echo "📋 同步 Android 项目..."
npx cap sync android

echo ""
echo "📦 构建 APK..."
echo ""
echo -e "${YELLOW}选择构建类型:${NC}"
echo "  1) 调试版 (debug) - 快速构建，用于测试"
echo "  2) 发布版 (release) - 需要签名，用于上架"
echo ""
read -p "请输入选项 [1/2]: " BUILD_TYPE

cd android

if [ "$BUILD_TYPE" = "2" ]; then
    echo ""
    echo "🔐 构建发布版 APK..."
    echo ""
    echo -e "${YELLOW}注意: 首次构建发布版需要创建签名密钥${NC}"
    echo ""
    echo "是否创建新的签名密钥?"
    read -p "[y/N]: " CREATE_KEY
    
    if [ "$CREATE_KEY" = "y" ] || [ "$CREATE_KEY" = "Y" ]; then
        echo ""
        echo "创建签名密钥..."
        mkdir -p app/keystore
        keytool -genkey -v \
            -keystore app/keystore/release-key.jks \
            -keyalg RSA -keysize 2048 -validity 10000 \
            -alias sanxing \
            -storepass sanxing2024 \
            -keypass sanxing2024 \
            -dname "CN=三省日记, OU=App, O=Personal, L=Local, ST=Local, C=CN"
        echo ""
        echo -e "${GREEN}✅ 签名密钥已创建${NC}"
        echo "   路径: android/app/keystore/release-key.jks"
        echo "   密码: sanxing2024"
        echo "   别名: sanxing"
        echo ""
        echo "⚠️  请妥善保管密钥文件和密码！"
    fi
    
    ./gradlew assembleRelease
    
    echo ""
    echo -e "${GREEN}✅ 发布版构建完成！${NC}"
    echo ""
    echo "APK 文件位置:"
    echo "  android/app/build/outputs/apk/release/app-release-unsigned.apk"
    echo ""
    echo "如已配置签名，完整 APK 位置:"
    echo "  android/app/build/outputs/apk/release/app-release.apk"
    
else
    echo ""
    echo "🔧 构建调试版 APK..."
    ./gradlew assembleDebug
    
    echo ""
    echo -e "${GREEN}✅ 调试版构建完成！${NC}"
    echo ""
    echo "APK 文件位置:"
    echo "  ${BLUE}android/app/build/outputs/apk/debug/app-debug.apk${NC}"
    echo ""
    echo "安装到连接的设备:"
    echo "  ./gradlew installDebug"
    echo "  或: adb install app/build/outputs/apk/debug/app-debug.apk"
fi

echo ""
echo "========================================"
echo -e "${GREEN}   构建完成！${NC}"
echo "========================================"
