export type FramedPhoto = { url: string; blob: Blob; filename: string; takenAt: string };

export function formatCaptureTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}  ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}  UTC${offset >= 0 ? "+" : "−"}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

/** Combines the actual captured scene with an original, locally drawn keepsake frame. */
export async function createFramedPhoto(source: string, locale: "zh" | "en", shotTime = new Date()): Promise<FramedPhoto> {
  if (!source.startsWith("data:image/png")) throw new Error("Scene capture is not a PNG");
  const image = new Image();
  image.src = source;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error("Scene capture is empty");
  const scale = Math.min(2, 1800 / image.naturalWidth, 1600 / image.naturalHeight);
  const photoWidth = Math.round(image.naturalWidth * scale);
  const photoHeight = Math.round(image.naturalHeight * scale);
  const width = Math.max(820, photoWidth + 72);
  const margin = 36, header = 130, footer = 138;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = photoHeight + header + footer;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Photo framing is unavailable");
  const takenAt = formatCaptureTime(shotTime);
  ctx.fillStyle = "#122332";
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.strokeStyle = "#47706e";
  ctx.lineWidth = 2;
  ctx.strokeRect(15, 15, width - 30, canvas.height - 30);

  function star(x: number, y: number, radius: number, color: string) {
    ctx!.fillStyle = color;
    ctx!.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? radius * .3 : radius;
      const a = i * Math.PI / 4 - Math.PI / 2;
      ctx!.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx!.closePath(); ctx!.fill();
  }
  star(width - 62, 64, 23, "#fbd781");
  star(width - 98, 89, 10, "#8fe0c2");
  star(width - 104, 38, 7, "#b8c9ff");
  ctx.fillStyle = "#f5f4df";
  ctx.font = '800 39px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText("恐龙小丛林", margin + 5, 65);
  ctx.fillStyle = "#a2e2c8";
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText("DINO GROVE  /  LITTLE MOMENTS, BIG ADVENTURES", margin + 7, 100);

  const imageX = (width - photoWidth) / 2;
  ctx.fillStyle = "#f5f4df";
  ctx.fillRect(margin - 5, header - 5, width - margin * 2 + 10, photoHeight + 10);
  ctx.fillStyle = "#192f3c";
  ctx.fillRect(margin, header, width - margin * 2, photoHeight);
  ctx.drawImage(image, imageX, header, photoWidth, photoHeight);

  ctx.fillStyle = "#f4e1ae";
  ctx.font = '700 27px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(locale === "zh" ? "把今天的小冒险，装进口袋。" : "A little adventure to keep.", margin + 7, header + photoHeight + 54);
  ctx.fillStyle = "#c4d6df";
  ctx.font = '500 21px system-ui, sans-serif';
  ctx.fillText(`${locale === "zh" ? "拍摄于" : "Captured"}  ${takenAt}`, margin + 7, header + photoHeight + 94);
  // Tiny three-toed footprints finish the frame, without relying on emoji fonts.
  for (const [x, y, rotate] of [[width - 72, canvas.height - 69, -.3], [width - 116, canvas.height - 46, .15]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotate); ctx.fillStyle = "#8fe0c2";
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    for (const dx of [-10, 0, 10]) { ctx.beginPath(); ctx.ellipse(dx, -16 + Math.abs(dx) / 3, 4, 6, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG encoding failed")), "image/png"));
  return { url: URL.createObjectURL(blob), blob, filename: `dino-grove-${shotTime.toISOString().replace(/[:.]/g, "-")}.png`, takenAt };
}
