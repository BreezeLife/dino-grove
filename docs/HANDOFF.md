# 开发交接状态

更新日期：2026-10-03（Asia/Shanghai）。

## 当前版本：Low-poly 五居民小丛林
- 在现有React/TypeScript/Three.js上完成五居民：保留三角龙、剑龙、长颈龙，新增霸王龙和迅猛龙；用户最新八项要求取代早先“不新增霸王龙”范围。
- 场地半径从8.15扩大至11.5；浮岛、树木、植物、恐龙均程序化low-poly建模，无外部素材。
- 鼠标/触摸点地面移动，A*避障、终点调整、到达/受阻提示。最后一个成功手动指令生效，避免多目标预约互锁；无效新指令保留旧目标。
- 120秒自动昼夜，手动白天/日落/夜晚；场景和整页青绿/橙金/靛蓝渐变，夜间保持可交互亮度。保留旋转缩放和三视角，新增自动旋转。
- 中文/English、清晰大文字和彩色头像；桌面侧栏和手机可滚动操作区。原创Web Audio背景音乐默认关闭、点击启用。
- 拍照生成真实场景加“恐龙小丛林”相框与当地时间，支持PNG下载及可用时的系统文件分享。
- 3D APP图标为程序化三角龙头与浮岛雕塑，1024/512/192/180/64/32 PNG、SVG、favicon、Apple Touch Icon和相对路径manifest。源文件为 `scripts/app-icon.ts`，重渲染用 `scripts/render-app-icon.mjs`。
- 修复暂停插值、近景树遮挡、触摸拖动误判、连续移动指令互锁；最终281 meshes、59,658顶点。

## 验证与限制
- npm ci、27项导航与7组场景检查、TypeScript/Vite生产构建通过，npm audit 0漏洞。
- 四种视口真实Chrome硬件WebGL、鼠标/模拟触摸、五居民互动、实际到达、双语、照片、音乐、日夜、自动镜头全部通过；正常流程0浏览器/网络错误。
- 90秒实时昼夜观察及五种受控喝水截图；照片时间/像素、Web Audio信号及分享回退分支均有证据。
- 发布复核修复主屏幕安全区域：页头随顶部inset增长，横屏边距及照片弹窗不侵入刘海区；四视口注入安全区与中英文定向验收通过。
- 详见 [QA.md](QA.md) 和 `qa/night-adventure`。移动端为桌面触摸模拟，无实体手机相册或设备性能验证；场景包仍有500KB体积提示。
- 保留工作区原有外部 `STATUS.md` 改动，未纳入本轮源码提交。

## 发布记录
- 公开仓库：https://github.com/BreezeLife/dino-grove
- Pages实际地址：https://breezelife.github.io/dino-grove/（现有Pages API确认）。本轮更新发布与线上验收尚待完成。
- 远端main接续点：7e84334f050c155f1ec650d313bee929b5fc98f4；已读取远端，未强推或覆盖其他工作。
- 复用BreezeLife本机gh及SSH授权，无需重新登录；OAuth缺workflow范围，Git推送使用 `git@github.com:BreezeLife/dino-grove.git`，gh负责读取工作流和Pages状态。
- 旧版首发源码0c1002e411ceb6efc6cd33bff647b825b284c158，成功Actions：https://github.com/BreezeLife/dino-grove/actions/runs/37080688803。历史证据留在 `qa/local`、`qa/production`、`qa/scene`。
