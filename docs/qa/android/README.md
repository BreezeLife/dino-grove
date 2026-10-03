# Android 安装版验收

本目录的 `phone/report.json` 与 `tablet/report.json` 记录实际安装 APK 的 SHA256、Android / WebView 版本和逐项结果；以 `passed` 为准。截图来自 Android `adb exec-out screencap`，不是桌面浏览器换尺寸截图。

2026-10-03 最终验收：手机和平板两套完整流程均 **PASS**。APK SHA256：`064e38ec1acef57d57e369d64367d09f91215a66f6bed3c42d085d54b9446951`。

| Android显示配置 | 实际竖屏WebView | 实际横屏WebView | 系统相册PNG |
| --- | --- | --- | --- |
| 手机1080×2340 / 440dpi | 393×778 | 802×341 | 1188×1306，字节一致 |
| 平板1600×2560 / 320dpi | 800×1174 | 1206×740 | 1872×1524，字节一致 |

[launcher-icon.png](launcher-icon.png) 记录系统应用抽屉中实际安装的3D图标，已人工确认图案完整、标签为Dino Grove。人工查看手机夜景、手机横屏照片、平板竖屏与保存提示截图，角色、切面岛、按钮和文字清晰可见。

验证环境为 macOS / Apple M1 Pro 上的 Android 15（API 35）ARM64 模拟器，Google Android Emulator 37.2.12，硬件图形后端。手机与平板使用同一个隔离 AVD 顺序改变显示尺寸，未向任何已连接实体设备安装应用。它验证 Android 系统和 WebView 的真实功能路径，但不能代表实体手机、平板的帧率、温升或厂商相册表现，也没有覆盖 Android 10–14 的实际运行。

## 覆盖范围

- 飞行模式且 Wi-Fi 关闭后启动，从 APK 内 `https://appassets.androidplatform.net/assets/` 读取资源；检查包不请求 INTERNET 权限。
- 真实 WebGL2 场景、页面无溢出、Android 操作目标至少48 CSS px、五居民触摸选择/招呼/喂食。
- `adb input tap` 点击地面，等待真正移动到达后的界面事件；原生拖动打断自动旋转。
- 整页白天/日落/夜晚配色、中文/英文与语言持久化、横竖屏和照片弹窗。
- 实际 Android Web Audio 采样：开始有信号、Home 后静音、前台恢复、关闭归零。模拟器以 `-no-audio` 启动，仅测应用音频图，不将信号检查描述成扬声器输出或人工听感评价。
- 原生 MediaStore 写入 `Pictures/Dino Grove/`，读取 MediaStore 元数据并 `adb pull` 实际 PNG；保存文件与带相框和时间的原始 Blob 逐字节比较。`saved-photo.png` 是从模拟器系统相册取回的文件。
- Android 返回键先关闭照片/恐龙介绍、无效 PNG 桥接调用返回 `INVALID_IMAGE`、外域网络请求被阻止。

`navigator.onLine` 在未声明网络状态权限的 WebView 内可能仍返回 true，因此离线判断使用 Android 飞行模式/Wi-Fi 状态、应用权限及本地资源来源，不使用该字段单独判定。

## 复现

安装已有 Android SDK 的 API35 ARM64 Google APIs 镜像，创建独立 AVD，使用 emulator 序列号；工具会拒绝任何实体设备序列号。先安装当前构建的 debug APK（仅 debug 开启 WebView 调试），再运行：

```sh
adb -s emulator-5560 install -r releases/dino-grove-android-v2.0.0.apk
ANDROID_SERIAL=emulator-5560 QA_ANDROID_PROFILE=phone node tests/android-check.mjs

adb -s emulator-5560 shell wm size 1600x2560
adb -s emulator-5560 shell wm density 320
ANDROID_SERIAL=emulator-5560 QA_ANDROID_PROFILE=tablet node tests/android-check.mjs
```

本轮手机物理显示1080×2340 / 440dpi，平板显示1600×2560 / 320dpi。系统状态栏、导航栏和安全区占用后的实际 WebView CSS 尺寸记录在每份报告。Android 输入坐标使用 UI Automator 的 WebView 边界偏移，避免误点系统栏。

如非默认 SDK 路径，可设置 `ADB`；可通过 `QA_OUTPUT`、`QA_CDP_PORT` 指定输出目录和调试转发端口。

参考官方说明：[模拟器命令行](https://developer.android.com/studio/run/emulator-commandline)、[Android命令行工具](https://developer.android.com/tools)。
