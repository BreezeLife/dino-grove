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
- 详见 [QA.md](QA.md) 和 `qa/night-adventure`。包含Chrome触摸模拟与Android模拟器原生验收；无实体手机性能或厂商相册验证，场景包仍有500KB体积提示。
- 保留工作区原有外部 `STATUS.md` 改动，未纳入本轮源码提交。

## 发布记录
- 公开仓库：https://github.com/BreezeLife/dino-grove
- Pages实际地址：https://breezelife.github.io/dino-grove/（Pages API确认且HTTP200）。网页版源码d546672bb5e4cdf04e3443caeeb36e6362239576已发布，工作流37086811718成功，线上390×844完整回归通过、0浏览器/网络错误。Android扩展正在进行。
- 网页版成功Actions：https://github.com/BreezeLife/dino-grove/actions/runs/37086811718；证据 `qa/night-adventure/production`。线上1024图标SHA-256与本地一致。
- 远端main接续点：7e84334f050c155f1ec650d313bee929b5fc98f4；已读取远端，未强推或覆盖其他工作。
- 复用BreezeLife本机gh及SSH授权，无需重新登录；OAuth缺workflow范围，Git推送使用 `git@github.com:BreezeLife/dino-grove.git`，gh负责读取工作流和Pages状态。
- 旧版首发源码0c1002e411ceb6efc6cd33bff647b825b284c158，成功Actions：https://github.com/BreezeLife/dino-grove/actions/runs/37080688803。历史证据留在 `qa/local`、`qa/production`、`qa/scene`。

## Android 手机 / 平板安装版
- 文件：`releases/dino-grove-android-v2.0.0.apk`，3,858,331字节；同一通用APK，Android10+，版本2.0.0-test，包名com.breezelife.dinogrove。
- SHA-256：`064e38ec1acef57d57e369d64367d09f91215a66f6bed3c42d085d54b9446951`。
- 本机Android调试证书签署的测试版，未上架商店。保留程序化3D图标，完全离线、双语、横竖屏，原生按钮至少48px。
- MediaStore保存相框照片到Pictures/Dino Grove；无网络/存储/相机/麦克风权限。原生后台静音与返回键已验证。
- 最终APK在Android15/API35 ARM64模拟器手机和平板均完整通过，真实Android输入和WebView、实际相册保存PNG字节一致；这不替代实体设备性能或Android10–14运行验收。
- 构建与安装说明见 `android/README.md`；报告与截图见 `docs/qa/android`。仓库忽略APK、SDK、构建缓存和所有签名密钥。
- 源目录为iCloud，遇到短读后使用逐字节校验的本机临时快照构建；脚本已固化该流程。工作区node_modules为本机临时依赖链接，其他机器正常npm ci即可。
