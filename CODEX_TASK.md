# 直接交给 Codex 的任务
请接手本项目，完成真实浏览器验收、必要修复、GitHub 同步和 GitHub Pages 部署。用户已经授权直接发布，不必再次确认是否继续。

## 已有成果
项目是可运行的 React + TypeScript + Vite + Three.js 静态网页。包含三角龙、剑龙、长颈龙、程序化微缩生态岛、动画、避障、点击互动、视角切换和响应式界面。这里包含完整源码、锁定依赖、自动检查、GitHub Actions 和部署脚本，不能只交付一个概念稿。
已有 Sites 预览：https://dino-grove.weiqi.chatgpt.site/ 。此地址不是 GitHub Pages 地址。
打包时没有完成 GitHub 远端同步；不要根据预览地址推断 GitHub 已上线。

## 执行顺序
1. 阅读 AGENTS.md 和 docs 中的需求、验收与交接状态，运行 `npm ci`、`npm test`、`npm run build`。
2. 启动 `npm run dev`。在真实浏览器检查电脑 1440×900、手机竖屏 390×844 / 320×568，以及横屏 844×390。保留可复现截图、错误信息和验证结论。
3. 检查恐龙腿部交替、脚掌落地、尾巴摆动、吃草喝水、点击动作，以及树木岩石和彼此之间是否穿模。修复观察到的问题，不凭 CPU 检查认定画面合格。
4. 验证拖动、滚轮、手机手势、物种按钮、介绍卡、关闭、暂停、恢复、三个视角、重置和窗口旋转。检查 WebGL 不可用时的提示。
5. 使用本机 `gh auth status` 的现有 GitHub 授权，确认目标账户 BreezeLife。若没有可复用授权，明确报告阻塞原因，不读取或输出密钥。
6. 对不存在的目标仓库，可运行 `bash ./deploy-github.sh`；若仓库已有内容，先克隆合并后再发布。目标：BreezeLife/dino-grove，main 分支，公开，GitHub Actions 发布 Pages。
7. 等待 Actions 构建和部署成功，读取 GitHub 返回的实际 Pages URL，打开确认 HTML、CSS、JS 和 3D 场景正常。记录 commit SHA 和运行链接。

## 最终交付
给用户 GitHub 仓库链接、实际 Pages 链接、主要修复、自动检查与浏览器检查结果。更新 `docs/HANDOFF.md` 和 `docs/QA.md`。未验证的设备性能必须注明。
