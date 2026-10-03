/// <reference types="vite/client" />
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, Check, ChevronDown, CircleHelp, Download, Focus, Hand, Leaf, MapPin, MoonStar, Mountain, MousePointer2, Music2, Orbit, Pause, Play, RotateCcw, ScanEye, Share2, Sparkles, Sprout, Sun, Sunrise, Volume2, Waves, X } from "lucide-react";
import type { GroveAPI, Mood } from "./grove";
import DinoPortrait from "./DinoPortrait";
import { createGroveMusic } from "./music";
import { createFramedPhoto, type FramedPhoto } from "./photo";
import { hasAndroidPhotoSave, saveAndroidPhoto } from "./android";
import { LOCALE_STORAGE_KEY, readLocale, residentArt, translations, type Locale, type ToastKey } from "./i18n";

const views = [
  { id: "grove", icon: Mountain },
  { id: "pond", icon: Waves },
  { id: "overhead", icon: ScanEye },
] as const;
const phases = [{ id: "day", icon: Sun }, { id: "sunset", icon: Sunrise }, { id: "night", icon: MoonStar }] as const;
type View = typeof views[number]["id"];
type MoveStatus = { id: number; status: "started" | "arrived" | "blocked" };

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<GroveAPI | null>(null);
  const controlsPanel = useRef<HTMLElement>(null);
  const residentButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedId = useRef<number | null>(null);
  const music = useRef<ReturnType<typeof createGroveMusic> | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const captureButton = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [moreControls, setMoreControls] = useState(true);
  const [error, setError] = useState<"" | "webgl" | "load">("");
  const [locale, setLocale] = useState<Locale>(readLocale);
  const t = translations[locale];
  const species = t.species;
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View | null>("grove");
  const [focused, setFocused] = useState(false);
  const [mood, setMood] = useState<Mood>("day");
  const [dayCycle, setDayCycle] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const [moveStatus, setMoveStatus] = useState<MoveStatus | null>(null);
  const [photo, setPhoto] = useState<FramedPhoto | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savingNative, setSavingNative] = useState(false);
  const nativeAndroid = hasAndroidPhotoSave();
  const [toast, setToast] = useState<{ key: ToastKey; dinosaur?: number; id: number } | null>(null);
  const active = selected === null ? null : species[selected];
  const PhaseIcon = phases.find(phase => phase.id === mood)?.icon ?? Sun;

  const notify = useCallback((key: ToastKey, dinosaur?: number) => {
    setToast({ key, dinosaur, id: Date.now() });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.pageDescription);
    host.current?.querySelector("canvas")?.setAttribute("aria-label", t.sceneLabel);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* Private browsing may block storage. */ }
  }, [locale, ready, t]);

  useEffect(() => {
    document.documentElement.dataset.mood = mood;
    const chromeColors = { day: "#285e57", sunset: "#75442b", night: "#111a32" };
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", chromeColors[mood]);
  }, [mood]);

  const toastText = !toast ? "" : toast.key === "greet"
    ? species[toast.dinosaur ?? 0].greeting
    : toast.key === "feed" ? species[toast.dinosaur ?? 0].fed : t.notifications[toast.key];

  useEffect(() => {
    let alive = true;
    mounted.current = true;
    import("./grove").then(({ createGrove }) => {
      if (!alive || !host.current) return;
      try {
        api.current = createGrove(host.current, (id: number) => {
          if (alive && Number.isInteger(id) && id >= 0 && id < residentArt.length) {
            if (focusedId.current !== null && focusedId.current !== id) {
              focusedId.current = null;
              setFocused(false);
              setView("grove");
              api.current?.view("grove");
            }
            setSelected(id);
          }
        }, event => {
          if (!alive) return;
          if (event.type === "phase") setMood(event.phase);
          if (event.type === "rotate") setAutoRotate(event.enabled);
          if (event.type === "move") {
            setMoveStatus({ id: event.id, status: event.status });
            if (event.status === "started") {
              setPaused(false);
              focusedId.current = null;
              setFocused(false);
              setView(null);
            }
            notify(event.status === "started" ? event.adjusted ? "moveAdjusted" : "moveStarted" : event.status === "arrived" ? "moveArrived" : "moveBlocked");
          }
        });
        setReady(true);
      } catch (cause) {
        setError("webgl");
        console.error(cause);
      }
    }).catch(() => { if (alive) setError("load"); });
    return () => {
      alive = false;
      mounted.current = false;
      api.current?.dispose();
      api.current = null;
      music.current?.dispose();
      music.current = null;
    };
  }, [notify]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!photo) return;
    photoDialog.current?.showModal();
    return () => { URL.revokeObjectURL(photo.url); captureButton.current?.focus({ preventScroll: true }); };
  }, [photo]);

  useEffect(() => {
    const panel = controlsPanel.current;
    if (!panel) return;
    const frame = requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 720px), (max-width: 1100px) and (orientation: portrait)").matches) {
        const card = panel.querySelector<HTMLElement>(".dino-card");
        panel.scrollTop = card ? Math.max(0, card.offsetTop - 12) : 0;
      }
      setMoreControls(panel.scrollHeight - panel.clientHeight - panel.scrollTop > 12);
    });
    const observer = new ResizeObserver(() => setMoreControls(panel.scrollHeight - panel.clientHeight - panel.scrollTop > 12));
    observer.observe(panel);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [selected, ready]);

  const choose = useCallback((id: number) => {
    if (!api.current || !Number.isInteger(id) || id < 0 || id >= residentArt.length) return;
    if (focusedId.current !== null) {
      api.current.view("grove");
      setView("grove");
    }
    focusedId.current = null;
    setSelected(id);
    setFocused(false);
    setMoveStatus(null);
    api.current.clear();
    api.current.select(id);
  }, []);

  const changeView = useCallback((id: View) => {
    if (!api.current) return;
    setView(id);
    focusedId.current = null;
    setFocused(false);
    api.current.view(id);
  }, []);

  const closeCard = useCallback(() => {
    if (selected === null) return;
    setSelected(null);
    setMoveStatus(null);
    api.current?.clear();
    if (focused) changeView("grove");
    residentButtons.current[selected]?.focus({ preventScroll: true });
  }, [selected, focused, changeView]);

  const togglePause = useCallback(() => {
    if (!api.current) return;
    const next = !paused;
    api.current.pause(next);
    setPaused(next);
    notify(next ? "paused" : "resumed");
  }, [paused, notify]);

  const resetView = useCallback(() => {
    changeView("grove");
    notify("reset");
  }, [changeView, notify]);

  function handleCameraGesture() {
    focusedId.current = null;
    setFocused(false);
    setView(null);
  }

  function changeLight(phase: Mood | "auto") {
    if (!api.current) return;
    setDayCycle(phase === "auto");
    if (phase === "auto") api.current.setDayCycle(true);
    else {
      api.current.setMood(phase);
      setMood(phase);
    }
    notify(phase === "auto" ? "cycle" : phase);
  }

  function focusResident() {
    if (selected === null || !api.current) return;
    if (focused) { changeView("grove"); return; }
    api.current.focus(selected);
    focusedId.current = selected;
    setFocused(true);
  }

  function interact(action: "greet" | "feed") {
    if (selected === null || !api.current) return;
    api.current.pause(false);
    setPaused(false);
    api.current.interact(selected, action);
    setMoveStatus(null);
    notify(action, selected);
  }

  function toggleRotate() {
    if (!api.current) return;
    const next = !autoRotate;
    api.current.setAutoRotate(next);
    setAutoRotate(next);
    if (next) {
      focusedId.current = null;
      setFocused(false);
      setView(null);
    }
    notify(next ? "rotateOn" : "rotateOff");
  }

  async function toggleMusic() {
    if (musicBusy) return;
    if (musicOn) {
      music.current?.stop();
      setMusicOn(false);
      notify("musicOff");
      return;
    }
    setMusicBusy(true);
    try {
      music.current ??= createGroveMusic();
      await music.current.start();
      if (mounted.current) { setMusicOn(true); notify("musicOn"); }
    } catch {
      if (mounted.current) { setMusicOn(false); notify("musicFailed"); }
    } finally { if (mounted.current) setMusicBusy(false); }
  }

  async function capture() {
    if (!api.current || capturing) return;
    setCapturing(true);
    try {
      const source = api.current.capture();
      const result = await createFramedPhoto(source, locale);
      if (mounted.current) setPhoto(result);
      else URL.revokeObjectURL(result.url);
    } catch { if (mounted.current) notify("captureFailed"); }
    finally { if (mounted.current) setCapturing(false); }
  }

  async function downloadPhoto() {
    if (!photo || savingNative) return;
    if (nativeAndroid) {
      setSavingNative(true);
      try {
        await saveAndroidPhoto(photo.blob, photo.filename);
        if (mounted.current) notify("androidSaved");
      } catch { if (mounted.current) notify("androidSaveFailed"); }
      finally { if (mounted.current) setSavingNative(false); }
      return;
    }
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = photo.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    notify("captureSaved");
  }

  const canSharePhoto = !!photo && typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([photo.blob], photo.filename, { type: "image/png" })] });
  async function sharePhoto() {
    if (!photo || sharing || !canSharePhoto) return;
    setSharing(true);
    try {
      await navigator.share({ files: [new File([photo.blob], photo.filename, { type: "image/png" })], title: t.brand });
      if (mounted.current) notify("shared");
    } catch (cause) {
      if (mounted.current && !(cause instanceof Error && cause.name === "AbortError")) notify("shareFailed");
    } finally { if (mounted.current) setSharing(false); }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (photo) return; // Native dialog owns Escape and focus trapping while it is open.
      if (event.key === "Escape" && selected !== null) { event.preventDefault(); closeCard(); return; }
      if (!ready || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, a, [contenteditable='true']")) return;
      if (event.code === "Space") { event.preventDefault(); togglePause(); }
      else if (event.key.toLowerCase() === "r") resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, selected, photo, closeCard, togglePause, resetView]);

  useEffect(() => {
    type ModelContext = { registerTool: (tool: object, options?: { signal: AbortSignal }) => unknown; unregisterTool?: (name: string) => unknown };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool || !ready) return;
    const lifetime = new AbortController();
    const tool = {
      name: "explore_dinosaur_grove", description: t.toolDescription,
      inputSchema: { type: "object", properties: { dinosaur: { type: "integer", minimum: 0, maximum: 4 }, view: { type: "string", enum: views.map(item => item.id) } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (lifetime.signal.aborted) throw new Error(t.toolClosed);
        const value = input as { dinosaur?: number; view?: View };
        if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["dinosaur", "view"].includes(key)) || (value.dinosaur !== undefined && (!Number.isInteger(value.dinosaur) || value.dinosaur < 0 || value.dinosaur >= residentArt.length)) || (value.view !== undefined && !views.some(item => item.id === value.view))) throw new Error(t.toolInvalid);
        if (value.dinosaur !== undefined) choose(value.dinosaur);
        if (value.view) changeView(value.view);
        return { dinosaur: value.dinosaur === undefined ? null : species[value.dinosaur].name, view: value.view ?? null };
      },
    };
    try { Promise.resolve(context.registerTool(tool, { signal: lifetime.signal })).catch(() => {}); } catch { /* Optional browser capability. */ }
    return () => { lifetime.abort(); try { Promise.resolve(context.unregisterTool?.(tool.name)).catch(() => {}); } catch { /* Optional capability. */ } };
  }, [ready, choose, changeView, t, species]);

  return (
    <main className={`grove-app${active ? " has-selection" : ""}${focused ? " is-focused" : ""}`} data-mood={mood} data-locale={locale} data-platform={nativeAndroid ? "android" : "web"}>
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><img src={`${import.meta.env.BASE_URL}app-icon.svg`} alt="" width="50" height="50" /></div><div><h1>{t.brand}<span className="brand-period">.</span></h1><span className="brand-english">{t.brandSubtitle}</span></div></div>
        <div className="top-actions">
          <button className="language-button" onClick={() => setLocale(current => current === "zh" ? "en" : "zh")} aria-label={t.switchLanguage} title={t.switchLanguage}><span lang={locale === "zh" ? "en" : "zh-CN"}>{t.languageButton}</span></button>
          <button ref={captureButton} className="capture-button" disabled={!ready || capturing} onClick={capture} aria-label={t.savePhoto} title={t.savePhoto} aria-haspopup="dialog"><Camera size={21} /><span>{capturing ? t.capturing : t.photoButton}</span></button>
        </div>
      </header>

      <div className="workspace">
        <section className="scene-stage" aria-label={t.sceneControls}>
          <div className="canvas-host" ref={host} onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }} onPointerMove={event => { if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 8) { handleCameraGesture(); pointerStart.current = null; } }} onPointerUp={() => { pointerStart.current = null; }} onPointerCancel={() => { pointerStart.current = null; }} onWheel={handleCameraGesture} role="img" aria-label={t.sceneLabel} />
          <div className="scene-topline">
            <div className="scene-note"><span className="eyebrow"><Sparkles size={16} />{t.sceneEyebrow}</span><h2>{t.sceneHeadline}</h2></div>
            <div className="phase-badge" role="status" aria-live="polite"><span className={`phase-icon phase-${mood}`}><PhaseIcon size={23} /></span><span><strong>{t[mood]}<small>{dayCycle ? t.dayCycle : ""}</small></strong><span className="phase-description">{t.phaseDescription[mood]}</span></span></div>
          </div>
          <div className="scene-tools">
            <button className="icon-button" aria-label={paused ? t.resume : t.pause} aria-pressed={paused} title={paused ? t.resumeTitle : t.pauseTitle} onClick={togglePause} disabled={!ready}>{paused ? <Play size={21} /> : <Pause size={21} />}</button>
            <button className="icon-button" aria-label={t.reset} title={t.resetTitle} onClick={resetView} disabled={!ready}><RotateCcw size={21} /></button>
          </div>
          {paused && <div className="paused-label"><Pause size={14} />{t.paused}</div>}
          {!ready && !error && <div className="loading" role="status"><div className="loading-sprout"><Sprout size={32} /></div><span>{t.loading}…</span><small>{t.loadingDetail}</small></div>}
          {error && <div className="error-message" role="alert"><Leaf size={29} /><h2>{t.errorHeading}</h2><p>{nativeAndroid && error === "webgl" ? t.androidWebGL : t[error]}</p><button onClick={() => location.reload()}><RotateCcw size={18} />{t.reload}</button></div>}
          <div className="scene-bottom">
            <div className={`walk-hint${active ? " selected" : ""}`} role="status" aria-live="polite">{active ? <MapPin size={19} /> : <MousePointer2 size={19} />}<span>{active ? moveStatus?.id === selected ? t.moveStatuses[moveStatus.status] : t.moveHint(active.name) : t.selectHint}</span></div>
            <div className="scene-bottom-row"><nav className="view-switch" aria-label={t.viewLabel}>{views.map(preset => <button key={preset.id} disabled={!ready} aria-pressed={!focused && view === preset.id} onClick={() => changeView(preset.id)} className={!focused && view === preset.id ? "active" : ""}><preset.icon size={19} /><span>{t.views[preset.id]}</span></button>)}</nav><div className="gesture-hint"><span className="desktop-hint">{t.drag} · {t.wheel}</span><span className="mobile-hint">{t.touchDrag} · {t.pinch}</span></div></div>
          </div>
          <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">{toast && !photo && <div className="toast" key={toast.id}><Check size={18} /><span>{toastText}</span></div>}</div>
        </section>

        <aside ref={controlsPanel} className="control-panel" aria-label={t.explorePanel} onScroll={event => { const panel = event.currentTarget; setMoreControls(panel.scrollHeight - panel.clientHeight - panel.scrollTop > 12); }}>
          <section className="species-rail" aria-label={t.selectDinosaur}>
            <div className="rail-heading"><h2>{t.residents}</h2><span>{t.residentsSubtitle}</span></div>
            <div className="resident-list">{species.map((resident, id) => <button ref={node => { residentButtons.current[id] = node; }} disabled={!ready} className={`species-chip${selected === id ? " active" : ""}`} key={id} onClick={() => choose(id)} aria-pressed={selected === id} aria-label={resident.name} aria-expanded={selected === id} aria-controls="selected-dinosaur">
              <span className="portrait-wrap" style={{ "--resident-color": residentArt[id].color } as CSSProperties}><DinoPortrait kind={id} /></span><span className="species-name">{resident.name}</span>{selected === id && <span className="selected-check"><Check size={13} /></span>}
            </button>)}</div>
          </section>

          {active && selected !== null && <section id="selected-dinosaur" className="dino-card" aria-label={t.aboutResident(active.name)}>
            <button className="close-card icon-button" aria-label={t.closeDetails} onClick={closeCard}><X size={20} /></button>
            <span className="card-eyebrow">{t.selectedLabel}</span><h2>{active.name}</h2><span className="card-latin">{active.subtitle}</span>
            <div className="card-actions"><button className={focused ? "is-focused" : ""} disabled={!ready} onClick={focusResident} aria-pressed={focused}><Focus size={21} /><span>{focused ? t.fullView : t.closeUp}</span></button><button disabled={!ready} onClick={() => interact("greet")}><Hand size={21} /><span>{t.greet}</span></button><button className="feed-button" disabled={!ready} onClick={() => interact("feed")}><Sprout size={21} /><span>{t.feed}</span></button></div>
            <p className="card-description">{active.detail}</p><div className="card-habit"><Leaf size={15} /><span>{active.habit}</span></div>
          </section>}
          {!active && <div className="welcome-hint"><MapPin size={23} /><p>{t.selectHint}</p></div>}

          <section className="light-panel" aria-label={t.lightTitle}><h2><Sunrise size={20} />{t.lightTitle}</h2><div className="light-options"><button disabled={!ready} className={dayCycle ? "active" : ""} aria-label={t.dayCycle} aria-pressed={dayCycle} onClick={() => changeLight("auto")}><Orbit size={21} /><span>{t.cycle}</span></button>{phases.map(phase => <button key={phase.id} disabled={!ready} className={!dayCycle && mood === phase.id ? "active" : ""} aria-pressed={!dayCycle && mood === phase.id} onClick={() => changeLight(phase.id)}><phase.icon size={21} /><span>{t[phase.id]}</span></button>)}</div><p className="setting-note">{dayCycle ? t.cycleDescription : t.manualDescription}</p></section>
          <section className="atmosphere-panel" aria-label={t.atmosphere}>
            <button className="setting-toggle" aria-label={t.autoRotate} aria-pressed={autoRotate} disabled={!ready} onClick={toggleRotate}><span className="setting-icon rotation-icon"><Orbit size={24} /></span><span className="setting-copy"><strong>{t.autoRotate}</strong><small>{autoRotate ? t.rotateOn : t.rotateOff}</small></span><span className={`toggle-track${autoRotate ? " is-on" : ""}`} aria-hidden="true"><span /></span></button>
            <button className="setting-toggle" aria-label={t.music} aria-pressed={musicOn} disabled={musicBusy} onClick={toggleMusic}><span className="setting-icon music-icon">{musicOn ? <Volume2 size={24} /> : <Music2 size={24} />}</span><span className="setting-copy"><strong>{t.music}</strong><small>{musicBusy ? t.musicStarting : musicOn ? t.musicOn : t.musicOff}</small></span><span className={`toggle-track${musicOn ? " is-on" : ""}`} aria-hidden="true"><span /></span></button>
          </section>
          <p className="panel-footnote"><CircleHelp size={15} /><span>{t.touchDrag} · {t.pinch}</span></p>
        </aside>
      </div>
      {moreControls && <div className="mobile-panel-label" aria-hidden="true"><ChevronDown size={14} />{t.panelScroll}</div>}

      {photo && <dialog ref={photoDialog} className="photo-dialog" aria-labelledby="photo-title" aria-describedby="photo-description" onCancel={event => { event.preventDefault(); setPhoto(null); }}>
        <header className="photo-heading"><div><h2 id="photo-title">{t.photoTitle}</h2><p id="photo-description">{t.photoDescription}</p></div><button className="icon-button" aria-label={t.closePhoto} onClick={() => setPhoto(null)} autoFocus><X size={22} /></button></header>
        <img className="photo-preview" src={photo.url} alt={t.photoAlt} />
        <div className="photo-actions"><button className="photo-download" onClick={downloadPhoto} disabled={savingNative}><Download size={20} />{nativeAndroid ? (savingNative ? t.androidSaving : t.androidSave) : t.downloadPhoto}</button>{canSharePhoto && !nativeAndroid && <button className="photo-share" onClick={sharePhoto} disabled={sharing}><Share2 size={20} />{sharing ? t.savingPhoto : t.sharePhoto}</button>}</div>
        <p className="photo-help">{nativeAndroid ? t.androidPhotoHelp : <><span className="mobile-photo-help">{t.photoHelp}</span><span className="desktop-photo-help">{t.photoDesktopHelp}</span></>}</p>
        <div className="photo-feedback" role="status" aria-live="polite">{toast && ["captureSaved", "shared", "shareFailed", "androidSaved", "androidSaveFailed"].includes(toast.key) ? toastText : ""}</div>
      </dialog>}
    </main>
  );
}
