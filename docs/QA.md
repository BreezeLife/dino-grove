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
