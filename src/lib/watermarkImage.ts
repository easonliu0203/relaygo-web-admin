/**
 * Client-side image watermarking + resizing for service case photos.
 *
 * - Resizes the image to fit within MAX_WIDTH × MAX_HEIGHT (preserves aspect ratio, no upscaling).
 * - Burns a diagonal repeating RelayGo watermark across the whole image.
 * - Adds a corner copyright stamp with a semi-opaque background.
 * - Exports as JPEG so the watermark is flattened into the pixels.
 *
 * Returns a Blob ready for upload to Supabase Storage.
 */

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const JPEG_QUALITY = 0.85;

const WATERMARK_TEXT = 'RelayGo  ·  relaygo.pro';
const WATERMARK_OPACITY = 0.16;
const WATERMARK_ANGLE_DEG = -28;
const CORNER_TEXT = '© relaygo.pro';

export interface WatermarkResult {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  outputSize: number;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('無法讀取圖片：' + e));
    };
    img.src = url;
  });
}

function computeFitSize(srcW: number, srcH: number): { w: number; h: number } {
  const scale = Math.min(MAX_WIDTH / srcW, MAX_HEIGHT / srcH, 1);
  return {
    w: Math.round(srcW * scale),
    h: Math.round(srcH * scale),
  };
}

function drawDiagonalWatermark(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  // Pick font size relative to image dimensions; clamp for tiny/huge images
  const fontSize = Math.max(18, Math.min(36, Math.round(canvasW / 38)));
  const stepX = Math.round(fontSize * 13);
  const stepY = Math.round(fontSize * 6.5);

  ctx.save();
  ctx.globalAlpha = WATERMARK_OPACITY;
  ctx.font = `600 ${fontSize}px -apple-system, "Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = Math.max(1, fontSize / 18);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Rotate the canvas; draw a grid that more than covers the visible area
  const angle = (WATERMARK_ANGLE_DEG * Math.PI) / 180;
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate(angle);

  // After rotation, the image diagonal is the safe upper bound
  const diag = Math.ceil(Math.sqrt(canvasW * canvasW + canvasH * canvasH));
  const startX = -diag;
  const endX = diag;
  const startY = -diag;
  const endY = diag;

  for (let y = startY; y < endY; y += stepY) {
    // Offset every other row for a tighter pattern
    const offset = (Math.floor((y - startY) / stepY) % 2) * (stepX / 2);
    for (let x = startX; x < endX; x += stepX) {
      ctx.strokeText(WATERMARK_TEXT, x + offset, y);
      ctx.fillText(WATERMARK_TEXT, x + offset, y);
    }
  }
  ctx.restore();
}

function drawCornerStamp(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  const fontSize = Math.max(12, Math.min(20, Math.round(canvasW / 65)));
  const paddingX = Math.round(fontSize * 0.8);
  const paddingY = Math.round(fontSize * 0.45);
  const margin = Math.round(fontSize * 0.8);

  ctx.save();
  ctx.font = `600 ${fontSize}px -apple-system, "Segoe UI", "Microsoft JhengHei", "PingFang TC", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const textWidth = ctx.measureText(CORNER_TEXT).width;
  const boxW = textWidth + paddingX * 2;
  const boxH = fontSize + paddingY * 2;
  const boxX = canvasW - margin - boxW;
  const boxY = canvasH - margin - boxH;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  // Rounded rect
  const r = Math.round(boxH / 2);
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(CORNER_TEXT, boxX + paddingX, boxY + boxH / 2);
  ctx.restore();
}

export async function watermarkAndResize(file: File): Promise<WatermarkResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('只能處理圖片檔');
  }

  const img = await loadImageFromFile(file);
  const { w, h } = computeFitSize(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Always paint a white background (in case source is transparent PNG)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Draw resized image
  ctx.drawImage(img, 0, 0, w, h);

  // Watermark layers
  drawDiagonalWatermark(ctx, w, h);
  drawCornerStamp(ctx, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob 失敗'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  return {
    blob,
    width: w,
    height: h,
    originalWidth: img.naturalWidth,
    originalHeight: img.naturalHeight,
    outputSize: blob.size,
  };
}
