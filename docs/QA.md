# 验证记录 · Low-poly 五居民版

验证日期：2026-10-03（Asia/Shanghai）。本节对应本轮五居民、全页面时段换色、点地移动和3D图标；旧版三居民证据仍保留在 `qa/local`、`qa/scene`、`qa/production`，不代替本轮结果。

## 自动检查
- `npm ci`：按锁文件安装成功。
- `npm test`：27项导航检查及7组场景检查通过。覆盖可达路径、障碍/水域终点调整、移动到达、暂停、取消、连续换居民指令、拒绝新目标时保留旧目标；3个种子各600秒，五只恐龙分别出现漫游、觅食和喝水，圆形代理无碰撞。
- 四种CPU视口：1440×900、390×844、320×568、844×390；覆盖取景、有限几何、姿态暂停/恢复、光照周期、远裁面、截图失败恢复。281 meshes，59,658顶点。
- `npm run build`：TypeScript与Vite生产构建通过。场景块629.45KB（gzip162.40KB），仍有大于500KB的体积提示。
- `npm audit`：完整依赖审计0漏洞；`git diff --check`通过。
- CPU使用替代Renderer和Controls，不能证明真实GPU、触摸或所有模型姿态。原始输出见 [automated-test-output.txt](qa/night-adventure/automated-test-output.txt)、[build-output.txt](qa/night-adventure/build-output.txt)、[audit.json](qa/night-adventure/audit.json)。

## 真实 Chrome 与移动端模拟
环境：macOS15.7、Apple M1 Pro、Chrome154.0.8037.97，无头真实Chrome，ANGLE Metal硬件WebGL。四视口全部通过，详见 [final-local/browser-report.json](qa/night-adventure/final-local/browser-report.json)。

| 项目 | 结果和证据范围 |
| --- | --- |
| 响应式与可读性 | 四视口无页面溢出/越界按钮；操作目标至少44px，五居民文字16px；面板可滚动、移动端横向居民选择可达 |
| 初始画面 | 人工查看真实渲染截图：切面浮岛、米白树干、几何树冠、五居民、阴影/水面正常；没有使用外部模型或图片 |
| 模型与互动 | 实际pointer与Raycaster选模型；五居民选择、特写、招呼、投喂、关闭全部通过 |
| 指定位置移动 | 桌面鼠标点击、三个手机视口CDP触摸轻点；读取实际世界坐标确认迅猛龙走到目标附近；拖动后回到原点不误发指令 |
| 镜头 | 三预设、重置、拖动、鼠标滚轮/触摸双指缩放、横竖切换通过；自动旋转可开启并被手动操作打断 |
| 暂停 | 等待提示淡出后，真实GPU画面暂停像素稳定，继续后可正常操作 |
| 时段 | 手动白天/日落/夜晚、自动昼夜按钮、文字提示通过；整页/面板/浏览器主题色随时段改变；夜景保留清晰地形与角色 |
| 双语 | 五居民与新增功能中文/English、html语言、刷新记忆通过 |
| 拍照 | 真实场景PNG预览/下载、品牌相框、拍摄时间、Escape关闭及焦点恢复通过 |
| 图标 | 3D页头图标、相对子目录manifest、PNG主屏幕图标正常加载 |
| 错误 | 四视口正常流程0 console/page错误、失败请求或HTTP错误；WebGL不可用时有中文提示和重新加载按钮 |

每视口约5秒帧率采样：1440×900 **60.1 FPS**、390×844 **59.6 FPS**、320×568 **60.1 FPS**、844×390 **60.1 FPS**。这些数值均来自M1 Pro；手机视口使用devicePixelRatio=2，不代表实体手机性能、温升或持续帧率。

整页三色独立复核与截图：[palette-report.json](qa/night-adventure/final-local/palette-report.json)，白天/日落/夜晚的页面、面板和浏览器主题色均各不相同。

完整回归之后补充安全区增量检查：[safe-area-report.json](qa/night-adventure/safe-area/safe-area-report.json)。真实Chrome中注入47/59px顶部和横屏左右安全区，四视口及中英文的页头、面板、照片和主要控件均可触达；零inset中文行高保持原样。修复页头高度、横向安全区与照片弹窗边界。这是CSS安全区域模拟，不是实体iPhone或原生主屏幕启动验证。

