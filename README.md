# 恐龙小丛林 · Dino Grove

[在线探索 · Explore the grove](https://breezelife.github.io/dino-grove/) · [Android APK 下载](https://github.com/BreezeLife/dino-grove/releases/download/v2.0.0-android-test/dino-grove-android-v2.0.0.apk) · [GitHub](https://github.com/BreezeLife/dino-grove)

用代码生成的一座 Three.js 恐龙箱庭。三角龙、剑龙、长颈龙、霸王龙和迅猛龙，在更大的岛屿上漫游、觅食和喝水。模型、植物、头像与音乐均由代码生成。

## 探索小丛林
- 中文 / English 切换，记住语言偏好。
- 拖动或单指旋转，滚轮或双指缩放；全景、池畔、俯瞰预设。
- 选择居民后点击 / 轻触地面，让它绕开障碍走到指定位置；靠近观察、打招呼、喂点心。
- 自动昼夜循环或手动白天 / 傍晚 / 夜晚，夜间保持明亮可操作；自动旋转和背景音乐开关。
- 拍摄带「恐龙小丛林」相框和当地时间的 PNG，预览后下载或通过手机系统分享保存。浏览器不能直接写入相册，具体存储操作由设备提供。
- 暂停恢复、重置镜头。空格暂停，R 重置，Escape 关闭介绍或照片。
- 真正的 low-poly 切面浮岛、恐龙和树木。整页随白天青绿 / 日落橙金 / 夜晚靛蓝换色。大文字和鲜艳图标；固定场景与可滚动操作面板适配桌面和手机。键盘焦点、44px 操作目标和减少动态效果支持。

[3D APP 图标 · 1024 PNG](https://breezelife.github.io/dino-grove/app-icon-1024.png)；已接入网页与主屏幕图标。图标可运行 `node scripts/render-app-icon.mjs` 在本地开发服务器上重建，源码为 `scripts/app-icon.ts`。

指定移动时，新的有效指令交给当前恐龙，上一位朋友恢复自主漫游；避免多目标互锁。

## 开发
Node.js 22.13+，依赖以 package-lock.json 为准。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

CPU 检查模拟 3 个种子各 600 秒漫游，逐只核验五居民觅食喝水、碰撞代理、平滑转向；额外核验地面移动、绕路、终点调整和到达，以及四视口取景、暂停、镜头、光照、远裁面和截图异常清理。它不证明真实 GPU 画面或手机性能。

## 真实浏览器验收
先启动开发服务，再运行（默认使用本机 Chrome）：

```sh
QA_INSTRUMENT=1 npm run test:browser
npm run test:media
node tests/photo-share-check.mjs
node tests/safe-area-check.mjs
```

如使用 Playwright Chromium：先 `npx playwright install chromium`，再设置 `QA_CHANNEL=chromium`。可用 `QA_URL` 指定生产网址、`QA_OUTPUT` 指定证据目录，`QA_VIEWPORT=390x844` 只检查一个视口。生产验收不要设置 QA_INSTRUMENT。

浏览器检查覆盖中英文、模型点选（开发环境）、按钮与触摸模拟、四视口、旋转、截图、错误回退、实际渲染暂停、控制台和资源加载。结果和截图见 docs/qa，范围与限制见 docs/QA.md。

## 发布
GitHub 目标为公开仓库 BreezeLife/dino-grove，main 分支通过 GitHub Actions 测试、构建和发布 Pages。Vite 使用 `base: "./"` 支持项目子路径。部署脚本复用本机 gh 现有授权：

```sh
bash ./deploy-github.sh
```

若仓库已存在而本地未关联，脚本停止，由维护者先拉取、合并已有内容。禁止强推。最新部署记录见 docs/HANDOFF.md。

## 结构
- src/App.tsx / globals.css：界面、状态与响应式布局。
- src/i18n.ts / DinoPortrait.tsx：双语文案与程序化居民头像。
- src/grove.ts：场景、模型、动画、镜头、互动和资源释放。
- src/navigation.mjs：确定性导航、寻路与行为。
- src/photo.ts / music.ts：带框照片与本地合成音乐。
- tests：CPU 回归、浏览器验收和场景观察脚本。
- PROJECT.md、MEMORY.md、TASKS.md、WORKLOG.md：跨设备项目连续记录。

## Android 手机和平板安装版

Android 10 及以上可安装，手机和平板共用一个 APK，支持横竖屏、中文/English 和完全离线探索。内置 3D 启动图标，点击拍照后可直接「存入相册」，文件位于 `Pictures/Dino Grove`。不申请网络、相机、麦克风或存储权限。

当前版本为 **2.0.0-test 测试安装包**，使用本机 Android 调试证书签名，未发布应用商店。下载后在 Android「文件」中打开 APK，按系统提示允许该下载来源安装。要求设备支持 WebGL 2，并使用较新的 Android System WebView。相同证书的后续包可覆盖更新；其他机器生成的调试签名通常需要先卸载。

下载：[Android APK（3.7 MB）](https://github.com/BreezeLife/dino-grove/releases/download/v2.0.0-android-test/dino-grove-android-v2.0.0.apk) · [发行说明及校验值](https://github.com/BreezeLife/dino-grove/releases/tag/v2.0.0-android-test)。发布记录见 [交接文档](docs/HANDOFF.md)，本地构建步骤见 [Android README](android/README.md)。构建命令：

```sh
node scripts/build-android.mjs
```

脚本将源码逐字节校验后复制到本机临时目录构建，输出 `releases/dino-grove-android-v2.0.0.apk`，避免云同步目录中的短读影响产物。Android 原生验证与桌面触摸模拟分别记录在 [QA](docs/QA.md)。
