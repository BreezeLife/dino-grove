# 验证记录

验证日期：2026-10-03（Asia/Shanghai）。

## 自动检查
- `npm ci`：使用锁文件成功安装。
- `npm test`：7组检查通过。3个种子各600秒，每只恐龙分别出现漫游、觅食和喝水；核验圆形代理无碰撞、持续移动、转向角速度和投喂状态。
- 4种CPU视口：1440×900、390×844、320×568、844×390。核验完整取景、有限几何、暂停全姿态、恢复、无效选择、特写、光照、最大缩放远裁面及截图异常后的背景恢复。
- `npm run build`：TypeScript与Vite生产构建通过；Three.js场景块约615KB（gzip约157KB），仍有大于500KB的体积提示。
- `npm audit`：Vite补丁更新后0漏洞。部署脚本bash语法检查通过。
- CPU使用替代Renderer和Controls，不证明GPU画面、触控或所有模型均无穿模。完整输出见 automated-test-output.json 与 build-output.txt。

## 真实浏览器与移动模拟
环境：macOS 15.7，Apple M1 Pro，Chrome 154.0.8037.97，无头真实Chrome，ANGLE Metal硬件WebGL。浏览器报告见 [local/browser-report.json](qa/local/browser-report.json)。

| 项目 | 结果与证据范围 |
| --- | --- |
| 四视口与中英界面 | 全部通过，无页面滚动溢出或超出视口的按钮，按钮目标至少44px；截图见 qa/local |
| 初始画面 | 人工查看截图：岛屿完整、三居民可辨、材质/阴影/池水/植被正常 |
| 模型点选 | 开发页面投影定位后使用真实pointer点击与Raycaster选择，四视口通过 |
| 居民互动 | 三种恐龙依次选择、特写、打招呼、投喂、关闭全部通过 |
| 相机 | 鼠标拖动与滚轮、三预设、重置、横竖屏旋转通过；拖动不误选居民 |
| 手机手势 | CDP单指旋转与双指缩放通过，比较实际相机矩阵；这是触摸模拟，不是真机手指测试 |
| 暂停恢复 | 暂停后canvas像素一致；恢复和镜头操作正常 |
| 语言 | 中文/English切换、介绍和反馈翻译、html语言、刷新记忆通过 |
| 光照/截图 | 晨光与落日切换、PNG下载通过，输出是真实场景截图 |
| 错误 | 正常页面无console/page错误、HTTP错误、失败请求；阻断WebGL后显示中文提示和重新加载按钮 |
| 步态/避障抽查 | 独立真实WebGL场景连续90秒，截图抽查看到移动、转弯、觅食、树边与居民间保持间隔；未见明显滑移或模型穿插，不能证明任意时刻都不会发生 |
| 喝水姿态 | 受控设置三种喝水姿态，截图检查站姿与嘴部接近水面；和自然导航观察分开记录 |
| 发布 | 待远端Actions和实际Pages网址验证后更新HANDOFF |

## 帧率记录
四视口各采样约5秒：桌面60.2 FPS、390×844为60.2 FPS、320×568为60.1 FPS、844×390为60.2 FPS。桌面另有10秒初步采样约60 FPS。手机视口的浏览器devicePixelRatio=2，场景按尺寸限制渲染像素比为1.5/1.8。

这些数值均来自同一台M1 Pro，不能代表手机芯片、真机Safari/Chrome、温升或持续帧率。iOS/Android实体设备与较低端设备性能仍待实测。

## 可复现方法
1. `npm ci`，启动 `npm run dev -- --host 127.0.0.1 --port 5173`。
2. `QA_INSTRUMENT=1 npm run test:browser`，默认用本机Chrome。其他机器可安装Playwright Chromium并指定QA_CHANNEL。
3. `node tests/scene-observe.mjs`连续观察90秒并采集场景状态与受控姿态；该harness只用于开发验收，不打入发布页面。
4. 生产网址使用 `QA_URL=<实际Pages地址> QA_OUTPUT=docs/qa/production npm run test:browser`，不设置QA_INSTRUMENT。

原始代码保留三角龙、剑龙、长颈龙；没有新增霸王龙或软软糖。