## 连续场景、媒体与人工观察
- [scene/observation.json](qa/night-adventure/scene/observation.json)：真实动画连续运行90秒，经历白天→日落→夜晚，无页面错误；0/30/60/90秒截图及五种受控喝水姿态已保存。人工抽查夜景、脚掌、两种新增双足恐龙和喝水姿态；未见明显异常，有限截图不能证明任意时刻都无穿插。
- [media/media-report.json](qa/night-adventure/media/media-report.json)：真实PNG完整保留场景，生成1872×1438测试照片，检查品牌边框、设备当地时间和UTC偏移。时间用固定测试时刻，非截图采集时刻。
- 同一报告记录真实Web Audio图：点击后有非零音频采样，停止归零，再启用恢复输出，dispose关闭；这是音频信号检查，不是人工听感评价。
- [media/share-report.json](qa/night-adventure/media/share-report.json)：真实浏览器UI配合原生分享能力桩，确认传入PNG File、不支持/拒绝时回退、取消无错误。**未向真实相册写入文件**。

## 发布与尚待验证
- 本轮发布状态及源码/Actions链接见 [HANDOFF.md](HANDOFF.md)；只有本轮工作流成功且线上最新资源可访问才记为发布成功。
- 没有连接iOS/Android实体手机。真机Safari/Chrome、低端设备帧率、长期温升及系统相册保存菜单仍待实测。网页提供PNG下载和能力允许时的系统分享，不能直接写入手机相册。

## 复现
1. Node22.13+，`npm ci`，`npm run dev -- --host 127.0.0.1 --port 5173`。
2. `npm test`，`npm run build`。
3. `QA_INSTRUMENT=1 QA_OUTPUT=docs/qa/night-adventure/final-local npm run test:browser`。默认本机Chrome，可指定QA_CHANNEL；开发注入只用于检查，不发布。
4. `node tests/media-check.mjs`、`node tests/photo-share-check.mjs`、`node tests/scene-observe.mjs`、`node tests/safe-area-check.mjs`。
5. 生产：`QA_URL=https://breezelife.github.io/dino-grove/ QA_VIEWPORT=390x844 QA_OUTPUT=docs/qa/night-adventure/production npm run test:browser`。不设置QA_INSTRUMENT；世界坐标到达断言和开发模型定位由本地真实浏览器结果覆盖。

## Android 安装版与平板增量
- 安装包元数据、签名、全部13个内置资源与最终 dist 的逐字节匹配记录在 [package-report.json](qa/android/package-report.json)。版本2.0.0-test，minSdk29，targetSdk36，通用ABI，3,858,331字节，无权限声明。
- Android Gradle构建通过，lint为0错误、1条Gradle补丁升级提示；最终共享源码 `npm test` 和 TypeScript/Vite构建通过。原始输出见 `qa/android`。
- [桥接浏览器报告](qa/android-bridge/report.json)覆盖390×844、800×1280、1280×800：48px操作目标、PNG有效载荷、请求ID匹配、保存中防重复、失败恢复、英文。桥接桩仅证明前端交互，真实写入另由Android报告证明。
- Android 15/API35 ARM64模拟器运行最终APK；WebView124.0.6367.219，M1 Pro硬件图形后端，手机1080×2340/440dpi，平板1600×2560/320dpi。详见 [原生验收说明](qa/android/README.md)、[手机报告](qa/android/phone/report.json)、[平板报告](qa/android/tablet/report.json)，以各报告passed字段为准。
- 桌面触摸测试、Android模拟器都不能证明实体手机/平板的帧率、长期温升、扬声器听感或所有厂商相册表现。Android10–14运行兼容性尚未实测，minSdk是构建兼容声明。
- 本地iCloud源目录曾出现短读、Content-Length不匹配和延迟HMR，导致浏览器测试中断；最终使用逐字节校验的本机临时快照进行构建与浏览器复验，未为环境问题放松暂停像素或资源错误断言。

最终Android手机和平板报告均 `passed: true`，均对应SHA-256 `064e38ec1acef57d57e369d64367d09f91215a66f6bed3c42d085d54b9446951`。手机WebView为393×778（横屏802×341），平板800×1174（横屏1206×740）。两种配置离线加载、原生点触到达、相册保存、双语、三时段、横竖屏和音乐生命周期全部通过。系统相册取回的PNG分别为1188×1306与1872×1524，均与预览逐字节一致。人工抽查平板夜景、手机相框照片，画面和文字完整。

