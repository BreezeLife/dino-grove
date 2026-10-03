import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Camera, Check, Focus, Hand, Leaf, Move, Mountain, Pause, Play, RotateCcw, ScanEye, Sprout, Sun, Sunset, Waves, X } from "lucide-react";
import type { GroveAPI } from "./grove";
import DinoPortrait from "./DinoPortrait";
import { LOCALE_STORAGE_KEY, readLocale, residentArt, translations, type Locale, type ToastKey } from "./i18n";

const views = [
  { id: "grove", icon: Mountain },
  { id: "pond", icon: Waves },
  { id: "overhead", icon: ScanEye },
] as const;
type View = typeof views[number]["id"];
type Mood = "day" | "sunset";

export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<GroveAPI | null>(null);
  const residentButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedId = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<"" | "webgl" | "load">("");
  const [locale, setLocale] = useState<Locale>(readLocale);
  const t = translations[locale];
  const species = t.species;
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View | null>("grove");
  const [focused, setFocused] = useState(false);
  const [mood, setMood] = useState<Mood>("day");
  const [toast, setToast] = useState<{ key: ToastKey; dinosaur?: number; id: number } | null>(null);
  const active = selected === null ? null : species[selected];

  const notify = useCallback((key: ToastKey, dinosaur?: number) => {
    setToast({ key, dinosaur, id: Date.now() });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.pageDescription);
    host.current?.querySelector("canvas")?.setAttribute("aria-label", t.sceneLabel);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* Storage may be unavailable in private browsing. */ }
  }, [locale, ready, t]);

  const toastText = !toast ? "" : toast.key === "greet"
    ? species[toast.dinosaur ?? 0].greeting
    : toast.key === "feed" ? species[toast.dinosaur ?? 0].fed : t.notifications[toast.key];

  useEffect(() => {
    let alive = true;
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
        });
        setReady(true);
      } catch (cause) {
        setError("webgl");
        console.error(cause);
      }
    }).catch(() => {
      if (alive) setError("load");
    });
    return () => {
      alive = false;
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const choose = useCallback((id: number) => {
    if (!api.current || !Number.isInteger(id) || id < 0 || id >= residentArt.length) return;
    if (focusedId.current !== null) {
      api.current.view("grove");
      setView("grove");
    }
    focusedId.current = null;
    setSelected(id);
    setFocused(false);
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

  function toggleMood() {
    if (!api.current) return;
    const next = mood === "day" ? "sunset" : "day";
    api.current.setMood(next);
    setMood(next);
    notify(next);
  }

  function focusResident() {
    if (selected === null || !api.current) return;
    if (focused) {
      changeView("grove");
      return;
    }
    api.current.focus(selected);
    focusedId.current = selected;
    setFocused(true);
  }

  function interact(action: "greet" | "feed") {
    if (selected === null || !api.current) return;
    api.current.pause(false);
    setPaused(false);
    api.current.interact(selected, action);
    notify(action, selected);
  }

  function capture() {
    if (!api.current) return;
    try {
      const source = api.current.capture();
      if (!source.startsWith("data:image/png")) throw new Error("Image capture failed");
      const link = document.createElement("a");
      link.href = source;
      link.download = `dino-grove-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify("captureSaved");
    } catch {
      notify("captureFailed");
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selected !== null) {
        event.preventDefault();
        closeCard();
        return;
      }
      if (!ready || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("button, input, textarea, select, a, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePause();
      } else if (event.key.toLowerCase() === "r") {
        resetView();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ready, selected, closeCard, togglePause, resetView]);

  useEffect(() => {
    type ModelContext = {
      registerTool: (tool: object, options?: { signal: AbortSignal }) => unknown;
      unregisterTool?: (name: string) => unknown;
    };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool || !ready) return;
    const lifetime = new AbortController();
    const tool = {
      name: "explore_dinosaur_grove",
      description: t.toolDescription,
      inputSchema: { type: "object", properties: { dinosaur: { type: "integer", minimum: 0, maximum: 2 }, view: { type: "string", enum: views.map(item => item.id) } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        if (lifetime.signal.aborted) throw new Error(t.toolClosed);
        const value = input as { dinosaur?: number; view?: View };
        if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["dinosaur", "view"].includes(key)) || (value.dinosaur !== undefined && (!Number.isInteger(value.dinosaur) || value.dinosaur < 0 || value.dinosaur >= residentArt.length)) || (value.view !== undefined && !views.some(item => item.id === value.view))) {
          throw new Error(t.toolInvalid);
        }
        if (value.dinosaur !== undefined) choose(value.dinosaur);
        if (value.view) changeView(value.view);
        return { dinosaur: value.dinosaur === undefined ? null : species[value.dinosaur].name, view: value.view ?? null };
      },
    };
    try { Promise.resolve(context.registerTool(tool, { signal: lifetime.signal })).catch(() => {}); } catch { /* Optional browser capability. */ }
    return () => {
      lifetime.abort();
      try { Promise.resolve(context.unregisterTool?.(tool.name)).catch(() => {}); } catch { /* Optional browser capability. */ }
    };
  }, [ready, choose, changeView, t, species]);

  return (
    <main className={`grove-app${active ? " has-selection" : ""}${focused ? " is-focused" : ""}`} data-mood={mood} data-locale={locale}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Sprout size={25} strokeWidth={1.6} /></div>
          <div><h1>{t.brand}<span className="brand-period">.</span></h1><span className="brand-english">{t.brandSubtitle}</span></div>
        </div>
        <div className="top-actions">
          <button className="language-button" onClick={() => setLocale(current => current === "zh" ? "en" : "zh")} aria-label={t.switchLanguage} title={t.switchLanguage}><span lang={locale === "zh" ? "en" : "zh-CN"}>{t.languageButton}</span></button>
          <button className="mood-button" disabled={!ready} onClick={toggleMood} aria-pressed={mood === "sunset"} aria-label={mood === "day" ? t.toSunset : t.toDay} title={mood === "day" ? t.toSunset : t.toDay}>
            {mood === "day" ? <Sun size={18} /> : <Sunset size={18} />}<span>{mood === "day" ? t.day : t.sunset}</span><span className="mood-dot" />
          </button>
          <span className="action-divider" />
          <button className="icon-button capture-button" disabled={!ready} onClick={capture} aria-label={t.savePhoto} title={t.savePhoto}><Camera size={20} strokeWidth={1.65} /><span>{t.photoButton}</span></button>
        </div>
      </header>

      <div className="canvas-host" ref={host} onPointerDown={handleCameraGesture} onWheel={handleCameraGesture} role="img" aria-label={t.sceneLabel} />
      <div className="scene-note" aria-hidden="true"><span className="eyebrow"><span /> {t.sceneEyebrow}</span><p>{t.headline[0]}<br /><span className="headline-space"> </span>{t.headline[1]}</p><span className="scene-note-caption">{t.caption}</span></div>

      {!ready && !error && <div className="loading" role="status"><div className="loading-sprout"><Sprout size={29} strokeWidth={1.5} /></div><span>{t.loading}<span className="loading-dots">…</span></span><small>{t.loadingDetail}</small></div>}
      {error && <div className="error-message" role="alert"><Leaf size={27} strokeWidth={1.5} /><h2>{t.errorHeading}</h2><p>{t[error]}</p><button onClick={() => location.reload()}><RotateCcw size={16} />{t.reload}</button></div>}

      <div className="scene-tools" aria-label={t.sceneControls}>
        <button className="icon-button" aria-label={paused ? t.resume : t.pause} aria-pressed={paused} title={paused ? t.resumeTitle : t.pauseTitle} onClick={togglePause} disabled={!ready}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
        <button className="icon-button" aria-label={t.reset} title={t.resetTitle} onClick={resetView} disabled={!ready}><RotateCcw size={18} /></button>
      </div>
      {paused && <div className="paused-label"><span />{t.paused}</div>}

      <aside className="species-rail" aria-label={t.selectDinosaur}>
        <div className="rail-heading"><span>{t.residents}</span><span>{t.residentsSubtitle}</span></div>
        <div className="resident-list">{species.map((resident, id) => (
          <button ref={node => { residentButtons.current[id] = node; }} disabled={!ready} className={`species-chip${selected === id ? " active" : ""}`} key={id} onClick={() => choose(id)} aria-pressed={selected === id} aria-label={resident.name}>
            <span className="portrait-wrap" style={{ "--resident-color": residentArt[id].color } as CSSProperties}><DinoPortrait kind={id} /></span>
            <span className="species-copy"><span className="species-name">{resident.name}</span><span className="species-latin">{resident.subtitle}</span></span>
            <span className="chip-number">0{id + 1}</span><ArrowUpRight className="chip-arrow" size={16} />
          </button>
        ))}</div>
        <p className="rail-footnote"><span />{t.railFootnote}</p>
      </aside>

      {active && selected !== null && <section className="dino-card" aria-label={t.aboutResident(active.name)}>
        <button className="close-card icon-button" aria-label={t.closeDetails} onClick={closeCard}><X size={18} /></button>
        <div className="card-heading"><div className="card-portrait" style={{ "--resident-color": residentArt[selected].color } as CSSProperties}><DinoPortrait kind={selected} /></div><div><span className="card-eyebrow">{t.residents} / 0{selected + 1}</span><h2>{active.name}</h2><span className="card-latin">{active.subtitle}</span></div></div>
        <p className="card-description">{active.detail}</p>
        <div className="card-habit"><Leaf size={13} strokeWidth={1.7} /><span>{active.habit}</span></div>
        <div className="card-actions">
          <button className={focused ? "is-focused" : ""} disabled={!ready} onClick={focusResident} aria-pressed={focused}><Focus size={16} /><span>{focused ? t.fullView : t.closeUp}</span></button>
          <button disabled={!ready} onClick={() => interact("greet")}><Hand size={16} /><span>{t.greet}</span></button>
          <button className="feed-button" disabled={!ready} onClick={() => interact("feed")}><Sprout size={16} /><span>{t.feed}</span></button>
        </div>
      </section>}

      <div className="toast-container" role="status" aria-live="polite" aria-atomic="true">{toast && <div className="toast" key={toast.id}><Check size={15} strokeWidth={1.8} /><span>{toastText}</span></div>}</div>
      <footer className="bottom-bar">
        <div className="gesture-hint"><Move size={15} strokeWidth={1.5} /><span className="desktop-hint">{t.drag}<span className="hint-dot">·</span>{t.wheel}</span><span className="mobile-hint">{t.touchDrag}<span className="hint-dot">·</span>{t.pinch}</span></div>
        <nav className="view-switch" aria-label={t.viewLabel}>{views.map(preset => <button key={preset.id} disabled={!ready} aria-pressed={!focused && view === preset.id} onClick={() => changeView(preset.id)} className={!focused && view === preset.id ? "active" : ""}><preset.icon size={17} strokeWidth={1.65} /><span>{t.views[preset.id]}</span></button>)}</nav>
        <div className="quiet-label"><span className="quiet-line" />{t.quiet}</div>
      </footer>
    </main>
  );
}
