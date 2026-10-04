# 开发交接状态

更新日期：2026-10-05（Asia/Shanghai）。

## 最新开发版本 · 2026-10-04：全屏与持续移动引导

本轮源码、最终安装包、六视口GPU与原生手机/平板验收已通过，Pages工作流成功，线上390手机视口验收通过。下方2026-10-03的v2.0.0记录保留作历史参考。

- 增加全屏入口。支持时使用真实Fullscreen API；不支持或请求被拒绝时展开CSS沉浸视图，并明确提示浏览器栏仍保留。Android调用原生桥隐藏/恢复系统栏。
- 进入后自动收起页头与菜单，保留退出、菜单、拍照按钮。展开菜单后选择居民或点地面会再次收起，保留选中状态；返回顺序为照片、菜单、全屏、普通居民卡。中英文、安全区、隐藏面板inert和焦点归还同步处理。
- 选中恐龙保持明亮材质与脚下双层光环，光环随腿下位置移动；提供路径箭头、醒目目的地、受阻与到达反馈。暂停及减少动态偏好均保留清晰标识。
- 菜单展开时隐藏底部引导，避免残句被浮层遮挡；首次焦点进入可见的首位居民。按钮禁选文字，防止触控触发HUD文字复制菜单；独立照片预览保留长按保存能力。
- 竖屏相机取景调整时同步拉远Fog区间，避免岛屿被雾吞没；选择与移动引导材质不参与雾化。当前场景323 meshes、60,182顶点。

### 本轮安装包与构建
- 文件：`releases/dino-grove-android-v2.1.0.apk`，3,863,931字节；版本2.1.0-test、versionCode20100、Android10+、目标API36，包名保持`com.breezelife.dinogrove`。
- SHA-256：`cdfd4b1b945e12a6ed7cd35f48d9f379e05bb9ef53aa4cc5fd8c9e9e125c6b72`。
- 与v2.0.0相同本机Android Debug证书，签名验证通过；ZIP校验、13个内置资源与最终dist逐字节匹配、源码与构建快照一致，见[安装包报告](qa/immersive/android/package-report.json)。无新增权限。
- `npm test`、TypeScript/Vite生产构建、Gradle构建与lint通过。场景块630.61KB（gzip163.02KB），保留体积提示。

### 本轮验证与发布
- 最终Android手机/平板模拟器报告均`passed: true`，`apkSha256`均为上述CDFD哈希；原生全屏、自动收菜单、相册保存、旋转和返回顺序通过。
- 最终六视口真实Chrome验收全部通过，0页面/请求错误；涵盖系统全屏/回退、五居民光环、真实行走到达、照片、夜景及中英退出。输入逐次验证可信点击，详见[QA.md](QA.md)。
- 源码提交：[d4ea4aa13a8310defcd9e54289d40beafee5f01a](https://github.com/BreezeLife/dino-grove/commit/d4ea4aa13a8310defcd9e54289d40beafee5f01a)，正常推送main。
- Pages成功工作流：[37218056553](https://github.com/BreezeLife/dino-grove/actions/runs/37218056553)。线上390×844实际全屏、菜单收起、五居民选择、夜景、照片与中英退出通过，0页面/请求错误；无场景内部API注入，运动到达由本地GPU证据覆盖。
- Pages全部13个资源与最终APK内资源SHA-256一致；公开APK实际下载后SHA-256与CDFD验收包一致，HTTP200，见[发布校验](qa/immersive/published-assets.json)。
- [Android 2.1.0测试发行版](https://github.com/BreezeLife/dino-grove/releases/tag/v2.1.0-android-test) / [直接下载APK](https://github.com/BreezeLife/dino-grove/releases/download/v2.1.0-android-test/dino-grove-android-v2.1.0.apk)。保留旧2.0发行版。
- 既有网址为[恐龙小丛林](https://breezelife.github.io/dino-grove/)；用户已授权复用BreezeLife现有授权正常提交推送与发布，不强推。继续保留外部`STATUS.md`改动。
- 没有实体手机/平板验收，不声称Android10–14实机兼容性、低端性能、温升或厂商相册全面达标。

## 历史基础版本 · 2026-10-03：Low-poly 五居民小丛林
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
- Pages实际地址：https://breezelife.github.io/dino-grove/（Pages API确认且HTTP200）。网页版源码d546672bb5e4cdf04e3443caeeb36e6362239576首轮已发布，工作流37086811718成功，线上390×844完整回归通过、0浏览器/网络错误。后续Android与平板升级发布记录见下。
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

## 最终发布 · Android 与平板升级
- 源码提交：[f25d9037150fa55c5b729f02133d6e61c22dafe5](https://github.com/BreezeLife/dino-grove/commit/f25d9037150fa55c5b729f02133d6e61c22dafe5)。正常接续main推送，无强推。
- Pages成功工作流：[37090883978](https://github.com/BreezeLife/dino-grove/actions/runs/37090883978)。实际页面、JS、CSS、1024图标均HTTP200，并与最终APK内资源SHA-256一致。
- Android发行版：[v2.0.0-android-test](https://github.com/BreezeLife/dino-grove/releases/tag/v2.0.0-android-test)；[直接下载APK](https://github.com/BreezeLife/dino-grove/releases/download/v2.0.0-android-test/dino-grove-android-v2.0.0.apk)。公开下载后复核SHA-256，与手机/平板验收的安装包完全一致。
- 发布资源证据：`docs/qa/android/published-assets.json`。后续文档证据提交不改变运行时代码或APK。
- 最终线上390×844真实Chrome完整回归通过：五居民、三视角、日夜、音频、触摸镜头、照片、双语与WebGL回退，正常流程0浏览器/资源错误，暂停PNG精确一致。证据 `docs/qa/night-adventure/production-final`；无开发注入，内部导航位置断言由本地快照及原生验收覆盖。
