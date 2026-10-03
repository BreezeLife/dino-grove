# 恐龙小丛林 · Dino Grove

用代码生成的一座 Three.js 恐龙箱庭。三角龙、剑龙、长颈龙在林间漫游、觅食和喝水；没有外部图片、贴图或 3D 模型。

## 探索小丛林
- 中文 / English 切换，记住语言偏好。
- 拖动或单指旋转，滚轮或双指缩放；全景、池畔、俯瞰预设。
- 点选居民、靠近观察、打招呼、喂点心；晨光与落日光照。
- 暂停恢复、重置镜头、导出场景 PNG。空格暂停，R 重置，Escape 关闭介绍。
- 桌面、手机竖屏及横屏布局；键盘焦点、44px 操作目标和减少动态效果支持。

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

CPU 检查模拟 3 个种子各 600 秒漫游，逐只核验觅食喝水、碰撞代理、平滑转向，以及四视口取景、暂停、镜头、光照、远裁面和截图异常清理。它不证明真实 GPU 画面或手机性能。

## 真实浏览器验收
先启动开发服务，再运行（默认使用本机 Chrome）：

```sh
QA_INSTRUMENT=1 npm run test:browser
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
- src/navigation.mjs：确定性导航与行为。
- tests：CPU 回归、浏览器验收和场景观察脚本。
- PROJECT.md、MEMORY.md、TASKS.md、WORKLOG.md：跨设备项目连续记录。
