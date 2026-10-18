import html2canvas from "html2canvas-pro";

/**
 * Mobile Safari silently caps canvas allocations: anything past these limits
 * comes back as a blank bitmap instead of throwing. The graphic canvases are
 * 2100x2100 (Top 16/32) and 3411x2078 (Top 64), so a scale-2 render lands at
 * 4200x4200 / 6823x4156 and exceeds both caps on a phone.
 */
const MAX_CANVAS_DIMENSION = 4096;
const MAX_CANVAS_AREA = 16_777_216;

export const PREFERRED_EXPORT_SCALE = 2;

export interface ExportedImage {
  filename: string;
  blob: Blob;
  file: File;
  /** Object URL for previewing/saving. Release it with releaseImages(). */
  url: string;
  width: number;
  height: number;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS reports a Macintosh UA, so touch points are the only tell.
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /Android|iPhone|iPad|iPod/i.test(ua) || isIPadOS;
}

/** Largest scale (up to `preferred`) that still fits inside the mobile caps. */
export function getSafeExportScale(
  width: number,
  height: number,
  preferred = PREFERRED_EXPORT_SCALE
): number {
  if (width <= 0 || height <= 0) return preferred;
  const dimensionLimit = MAX_CANVAS_DIMENSION / Math.max(width, height);
  const areaLimit = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  return Math.min(preferred, dimensionLimit, areaLimit);
}

async function waitForImages(element: HTMLElement) {
  const images = element.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        resolve(blob);
        return;
      }
      reject(
        new Error(
          "The browser returned an empty image. This usually means the graphic is too large for this device."
        )
      );
    }, "image/png");
  });
}

export async function renderElementToImage(
  element: HTMLDivElement,
  name: string
): Promise<ExportedImage> {
  const originalTransform = element.style.transform;
  element.style.transform = "none";

  try {
    await waitForImages(element);
    // Let the transform reset paint before measuring/rendering.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const scale = isMobileDevice()
      ? getSafeExportScale(element.offsetWidth, element.offsetHeight)
      : PREFERRED_EXPORT_SCALE;

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
    });

    const blob = await canvasToBlob(canvas);
    const filename = `${name}-${Date.now()}.png`;

    return {
      filename,
      blob,
      file: new File([blob], filename, { type: "image/png" }),
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    element.style.transform = originalTransform;
  }
}

export function downloadImage(image: ExportedImage) {
  const link = document.createElement("a");
  link.href = image.url;
  link.download = image.filename;
  link.rel = "noopener";
  // Firefox and several mobile browsers ignore clicks on a detached anchor.
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function canShareImages(images: ExportedImage[]): boolean {
  if (images.length === 0) return false;
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    return navigator.canShare({ files: images.map((image) => image.file) });
  } catch {
    return false;
  }
}

/** Returns false when the user dismissed the share sheet. */
export async function shareImages(
  images: ExportedImage[],
  title: string
): Promise<boolean> {
  await navigator.share({ files: images.map((image) => image.file), title });
  return true;
}

export function releaseImages(images: ExportedImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.url));
}
