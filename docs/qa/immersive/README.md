# 全屏与移动引导验收 · 2026-10-04

本轮在既有五居民版本上新增沉浸探索和持续移动引导。截图来自真实Chrome或Android模拟器；桌面手机视口与模拟器均不替代实体手机。

## 最新构建与证据状态

最新测试APK：`releases/dino-grove-android-v2.1.0.apk`，版本2.1.0-test，3,863,931字节，SHA-256：

`cdfd4b1b945e12a6ed7cd35f48d9f379e05bb9ef53aa4cc5fd8c9e9e125c6b72`

`android/package-report.json`已确认与上一版同调试证书、签名有效、ZIP完整、13个内置资源与最终dist逐字节匹配。最终源码`npm test`、TypeScript/Vite、Gradle构建与lint通过。CPU记录323 meshes、60,182顶点；场景块630.61KB（gzip163.02KB）。

最新功能包含真实Fullscreen API及不可用/拒绝时的CSS回退，Android隐藏/恢复系统栏，菜单自动收起，持续脚下光环、模型高亮、路径箭头与目的地反馈。最终修正还包括：

- 窄屏取景时Fog距离随相机缩放，选择/移动引导材质不参与雾化；390px修正后GPU截图已确认岛屿清晰。
- 菜单展开隐藏底部提示，避免文字被遮挡；首次焦点位于可见首位居民。
- 按钮禁选文字，避免Android触控触发HUD复制菜单；独立照片`img`保留长按保存，分享与MediaStore调用保持原有流程。

最终Android手机/平板报告均`passed: true`且对应上述CDFD包；六视口GPU最终报告也全部通过。早期自动滚动/稳定等待超时，输入诊断后采用滚动定位等待、命中检查和真实鼠标/触摸，每步断言可信点击。最终整组通过，未使用强制或DOM点击，也未把负载作为已确认根因。

## 报告目录

- `browser-final/report.json`：1440×900、390×844、320×568、844×390、800×1280、1280×800。覆盖真实Fullscreen API、不可用/拒绝回退、菜单收起、五居民光环、路径箭头、实际移动到达、到达标记淡出、暂停PNG一致、夜景、照片、中英退出。最终整组通过。
- `regression/browser-report.json`：原有四视口完整回归，含居民互动、镜头、昼夜、音频、照片、双语和WebGL回退。该组早于最后Fog/按钮禁选补丁；随后最终六视口与原生验收覆盖两项补丁。
- `ui-review/report.json`：320×568、844×390、800×1280，中英普通态/全屏/菜单18张截图及320英文回退提示。布局、按钮大小/越界、提示遮挡、可见焦点与照片焦点归还已通过；这是独立UI增量证据。
- `android/phone-fullscreen/report.json`、`android/tablet-fullscreen/report.json`：Android15/API35隔离模拟器，真实ADB点触、系统栏隐藏/恢复、菜单、相册写入、旋转与中英文返回顺序；必须核对最终CDFD哈希和`passed`字段。
- `android/package-report.json`：最新包的元数据、签名及内置资源校验。
- `android/automated-test-output.txt`：导航与场景CPU检查，含普通/减少动态两组选择和移动引导检查、Fog与岛屿深度比较。CPU替代渲染器不能证明GPU画面。

## 复现

先运行本地开发服务器。iCloud目录曾发生短读，本轮使用逐字节校验的本机临时源码快照并禁用HMR；不通过放松断言绕过环境问题。

```sh
QA_URL=http://127.0.0.1:5177/ node tests/immersive-check.mjs
QA_URL=http://127.0.0.1:5177/ QA_INSTRUMENT=1 npm run test:browser
ANDROID_SERIAL=emulator-5560 QA_ANDROID_PROFILE=phone node tests/android-immersive-check.mjs
ANDROID_SERIAL=emulator-5560 QA_ANDROID_PROFILE=tablet node tests/android-immersive-check.mjs
```

原生脚本等待实际菜单/旋转状态并记录Back事件，不用重复按键掩盖失败。首次全屏时正常点击Android系统教学的“Got it”，再继续菜单与返回验证。脚本只接受模拟器序列号，手机/平板顺序改变同一隔离AVD显示配置，未向其他连接设备安装。

计划发行标签为`v2.1.0-android-test`，源码提交、Actions成功状态、Pages及公开APK验证待发布步骤补录。没有实体设备帧率、温升、Android10–14运行兼容性或厂商相册全面达标声明。

实现参考：[Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide)、[Android沉浸模式](https://developer.android.com/develop/ui/views/layout/immersive)。
