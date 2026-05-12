# 三省日记 Android 移植指南

## 一、技术方案

本项目使用 **Capacitor** 将 React Web 应用转换为原生 Android 应用：

- **Capacitor**: 将 Web 应用包装为原生 Android WebView 应用
- **Capacitor Preferences**: 使用 Android SharedPreferences 存储数据（替代 localStorage）
- **Capacitor Filesystem**: 使用原生文件系统存储图片

## 二、项目结构

```
/mnt/agents/output/app/
├── src/                        # React 源代码
│   ├── services/
│   │   ├── nativeStorage.ts    # 原生存储适配层（Capacitor Preferences）
│   │   ├── storage.ts          # 业务存储层（已迁移到原生存储）
│   │   └── ...
│   ├── main.tsx                # 入口（初始化原生存储）
│   └── ...
├── android/                    # Android 原生项目（由 Capacitor 生成）
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml    # 已配置权限
│   │   │   └── res/
│   │   └── build.gradle
│   └── ...
├── capacitor.config.ts         # Capacitor 配置
├── capacitor.android-build.sh  # 构建脚本
└── dist/                       # Web 构建产物（同步到 Android）
```

## 三、存储架构

```
用户输入 → 内存缓存 → Capacitor Preferences (原生)
                      ↘ localStorage (Web 备份)
```

**核心优势**：
- 数据存储在 Android SharedPreferences（应用卸载前不会丢失）
- 即使 WebView 缓存被清理，数据仍然安全
- 内存缓存保证同步读取，无需改动调用代码
- 首次启动自动迁移 localStorage 数据

## 四、环境准备

### 4.1 安装必要工具

#### 1) Node.js + npm
```bash
# macOS
brew install node

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install nodejs npm

# Windows
# 下载 https://nodejs.org/ 安装 LTS 版本
```

#### 2) Java JDK (推荐 17)
```bash
# macOS
brew install --cask temurin

# Linux
sudo apt install openjdk-17-jdk

# 验证
java -version
```

#### 3) Android Studio
```bash
# 下载 https://developer.android.com/studio
# 安装后启动，在 "SDK Manager" 中：
# - SDK Platforms: 勾选 "Android 14.0 (API 34)"
# - SDK Tools: 勾选 "Android SDK Build-Tools", "Android SDK Command-line Tools"
```

#### 4) 设置环境变量
```bash
# macOS/Linux: 添加到 ~/.bashrc 或 ~/.zshrc
export ANDROID_HOME="$HOME/Library/Android/sdk"  # macOS
# export ANDROID_HOME="$HOME/Android/Sdk"         # Linux
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

#### 5) 安装项目依赖
```bash
cd /mnt/agents/output/app
npm install
```

### 4.2 首次构建

```bash
# 给构建脚本执行权限
chmod +x android-build.sh

# 运行构建（选择选项 1 构建调试版）
./android-build.sh
```

### 4.3 手动构建（不用脚本）

```bash
cd /mnt/agents/output/app

# 1. 构建 Web 应用
npm run build

# 2. 同步到 Android 项目
npx cap sync android

# 3. 构建 APK (调试版)
cd android
./gradlew assembleDebug

# APK 输出位置:
# android/app/build/outputs/apk/debug/app-debug.apk

# 4. 安装到设备
./gradlew installDebug
# 或: adb install app/build/outputs/apk/debug/app-debug.apk
```

## 五、常见问题

### Q1: 构建时报 "ANDROID_SDK_ROOT not set"
**解决**: 检查环境变量设置，确保 `ANDROID_HOME` 指向正确的 Android SDK 路径。

### Q2: 构建时报 "java not found"
**解决**: 安装 JDK 17 并检查 `java -version` 是否正常输出。

### Q3: 应用在真机上数据丢失
**解决**: 不需要解决！本应用使用 Capacitor Preferences（Android SharedPreferences），数据存储在应用的私有目录中。只有卸载应用才会丢失数据。

### Q4: 图片保存后找不到
**解决**: 图片使用 Base64 编码存储在 Preferences 中。如果需要存储到相册，需要额外配置 FileSystem 插件。

### Q5: 如何更新应用
**解决**: 
1. 修改源代码
2. `npm run build`
3. `npx cap sync android`
4. `cd android && ./gradlew assembleDebug`
5. 安装新版本即可

### Q6: 发布到 Google Play
**解决**:
1. 创建发布密钥（构建脚本选项 2 会自动创建）
2. 构建发布版 APK
3. 在 Android Studio 中：Build → Generate Signed Bundle / APK
4. 上传到 Google Play Console

## 六、Android 项目配置

### 已配置项
- **应用 ID**: `com.sanxing.diary`
- **应用名称**: 三省日记
- **权限**: INTERNET, CAMERA, 文件读写, 图片读取
- **最低 Android 版本**: API 22 (Android 5.1)
- **目标 Android 版本**: API 34 (Android 14)

### 可修改项
编辑 `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.sanxing.diary"  // 应用包名
        minSdkVersion 22                    // 最低版本
        targetSdkVersion 34                 // 目标版本
        versionCode 1                       // 版本号
        versionName "2.1.0"                // 版本名称
    }
}
```

## 七、技术支持

- Capacitor 文档: https://capacitorjs.com/docs
- Android 开发文档: https://developer.android.com/docs
- React + Capacitor 教程: https://ionicframework.com/docs/react
