import { useId } from "react";

/** Small, original vector portraits. All artwork is generated in the page. */
export default function DinoPortrait({ kind }: { kind: number }) {
  const id = useId().replace(/:/g, "");
  const colors = ["#edaf73", "#a7cb89", "#8dd7de", "#e79671", "#b8a4ee"];
  const color = colors[kind] ?? colors[0];
  return (
    <svg className="dino-portrait" viewBox="0 0 84 72" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="20" y1="12" x2="66" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} /><stop offset="1" stopColor={color} stopOpacity=".78" />
        </linearGradient>
      </defs>
      <ellipse cx="43" cy="63" rx="27" ry="3.5" fill="#355341" opacity=".08" />
      {kind === 0 && <>
        <path d="M24 43 8 38 16 50 27 53" fill="#bc855e" />
        <ellipse cx="35" cy="44" rx="23" ry="15" fill={`url(#${id})`} />
        <rect x="21" y="47" width="10" height="15" rx="4" fill="#ca8c5b" />
        <rect x="41" y="47" width="10" height="15" rx="4" fill="#d99865" />
        <path d="m47 17 7 3 8-2 4 7 7 4-2 8 3 7-7 6-4 8-10-2-8-3-5-10 1-10Z" fill="#b9825b" />
        <path d="m50 22 6 3 7-2 4 7 4 4-3 8 1 4-8 8-10-3-5-10 1-11Z" fill="#e1ac7d" />
        <path d="M53 33c9-3 19 2 23 12 4 9-7 13-17 10-10-2-13-15-6-22Z" fill={`url(#${id})`} />
        <path d="m62 33 4-15 4 17M53 32l-1-12 8 13M74 42l6-4-3 9" fill="#fff6de" />
        <circle cx="66" cy="42" r="2.2" fill="#354837" /><circle cx="66.6" cy="41.3" r=".65" fill="white" />
        <path d="M68 51q4 2 7-1" stroke="#85593f" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="61" cy="48" rx="3.4" ry="2.2" fill="#de866a" opacity=".48" />
      </>}
      {kind === 1 && <>
        <path d="m26 45-22-8 8 16 18 1" fill="#799164" />
        <path d="m19 35-2-13 11 7 3-15 12 12 7-12 9 18 8-1-2 13" fill="#d3ad78" stroke="#fff3d3" strokeWidth="1" />
        <ellipse cx="38" cy="44" rx="24" ry="15" fill={`url(#${id})`} />
        <rect x="21" y="48" width="10" height="14" rx="4" fill="#7e9869" />
        <rect x="43" y="47" width="10" height="15" rx="4" fill="#91a77a" />
        <path d="M53 39c10-5 23 2 23 12 0 7-11 10-21 5-6-3-7-14-2-17Z" fill="#a1b88c" />
        <circle cx="66" cy="47" r="2.2" fill="#354837" /><circle cx="66.6" cy="46.3" r=".65" fill="white" />
        <path d="M67 55q3 2 6-1" stroke="#566c49" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="60" cy="52" rx="3.4" ry="2" fill="#d89d7e" opacity=".6" />
      </>}
      {kind === 3 && <>
        <path d="M35 45C21 39 15 43 4 33c2 12 15 22 32 19" fill="#b6614c" />
        <ellipse cx="42" cy="40" rx="17" ry="19" transform="rotate(-15 42 40)" fill={`url(#${id})`} />
        <path d="M38 45c-9 0-12 7-9 12l-2 4c0 4 16 4 16 0l-4-4 8-7" fill="#c67c59" />
        <path d="M47 48c-6 1-8 6-6 10l-1 3c0 4 14 4 14 0l-4-4 6-5" fill="#e79671" />
        <path d="M39 24c-2-12 9-20 24-18 12 1 16 9 15 17l-1 9c-5 8-22 9-31 1Z" fill={`url(#${id})`} />
        <path d="M48 28q12 9 29 0l-1 5c-8 7-21 7-29 0Z" fill="#f6c095" />
        <path d="m60 30 2 4 3-3m4 0 2 3 3-5" fill="#fff4d9" />
        <path d="m49 39 6 5 4-3" stroke="#efa97f" strokeWidth="5" strokeLinecap="round" />
        <circle cx="65" cy="19" r="2.5" fill="#3c303c" /><circle cx="65.8" cy="18.2" r=".8" fill="white" />
        <circle cx="76" cy="21" r="1.1" fill="#a96647" />
        <ellipse cx="58" cy="26" rx="3.6" ry="2.2" fill="#f3bca0" />
        <path d="m34 24-4-3m3 12-5-2m6 11-5 1" stroke="#b6614c" strokeWidth="2.5" strokeLinecap="round" />
      </>}
      {kind === 4 && <>
        <path d="M35 42C20 43 11 40 3 28c0 16 15 27 34 23" fill="#9380c8" />
        <ellipse cx="41" cy="41" rx="17" ry="12" transform="rotate(-20 41 41)" fill={`url(#${id})`} />
        <path d="m37 46-8 9 5 7h11l-8-6 9-8" fill="#9683cf" />
        <path d="m49 43-5 10 7 8h10l-9-8 5-9" fill="#b5a0ee" />
        <path d="M48 38c-1-8 1-18 8-24 5-4 15-3 19 2 4 5 5 12-2 16-5 2-10 0-14 1l-3 12Z" fill={`url(#${id})`} />
        <path d="M54 15c0-8 4-13 8-11l3 8M59 15c3-9 9-11 12-8l-5 9" fill="#d3c2ff" />
        <path d="m52 37 7 4 6-5" stroke="#cfbdf7" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="68" cy="22" r="2.4" fill="#3b354e" /><circle cx="68.7" cy="21.2" r=".75" fill="white" />
        <path d="M70 29q4 1 6-2" stroke="#746090" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="61" cy="28" rx="3.3" ry="2" fill="#e3b0d2" />
        <path d="m33 37-5-1m9 4-6 1m11 3-5 2" stroke="#7b6cba" strokeWidth="2" strokeLinecap="round" />
      </>}
      {kind === 2 && <>
        <path d="m27 45-21-4 10 12 16 1" fill="#6d9ca1" />
        <ellipse cx="35" cy="47" rx="22" ry="13" fill={`url(#${id})`} />
        <rect x="23" y="49" width="10" height="14" rx="4" fill="#71a2a7" />
        <rect x="43" y="47" width="10" height="16" rx="4" fill="#85b6bb" />
        <path d="M43 47c7-7 5-22 7-30 1-7 13-8 16-1 2 5-3 11-5 16l-3 22Z" fill={`url(#${id})`} />
        <path d="M49 15c0-9 10-13 19-8 7 4 11 11 5 15-7 4-25 3-24-7Z" fill="#98c6c7" />
        <circle cx="66" cy="14" r="2.2" fill="#354837" /><circle cx="66.6" cy="13.3" r=".65" fill="white" />
        <path d="M67 20q4 2 6-1" stroke="#4b7a7a" strokeWidth="1.4" strokeLinecap="round" />
        <ellipse cx="59" cy="19" rx="3.4" ry="2" fill="#d8b5a1" opacity=".7" />
      </>}
    </svg>
  );
}