最终Chrome平板矩阵 [browser-report.json](qa/android-tablet-web/browser-report.json) 两视口800×1280、1280×800全部通过，正常流程0浏览器/资源错误，暂停PNG与场景状态完全一致，真实触摸行走分别5.863/5.894秒到达。早期一次30秒超时未复现，无法归因于产品或负载；保留逐秒场景/墙钟时间与导航状态诊断，未更改导航源码或放宽断言。

源码f25d903的Pages工作流37090883978成功；线上HTML、JavaScript、CSS与图标均HTTP200且与APK内资源校验值一致。GitHub Release的APK公开下载后SHA-256与原生验收安装包一致。见 [published-assets.json](qa/android/published-assets.json)。

最终线上390×844完整回归 [production-final/browser-report.json](qa/night-adventure/production-final/browser-report.json) 通过。真实Chrome完成全部五居民动作、三视角、日夜、音频、镜头触摸/捏合、横竖屏、带框PNG下载、双语记忆及WebGL回退；暂停PNG精确一致，正常流程0 console/page/HTTP/request错误。未注入场景内部API，所以不将这一轮写作导航位置到达验证，该项由本地稳定快照及Android原生报告覆盖。60.14FPS为本机M1 Pro采样，不代表Android硬件。

## 2026-10-04–05 · 全屏与持续移动引导

- 最终`npm test`、TypeScript/Vite构建、Android Gradle构建/lint通过。普通/减少动态两组CPU检查覆盖持续光环、材质恢复、路径/受阻/到达、暂停、释放及取景Fog。323 meshes、60,182顶点，场景块630.61KB（gzip163.02KB），仍有500KB体积提示。
- [最终六视口GPU验收](qa/immersive/browser-final/report.json)全部通过：1440×900、390×844、320×568、844×390、800×1280、1280×800。覆盖真实Fullscreen API、不可用/拒绝回退、菜单自动收起、五居民持续光环、路径/目标、实际移动到达、到达标记淡出、暂停PNG一致、夜景、照片与中英文退出。0页面/请求错误。
- 竖屏全屏镜头拉远曾使岛屿进入雾区；Fog距离现随取景系数同步，标记`fog:false`。CPU核验岛屿最远深度低于Fog起点，最终真实GPU截图确认手机竖屏画面清晰。
- [四视口原功能回归](qa/immersive/regression/browser-report.json)通过：模型点选、互动、三视角、日夜、音频、触摸/捏合、照片、双语与WebGL回退。该组在最后Fog/按钮禁选补丁前执行；随后六视口GPU及最终原生验收覆盖两项补丁的影响。
- [独立UI复核](qa/immersive/ui-review/report.json)检查320×568、844×390、800×1280的中英布局、焦点和18张截图。修复菜单遮住底部提示、焦点滚动裁切后，无越界或小于44px操作目标。此组为布局证据，早于最后Fog修正。
- Android按钮文字曾触发复制菜单；现仅禁用按钮文字选择，独立照片预览仍允许长按。最终原生重复菜单操作通过，未再触发该浮层。
- 最终2.1.0-test APK为3,863,931字节，SHA-256 `cdfd4b1b945e12a6ed7cd35f48d9f379e05bb9ef53aa4cc5fd8c9e9e125c6b72`；签名验证通过且与2.0相同，13个资产与最终dist一致。见[安装包报告](qa/immersive/android/package-report.json)。
- [Android手机](qa/immersive/android/phone-fullscreen/report.json)、[Android平板](qa/immersive/android/tablet-fullscreen/report.json)均为上述最终包且通过。Android15/API35隔离模拟器真实ADB点击验证原生系统栏隐藏/恢复、48px控件、菜单自动收起、相册保存、横竖屏和照片→菜单→全屏的返回顺序。手机WebView从393×778扩展至393×802，平板800×1174扩展至800×1206，退出均恢复。
- 自动浏览器曾在滚动/稳定等待中超时，最后改为等待滚动定位、检查实际命中目标后发送真实鼠标/触摸，每步断言`isTrusted`点击。最终整组通过；未将超时归因于已确认的应用故障或负载，不使用强制/DOM点击。原生脚本也等待菜单与旋转状态后仅发送一次Back。
- 实体手机/平板、Android10–14运行兼容性、长期温升和厂商相册全面表现仍待设备实测。模拟器与桌面触摸结果不能代替这些结论。
- 发布记录见[HANDOFF.md](HANDOFF.md)，复现方法见[本轮说明](qa/immersive/README.md)。
