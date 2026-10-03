export type Locale = "zh" | "en";
export type ToastKey = "paused" | "resumed" | "reset" | "day" | "sunset" | "captureSaved" | "captureFailed" | "greet" | "feed";
export const LOCALE_STORAGE_KEY = "dino-grove-locale";

export function readLocale(): Locale {
  try { return localStorage.getItem(LOCALE_STORAGE_KEY) === "en" ? "en" : "zh"; }
  catch { return "zh"; }
}

export const residentArt = [
  { latin: "Triceratops", color: "#d99865" },
  { latin: "Stegosaurus", color: "#93aa7d" },
  { latin: "Brachiosaurus", color: "#85b6bb" },
] as const;

export const translations = {
  zh: {
    pageTitle: "恐龙小丛林 · Dino Grove",
    pageDescription: "一座可以慢慢探索的三维恐龙小丛林。认识三角龙、剑龙和长颈龙，旋转视角、打招呼，享受晨光与落日。",
    brand: "恐龙小丛林", brandSubtitle: "DINO GROVE", switchLanguage: "切换到英文", languageButton: "EN",
    day: "晨光", sunset: "落日", toSunset: "切换到落日", toDay: "切换到晨光",
    savePhoto: "保存场景照片", photoButton: "拍张照片",
    sceneLabel: "恐龙漫游的三维小丛林。可拖动旋转、缩放，或使用居民和视角按钮探索。",
    sceneEyebrow: "A LITTLE PREHISTORIC WORLD", headline: ["小小世界。", "慢慢相遇。"], caption: "把日子，交给树影和微风。",
    loading: "小丛林正在醒来", loadingDetail: "树叶、阳光，还有三位新朋友",
    errorHeading: "再等一阵风", webgl: "暂时无法开启 3D 场景。请尝试支持 WebGL 的 Safari 或 Chrome。", load: "小丛林暂时没有加载成功，请刷新后重试。", reload: "重新加载",
    sceneControls: "场景控制", resume: "继续漫游", pause: "暂停漫游", resumeTitle: "继续漫游（空格）", pauseTitle: "暂停漫游（空格）", reset: "回到初始视角", resetTitle: "回到初始视角（R）", paused: "时间暂停中",
    selectDinosaur: "选择恐龙", residents: "丛林居民", residentsSubtitle: "MEET THE LOCALS", railFootnote: "各有各的慢节奏", aboutResident: (name: string) => `${name}介绍`, closeDetails: "关闭恐龙介绍",
    closeUp: "靠近看", fullView: "看全景", greet: "打招呼", feed: "喂点心",
    drag: "拖动旋转", wheel: "滚轮缩放", touchDrag: "单指旋转", pinch: "双指缩放", viewLabel: "观察视角", views: { grove: "全景", pond: "池畔", overhead: "俯瞰" }, quiet: "在这里，不必着急。",
    toolDescription: "选择小丛林的三位恐龙居民，或切换观察视角。0 三角龙，1 剑龙，2 长颈龙。", toolClosed: "小丛林已关闭。", toolInvalid: "请选择有效的恐龙或视角。",
    notifications: { paused: "时间停下来了，镜头仍可以自由转动。", resumed: "小丛林继续慢慢生长。", reset: "已回到小丛林全景。", day: "晨光落在树梢上。", sunset: "给小丛林披上一层落日。", captureSaved: "场景照片已生成，请在下载中查看。", captureFailed: "场景照片没有保存成功，请再试一次。" },
    species: [
      { name: "三角龙", subtitle: "Triceratops", detail: "三只小角，一圈大颈盾。低下头，就能找到今天最嫩的叶子。", habit: "爱吃嫩叶", greeting: "三角龙向你轻轻点了点头。", fed: "三角龙收到你的小点心啦。" },
      { name: "剑龙", subtitle: "Stegosaurus", detail: "背上驮着一排小山，尾巴轻轻摇。它有自己的散步节奏。", habit: "慢步旅行家", greeting: "剑龙摇了摇尾巴，和你打招呼。", fed: "剑龙收到你的小点心啦。" },
      { name: "长颈龙", subtitle: "Brachiosaurus", detail: "把脖子伸进树叶之间。站得高一点，连风都更温柔。", habit: "喜欢树梢", greeting: "长颈龙抬起头，看见你啦。", fed: "长颈龙收到你的小点心啦。" },
    ],
  },
  en: {
    pageTitle: "Dino Grove · A little living world",
    pageDescription: "A peaceful 3D dinosaur grove. Meet Triceratops, Stegosaurus and Brachiosaurus, explore the island, share a snack, and watch the light change.",
    brand: "Dino Grove", brandSubtitle: "SLOW & WILD", switchLanguage: "Switch to Chinese", languageButton: "中文",
    day: "Morning", sunset: "Sunset", toSunset: "Switch to sunset", toDay: "Switch to morning",
    savePhoto: "Save scene photo", photoButton: "Take a photo",
    sceneLabel: "A 3D grove with roaming dinosaurs. Drag to rotate, zoom, or explore using the resident and view buttons.",
    sceneEyebrow: "A LITTLE PREHISTORIC WORLD", headline: ["A tiny world.", "Take it slow."], caption: "Leave the hurry at the edge.",
    loading: "The grove is waking up", loadingDetail: "Leaves, sunlight, and three new friends",
    errorHeading: "A little more time", webgl: "The 3D scene could not start. Please try Safari or Chrome with WebGL support.", load: "The grove could not load. Please refresh and try again.", reload: "Reload",
    sceneControls: "Scene controls", resume: "Resume roaming", pause: "Pause roaming", resumeTitle: "Resume roaming (Space)", pauseTitle: "Pause roaming (Space)", reset: "Reset view", resetTitle: "Reset view (R)", paused: "Time is paused",
    selectDinosaur: "Choose a dinosaur", residents: "Residents", residentsSubtitle: "MEET THE LOCALS", railFootnote: "Each at their own pace", aboutResident: (name: string) => `About ${name}`, closeDetails: "Close dinosaur details",
    closeUp: "Close-up", fullView: "View", greet: "Hello", feed: "Feed",
    drag: "Drag to rotate", wheel: "Scroll to zoom", touchDrag: "Drag to rotate", pinch: "Pinch to zoom", viewLabel: "Camera views", views: { grove: "Grove", pond: "Pond", overhead: "Above" }, quiet: "There is no hurry here.",
    toolDescription: "Choose one of three dinosaur residents or change the camera view. 0 Triceratops, 1 Stegosaurus, 2 Brachiosaurus.", toolClosed: "The grove is closed.", toolInvalid: "Please choose a valid dinosaur or camera view.",
    notifications: { paused: "Time is paused. You can still move the camera.", resumed: "Life in the grove carries on.", reset: "Back to the whole grove.", day: "Morning light settles on the treetops.", sunset: "A little sunset warmth for the grove.", captureSaved: "Your scene photo is ready. Check your downloads.", captureFailed: "The scene photo could not be saved. Please try again." },
    species: [
      { name: "Triceratops", subtitle: "The leaf lover", detail: "Three little horns and a leafy appetite. The best bites are close to the ground.", habit: "A taste for tender leaves", greeting: "Triceratops gives you a gentle little nod.", fed: "Triceratops has received your little treat." },
      { name: "Stegosaurus", subtitle: "The slow wanderer", detail: "A row of tiny mountains along its back, a swaying tail, and nowhere to rush.", habit: "A leisurely little explorer", greeting: "Stegosaurus swishes its tail to say hello.", fed: "Stegosaurus has received your little treat." },
      { name: "Brachiosaurus", subtitle: "The treetop dreamer", detail: "A long neck among the leaves. Up in the treetops, even the breeze feels softer.", habit: "At home among the treetops", greeting: "Brachiosaurus looks up and spots you.", fed: "Brachiosaurus has received your little treat." },
    ],
  },
};
