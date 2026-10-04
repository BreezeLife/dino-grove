export type Locale = "zh" | "en";
export type ToastKey = "immersiveFallback" | "androidSaved" | "androidSaveFailed" | "paused" | "resumed" | "reset" | "day" | "sunset" | "night" | "cycle" | "captureSaved" | "captureFailed" | "greet" | "feed" | "musicOn" | "musicOff" | "musicFailed" | "rotateOn" | "rotateOff" | "shared" | "shareFailed" | "moveStarted" | "moveAdjusted" | "moveArrived" | "moveBlocked";
export const LOCALE_STORAGE_KEY = "dino-grove-locale";

export function readLocale(): Locale {
  try { return localStorage.getItem(LOCALE_STORAGE_KEY) === "en" ? "en" : "zh"; }
  catch { return "zh"; }
}

export const residentArt = [
  { latin: "Triceratops", color: "#edaf73" },
  { latin: "Stegosaurus", color: "#a7cb89" },
  { latin: "Brachiosaurus", color: "#8dd7de" },
  { latin: "Tyrannosaurus", color: "#e79671" },
  { latin: "Velociraptor", color: "#b8a4ee" },
] as const;

export const translations = {
  zh: {
    pageTitle: "恐龙小丛林 · Dino Grove",
    pageDescription: "探索昼夜交替的恐龙小丛林，认识五位恐龙朋友。轻触地面带它们散步，听音乐，拍下带相框的纪念照片。",
    brand: "恐龙小丛林", brandSubtitle: "DINO GROVE", switchLanguage: "切换到英文", languageButton: "EN",
    day: "白天", sunset: "傍晚", night: "夜晚", cycle: "自动", dayCycle: "自动昼夜", lightTitle: "丛林的时光", phaseDescription: { day: "太阳出来啦，一起散步吧", sunset: "晚霞染红了天空", night: "月亮升起，萤火虫醒来了" }, cycleDescription: "白天、晚霞与星夜，慢慢轮换", manualDescription: "时光停留在你喜欢的光线",
    savePhoto: "拍摄场景照片", photoButton: "拍照", capturing: "正在拍照", photoTitle: "小丛林纪念照", photoDescription: "相框与拍摄时间已加入照片。", photoAlt: "带有恐龙小丛林相框和拍摄时间的场景照片", downloadPhoto: "下载照片", sharePhoto: "分享 / 存入相册", closePhoto: "关闭照片预览", savingPhoto: "正在分享", photoHelp: "手机：点“分享 / 存入相册”，在系统菜单中选择“存储图像”。也可长按照片保存；若浏览器不支持，请先下载，再从“文件”存入相册。", photoDesktopHelp: "下载 PNG 照片，保留此刻的丛林与拍摄时间。",
    androidWebGL: "3D场景暂时无法启动，请更新 Android System WebView 后重试。", androidSave: "存入相册", androidSaving: "正在保存", androidPhotoHelp: "照片会保存到相册中的 Dino Grove，带上相框和拍摄时间。",
    sceneLabel: "五位恐龙朋友的三维小丛林。选择恐龙后点击地面可指定目的地，拖动旋转，双指或滚轮缩放。",
    sceneEyebrow: "一起探索", sceneHeadline: "今天，去哪里玩？", selectHint: "先选一位恐龙朋友，再点地面出发", moveHint: (name: string) => `带${name}散步 · 点击地面出发`, moveStatuses: { started: "正在向目的地走去", arrived: "到达啦，再选一个地方吧", blocked: "前面有点挤，稍等一下，或换块草地" },
    loading: "小丛林正在醒来", loadingDetail: "树叶、星光，还有五位新朋友",
    errorHeading: "小丛林需要再试一次", webgl: "暂时无法开启 3D 场景。请尝试支持 WebGL 的 Safari 或 Chrome。", load: "小丛林暂时没有加载成功，请刷新后重试。", reload: "重新加载",
    enterFullscreen: "全屏", fullscreenButton: "全屏", exitFullscreen: "退出全屏", exitFullscreenShort: "退出全屏", exitImmersiveShort: "退出沉浸", openMenu: "打开菜单", closeMenu: "关闭菜单", menuButton: "菜单", immersiveControls: "沉浸浏览控制",
    sceneControls: "场景控制", resume: "继续漫游", pause: "暂停漫游", resumeTitle: "继续漫游（空格）", pauseTitle: "暂停漫游（空格）", reset: "回到初始视角", resetTitle: "回到初始视角（R）", paused: "时间暂停中",
    selectDinosaur: "选择恐龙", residents: "选一位好朋友", residentsSubtitle: "5 位丛林居民", aboutResident: (name: string) => `${name}介绍`, closeDetails: "关闭恐龙介绍", selectedLabel: "正在一起玩", newResident: "新朋友",
    closeUp: "靠近看", fullView: "看全景", greet: "打招呼", feed: "喂点心",
    drag: "拖动旋转", wheel: "滚轮缩放", touchDrag: "单指旋转", pinch: "双指缩放", viewLabel: "观察视角", views: { grove: "全景", pond: "池畔", overhead: "俯瞰" },
    atmosphere: "让丛林更有趣", autoRotate: "自动旋转", rotateOn: "镜头慢慢转动", rotateOff: "开启环绕观察", music: "背景音乐", musicOn: "轻柔的丛林旋律", musicOff: "点一下，听听音乐", musicStarting: "音乐准备中", on: "已开", off: "已关", explorePanel: "恐龙与丛林设置", panelScroll: "向下滑动，还有更多玩法",
    toolDescription: "选择五位恐龙居民或切换视角。0 三角龙，1 剑龙，2 长颈龙，3 霸王龙，4 迅猛龙。", toolClosed: "小丛林已关闭。", toolInvalid: "请选择有效的恐龙或视角。",
    notifications: { immersiveFallback: "已展开沉浸视图，浏览器工具栏会保留。", androidSaved: "照片已存入相册的 Dino Grove。", androidSaveFailed: "照片暂时没有保存成功，请再试一次。", paused: "时间停下来了，镜头仍可以自由转动。", resumed: "小丛林继续生长。", reset: "已回到小丛林全景。", day: "太阳出来啦，去草地上玩吧。", sunset: "晚霞为小丛林披上橙色外衣。", night: "星夜来啦，月光照亮了小路。", cycle: "开启昼夜更替，一起等星星出现。", captureSaved: "照片下载已开始，请在下载或文件中查看。", captureFailed: "照片生成失败，请再试一次。", musicOn: "丛林音乐已开启。", musicOff: "丛林音乐已关闭。", musicFailed: "音乐暂时没有播放，请再点一次。", rotateOn: "镜头开始慢慢环绕，拖动即可停下。", rotateOff: "镜头已停止自动旋转。", shared: "照片已交给系统分享菜单。", shareFailed: "暂时无法分享，请下载或长按照片保存。", moveStarted: "出发啦，恐龙会绕开障碍。", moveAdjusted: "这里有障碍，改走附近的安全位置。", moveArrived: "到达目的地啦。", moveBlocked: "前面有点挤，稍等一下，或换块草地。" },
    species: [
      { name: "三角龙", subtitle: "Triceratops", detail: "三只小角，一圈大颈盾。最爱在草地上寻找鲜嫩的叶子。", habit: "爱吃嫩叶", greeting: "三角龙向你轻轻点了点头。", fed: "三角龙收到你的小点心啦。" },
      { name: "剑龙", subtitle: "Stegosaurus", detail: "背上驮着一排小山，尾巴轻轻摇。它有自己的散步节奏。", habit: "慢步旅行家", greeting: "剑龙摇了摇尾巴，和你打招呼。", fed: "剑龙收到你的小点心啦。" },
      { name: "长颈龙", subtitle: "Brachiosaurus", detail: "把长长的脖子伸进树叶之间。站得高，能看见远处的好朋友。", habit: "喜欢树梢", greeting: "长颈龙抬起头，看见你啦。", fed: "长颈龙收到你的小点心啦。" },
      { name: "霸王龙", subtitle: "Tyrannosaurus", detail: "大脑袋、小手臂，迈着神气的步子。在小丛林里，它也爱交朋友。", habit: "神气的大个子", greeting: "霸王龙摆摆小手，向你问好。", fed: "霸王龙开心地收下点心。" },
      { name: "迅猛龙", subtitle: "Velociraptor", detail: "轻巧的小身子，长尾巴保持平衡。它总能最先发现有趣的地方。", habit: "好奇的小探险家", greeting: "迅猛龙歪着脑袋看向你。", fed: "迅猛龙收到点心，尾巴摇得更欢了。" },
    ],
  },
  en: {
    pageTitle: "Dino Grove · Five little friends",
    pageDescription: "Explore a living dinosaur grove from sunny days to bright moonlit nights. Guide five dinosaur friends, listen to music, and save a framed photo.",
    brand: "Dino Grove", brandSubtitle: "A LITTLE LIVING WORLD", switchLanguage: "Switch to Chinese", languageButton: "中文",
    day: "Day", sunset: "Sunset", night: "Night", cycle: "Auto", dayCycle: "Day & night cycle", lightTitle: "Time in the grove", phaseDescription: { day: "Sunshine is here. Let's wander.", sunset: "The sky is turning peachy.", night: "Moonlight and little fireflies." }, cycleDescription: "Daylight, sunset and stars take turns", manualDescription: "Keep the light you love",
    savePhoto: "Take scene photo", photoButton: "Photo", capturing: "Taking photo", photoTitle: "A grove keepsake", photoDescription: "Your frame and photo time are included.", photoAlt: "Dino Grove scene photo with a decorative frame and capture time", downloadPhoto: "Download photo", sharePhoto: "Share / save image", closePhoto: "Close photo preview", savingPhoto: "Sharing", photoHelp: "On your phone, tap Share / save image and choose Save Image in the system menu. You can also hold the photo to save it. If unavailable, download it first, then save it to Photos from Files.", photoDesktopHelp: "Download a PNG keepsake with the grove and the moment you captured.",
    androidWebGL: "The 3D scene could not start. Please update Android System WebView and try again.", androidSave: "Save to Photos", androidSaving: "Saving", androidPhotoHelp: "Save a framed photo with its capture time to the Dino Grove album.",
    sceneLabel: "A 3D grove with five dinosaur friends. Choose a dinosaur, then tap the ground to guide it. Drag to rotate and pinch or scroll to zoom.",
    sceneEyebrow: "LET'S EXPLORE", sceneHeadline: "Where shall we play?", selectHint: "Choose a friend, then tap the ground", moveHint: (name: string) => `${name} · Tap the ground to walk`, moveStatuses: { started: "Walking to your chosen spot", arrived: "Here we are. Pick another spot.", blocked: "A little crowded. Wait a moment or try another spot." },
    loading: "The grove is waking up", loadingDetail: "Leaves, starlight and five new friends",
    errorHeading: "Let's try that again", webgl: "The 3D scene could not start. Please try Safari or Chrome with WebGL support.", load: "The grove could not load. Please refresh and try again.", reload: "Reload",
    enterFullscreen: "Full screen", fullscreenButton: "Full screen", exitFullscreen: "Exit full screen", exitFullscreenShort: "Exit", exitImmersiveShort: "Exit view", openMenu: "Open menu", closeMenu: "Close menu", menuButton: "Menu", immersiveControls: "Immersive view controls",
    sceneControls: "Scene controls", resume: "Resume roaming", pause: "Pause roaming", resumeTitle: "Resume roaming (Space)", pauseTitle: "Pause roaming (Space)", reset: "Reset view", resetTitle: "Reset view (R)", paused: "Time is paused",
    selectDinosaur: "Choose a dinosaur", residents: "Pick a little friend", residentsSubtitle: "5 grove residents", aboutResident: (name: string) => `About ${name}`, closeDetails: "Close dinosaur details", selectedLabel: "Your companion", newResident: "New friend",
    closeUp: "Close-up", fullView: "View", greet: "Hello", feed: "Feed",
    drag: "Drag to rotate", wheel: "Scroll to zoom", touchDrag: "Drag to rotate", pinch: "Pinch to zoom", viewLabel: "Camera views", views: { grove: "Grove", pond: "Pond", overhead: "Above" },
    atmosphere: "A little more wonder", autoRotate: "Auto rotate", rotateOn: "The camera is circling", rotateOff: "Take a look around", music: "Grove music", musicOn: "A gentle woodland melody", musicOff: "Tap to hear the grove", musicStarting: "Getting music ready", on: "On", off: "Off", explorePanel: "Dinosaurs and grove settings", panelScroll: "Scroll for more ways to play",
    toolDescription: "Choose five dinosaur residents or change the camera view. 0 Triceratops, 1 Stegosaurus, 2 Brachiosaurus, 3 Tyrannosaurus, 4 Velociraptor.", toolClosed: "The grove is closed.", toolInvalid: "Please choose a valid dinosaur or camera view.",
    notifications: { immersiveFallback: "Immersive view is open. Browser controls remain visible.", androidSaved: "Photo saved to the Dino Grove album.", androidSaveFailed: "The photo could not be saved. Please try again.", paused: "Time is paused. You can still move the camera.", resumed: "Life in the grove carries on.", reset: "Back to the whole grove.", day: "The sun is up. Let's play on the grass.", sunset: "A peachy sunset settles over the grove.", night: "The stars are out. Moonlight lights the paths.", cycle: "Day and night will change. Let's wait for the stars.", captureSaved: "Photo download started. Check Downloads or Files.", captureFailed: "The photo could not be created. Please try again.", musicOn: "Grove music is on.", musicOff: "Grove music is off.", musicFailed: "Music could not start. Please tap again.", rotateOn: "The camera is circling. Drag to stop.", rotateOff: "Auto rotation has stopped.", shared: "The photo was passed to your system share menu.", shareFailed: "Sharing is unavailable. Download or hold the photo to save it.", moveStarted: "Off we go. Your friend will go around obstacles.", moveAdjusted: "There's an obstacle. Trying a safe spot nearby.", moveArrived: "Your friend has arrived.", moveBlocked: "A little crowded. Wait a moment or try another spot." },
    species: [
      { name: "Triceratops", subtitle: "The leaf lover", detail: "Three little horns and a leafy appetite. The best bites are close to the ground.", habit: "A taste for tender leaves", greeting: "Triceratops gives you a gentle little nod.", fed: "Triceratops has received your little treat." },
      { name: "Stegosaurus", subtitle: "The slow wanderer", detail: "A row of tiny mountains along its back, a swaying tail, and nowhere to rush.", habit: "A leisurely little explorer", greeting: "Stegosaurus swishes its tail to say hello.", fed: "Stegosaurus has received your little treat." },
      { name: "Brachiosaurus", subtitle: "The treetop dreamer", detail: "A long neck among the leaves, with the perfect view for spotting little friends.", habit: "At home among the treetops", greeting: "Brachiosaurus looks up and spots you.", fed: "Brachiosaurus has received your little treat." },
      { name: "Tyrannosaurus", subtitle: "The big friendly one", detail: "A big head, tiny arms and a proud little stride. Here in the grove, everyone is a friend.", habit: "Big steps, little arms", greeting: "Tyrannosaurus waves a tiny arm at you.", fed: "Tyrannosaurus happily accepts your treat." },
      { name: "Velociraptor", subtitle: "The curious explorer", detail: "Light on its feet, with a long tail for balance. Always first to find something interesting.", habit: "An eager little explorer", greeting: "Velociraptor tilts its head to say hello.", fed: "Velociraptor gives a happy tail swish for your treat." },
    ],
  },
};
