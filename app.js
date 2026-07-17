import { translations } from "./locales.js?v=0.7.6";

const CTEX_WEBP_PAYLOAD_OFFSET = 56;
const CTEX_MAX_DIMENSION = 0xffff;
const DATA_FORMAT_WEBP = 2;
const IMAGE_FORMAT_RGB8 = 4;
const IMAGE_FORMAT_RGBA8 = 5;
const JPEG_METADATA_LIMIT = 2 * 1024 * 1024;
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPG_EXTENSION = /\.(jpg|jpeg|jpe|jfif)$/i;
const PRESET_COLORS = { white: "#ffffff", gray: "#808080", black: "#000000" };
const SUPPORTED_LANGUAGES = ["en", "ko", "zh-CN", "zh-TW", "ja", "ru"];
const RASTER_FORMATS = {
  png: { matches: isPng, inspect: inspectPng, fallbackFormat: "PNG" },
  jpg: { matches: isJpg, inspect: inspectJpeg, fallbackFormat: "JPEG" }
};

const state = {
  file: null,
  image: null,
  sourceWidth: 0,
  sourceHeight: 0,
  width: 0,
  height: 0,
  dpi: null,
  rotation: 0,
  flipX: false,
  flipY: false,
  zoom: 1,
  autoFit: true,
  language: getSavedLanguage(),
  theme: getSavedTheme(),
  background: { mode: "white", color: "#ffffff", customColor: "#ffffff" },
  status: { key: "start", type: "info", values: {} }
};

const $ = (id) => document.getElementById(id);
const elements = {
  openPng: $("open-png"),
  openJpg: $("open-jpg"),
  openCtex: $("open-ctex"),
  clearFile: $("clear-file"),
  pngInput: $("png-input"),
  jpgInput: $("jpg-input"),
  ctexInput: $("ctex-input"),
  exportPng: $("export-png"),
  exportJpg: $("export-jpg"),
  exportCtex: $("export-ctex"),
  rotateLeft: $("rotate-left"),
  rotateRight: $("rotate-right"),
  rotate180: $("rotate-180"),
  resetTransform: $("reset-transform"),
  flipHorizontal: $("flip-horizontal"),
  flipVertical: $("flip-vertical"),
  jpgBackground: $("jpg-background"),
  bgR: $("bg-r"),
  bgG: $("bg-g"),
  bgB: $("bg-b"),
  bgHex: $("bg-hex"),
  bgColorPicker: $("bg-color-picker"),
  autoFit: $("auto-fit"),
  themeToggle: $("theme-toggle"),
  dropZone: $("drop-zone"),
  previewPanel: $("preview-panel"),
  canvas: $("preview-canvas"),
  canvasWrap: $("canvas-wrap"),
  status: $("status"),
  statusIcon: $("status-icon"),
  statusText: $("status-text"),
  fileName: $("file-name"),
  fileFormat: $("file-format"),
  fileSize: $("file-size"),
  resolution: $("resolution"),
  zoomIn: $("zoom-in"),
  zoomOut: $("zoom-out"),
  zoomReset: $("zoom-reset"),
  languageSelect: $("language-select")
};
const infoButtons = [...document.querySelectorAll("[data-info-button]")];
const context = elements.canvas.getContext("2d", { alpha: true, willReadFrequently: true });

class StatusError extends Error {
  constructor(key) {
    super(key);
    this.key = key;
  }
}

elements.openPng.addEventListener("click", () => elements.pngInput.click());
elements.openJpg.addEventListener("click", () => elements.jpgInput.click());
elements.openCtex.addEventListener("click", () => elements.ctexInput.click());
elements.clearFile.addEventListener("click", clearDocument);
elements.pngInput.addEventListener("change", (event) => handleRasterInput(event, "png"));
elements.jpgInput.addEventListener("change", (event) => handleRasterInput(event, "jpg"));
elements.ctexInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  await openCtex(file);
});
elements.exportPng.addEventListener("click", exportPng);
elements.exportJpg.addEventListener("click", exportJpg);
elements.exportCtex.addEventListener("click", exportCtex);
elements.rotateLeft.addEventListener("click", () => rotate(-90, "rotatedLeft"));
elements.rotateRight.addEventListener("click", () => rotate(90, "rotatedRight"));
elements.rotate180.addEventListener("click", () => rotate(180, "rotated180"));
elements.resetTransform.addEventListener("click", resetTransform);
elements.flipHorizontal.addEventListener("click", () => flip("x"));
elements.flipVertical.addEventListener("click", () => flip("y"));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom + .1));
elements.zoomOut.addEventListener("click", () => setZoom(state.zoom - .1));
elements.zoomReset.addEventListener("click", () => setZoom(1));
elements.languageSelect.addEventListener("change", (event) => setLanguage(event.target.value));
elements.themeToggle.addEventListener("click", toggleTheme);
elements.jpgBackground.addEventListener("change", () => setBackgroundMode(elements.jpgBackground.value));
elements.bgR.addEventListener("input", updateCustomFromRgb);
elements.bgG.addEventListener("input", updateCustomFromRgb);
elements.bgB.addEventListener("input", updateCustomFromRgb);
elements.bgHex.addEventListener("input", updateCustomFromHex);
elements.bgColorPicker.addEventListener("input", () => setCustomBackground(elements.bgColorPicker.value));
elements.autoFit.addEventListener("change", toggleAutoFit);
window.addEventListener("resize", () => {
  if (state.file && state.autoFit) setZoom(fitZoom());
});

for (const name of ["dragenter", "dragover"]) {
  elements.previewPanel.addEventListener(name, (event) => {
    event.preventDefault();
    elements.previewPanel.classList.add("dragging");
  });
}
for (const name of ["dragleave", "drop"]) {
  elements.previewPanel.addEventListener(name, (event) => {
    event.preventDefault();
    elements.previewPanel.classList.remove("dragging");
  });
}
elements.previewPanel.addEventListener("drop", (event) => openDroppedFile(event.dataTransfer.files[0]));

for (const button of infoButtons) {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const control = button.closest(".info-control");
    const shouldOpen = !control.classList.contains("is-open");
    closeInfoPopovers();
    if (shouldOpen) {
      control.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });
}
document.addEventListener("click", closeInfoPopovers);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  closeInfoPopovers();
  if (document.activeElement?.matches?.("[data-info-button]")) document.activeElement.blur();
});

function t(key, values = {}) {
  return translations[state.language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function setLanguage(language) {
  state.language = SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  document.documentElement.lang = state.language;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-aria]")) node.setAttribute("aria-label", t(node.dataset.i18nAria));
  for (const [element, key] of [
    [elements.rotateLeft, "rotateLeft"],
    [elements.rotateRight, "rotateRight"],
    [elements.rotate180, "rotate180"],
    [elements.resetTransform, "resetTransform"],
    [elements.flipHorizontal, "flipHorizontal"],
    [elements.flipVertical, "flipVertical"],
    [elements.zoomOut, "zoomOut10"],
    [elements.zoomReset, "zoomReset"],
    [elements.zoomIn, "zoomIn10"]
  ]) setButtonLabel(element, key);
  elements.languageSelect.value = state.language;
  try { localStorage.setItem("ctex-converter-language", state.language); } catch {}
  renderStatus();
  applyTheme();
}

function setButtonLabel(element, key) {
  element.setAttribute("aria-label", t(key));
  element.title = t(key);
}

function closeInfoPopovers() {
  for (const button of infoButtons) {
    button.closest(".info-control").classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }
}

async function handleRasterInput(event, kind) {
  const file = event.target.files[0];
  event.target.value = "";
  await openRasterImage(file, kind);
}

async function openDroppedFile(file) {
  if (!file) return;
  if (file.name.toLowerCase().endsWith(".ctex")) {
    await openCtex(file);
    return;
  }
  const match = Object.entries(RASTER_FORMATS).find(([, descriptor]) => descriptor.matches(file));
  if (match) await openRasterImage(file, match[0]);
  else setStatus("unsupportedFile", "error");
}

async function openRasterImage(file, kind) {
  if (!file) return;
  const descriptor = RASTER_FORMATS[kind];
  try {
    if (!descriptor || !descriptor.matches(file)) throw new StatusError("unsupportedFile");
    const metadataPromise = descriptor.inspect(file).catch(() => ({ format: descriptor.fallbackFormat, dpi: null }));
    const [image, metadata] = await Promise.all([decodeImage(file), metadataPromise]);
    setDocument(file, image, metadata);
    setStatus("opened", "success", { name: file.name });
  } catch (error) {
    setStatus(error instanceof StatusError ? error.key : "imageRead", "error");
  }
}

async function openCtex(file) {
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = validateWebpCtex(bytes);
    const image = await decodeImage(new Blob([payload], { type: "image/webp" }));
    if (image.naturalWidth !== readUint32(bytes, 8) || image.naturalHeight !== readUint32(bytes, 12)) throw new StatusError("ctexRead");
    const rgba = readUint32(bytes, 48) === IMAGE_FORMAT_RGBA8;
    const pixelFormat = rgba ? "RGBA8" : "RGB8";
    const bitDepth = rgba ? 32 : 24;
    setDocument(file, image, { format: `CTEX (GST2 / WebP / ${pixelFormat}, ${bitDepth}-bit)`, dpi: null });
    setStatus("opened", "success", { name: file.name });
  } catch (error) {
    setStatus(error instanceof StatusError ? error.key : "ctexRead", "error");
  }
}

function validateWebpCtex(bytes) {
  if (bytes.length < CTEX_WEBP_PAYLOAD_OFFSET) throw new StatusError("ctexRead");
  if (readAscii(bytes, 0, 4) !== "GST2" || readUint32(bytes, 4) !== 1 || readUint32(bytes, 36) !== DATA_FORMAT_WEBP) throw new StatusError("unsupportedCtex");
  const width = readUint32(bytes, 8);
  const height = readUint32(bytes, 12);
  if (!width || !height || readUint16(bytes, 40) !== width || readUint16(bytes, 42) !== height) throw new StatusError("ctexRead");
  const pixelFormat = readUint32(bytes, 48);
  if (pixelFormat !== IMAGE_FORMAT_RGB8 && pixelFormat !== IMAGE_FORMAT_RGBA8) throw new StatusError("unsupportedCtex");
  if (readUint32(bytes, 52) !== bytes.length - CTEX_WEBP_PAYLOAD_OFFSET || readAscii(bytes, 56, 4) !== "RIFF" || readAscii(bytes, 64, 4) !== "WEBP") throw new StatusError("ctexRead");
  return bytes.slice(CTEX_WEBP_PAYLOAD_OFFSET);
}

async function inspectPng(file) {
  const bytes = new Uint8Array(await file.slice(0, 33).arrayBuffer());
  if (bytes.length < 26 || !isPngSignature(bytes) || readAscii(bytes, 12, 4) !== "IHDR") return { format: "PNG", dpi: null };
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const colorTypes = {
    0: { label: "Grayscale", channels: 1 },
    2: { label: "RGB", channels: 3 },
    3: { label: "Indexed", channels: 1 },
    4: { label: "Grayscale + Alpha", channels: 2 },
    6: { label: "RGBA", channels: 4 }
  };
  const color = colorTypes[colorType];
  if (!color || !bitDepth) return { format: "PNG", dpi: null };
  return { format: `PNG (${color.label}, ${bitDepth * color.channels}-bit)`, dpi: null };
}

async function inspectJpeg(file) {
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, JPEG_METADATA_LIMIT)).arrayBuffer());
  const metadata = parseJpegMetadata(bytes);
  let format = "JPEG";
  if (metadata.precision && metadata.components) {
    const model = metadata.components === 1 ? "Grayscale" : metadata.components === 3 ? "RGB" : metadata.components === 4 ? "CMYK" : `${metadata.components}-channel`;
    format = `JPEG (${model}, ${metadata.precision * metadata.components}-bit)`;
  }
  return { format, dpi: metadata.exifDpi || metadata.jfifDpi || null };
}

function parseJpegMetadata(bytes) {
  const result = { precision: null, components: null, exifDpi: null, jfifDpi: null };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return result;
  let offset = 2;
  while (offset + 1 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset++;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2) break;
    const dataStart = offset + 2;
    const dataEnd = dataStart + segmentLength - 2;
    if (dataEnd > bytes.length) break;
    if (marker === 0xe0 && !result.jfifDpi) result.jfifDpi = parseJfifDpi(bytes, dataStart, dataEnd);
    if (marker === 0xe1 && !result.exifDpi) result.exifDpi = parseExifDpi(bytes, dataStart, dataEnd);
    if (JPEG_SOF_MARKERS.has(marker) && dataEnd - dataStart >= 6) {
      result.precision = bytes[dataStart];
      result.components = bytes[dataStart + 5];
    }
    offset = dataEnd;
  }
  return result;
}

function parseJfifDpi(bytes, start, end) {
  if (end - start < 12 || readAscii(bytes, start, 5) !== "JFIF\0") return null;
  const unit = bytes[start + 7];
  const x = readUint16BE(bytes, start + 8);
  const y = readUint16BE(bytes, start + 10);
  if (!x || !y || (unit !== 1 && unit !== 2)) return null;
  const factor = unit === 2 ? 2.54 : 1;
  return normalizeDpi(x * factor, y * factor);
}

function parseExifDpi(bytes, start, end) {
  if (end - start < 14 || readAscii(bytes, start, 6) !== "Exif\0\0") return null;
  const tiffStart = start + 6;
  const tiffLength = end - tiffStart;
  const byteOrder = readAscii(bytes, tiffStart, 2);
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffStart, tiffLength);
  const uint16 = (offset) => offset >= 0 && offset + 2 <= tiffLength ? view.getUint16(offset, littleEndian) : null;
  const uint32 = (offset) => offset >= 0 && offset + 4 <= tiffLength ? view.getUint32(offset, littleEndian) : null;
  if (uint16(2) !== 42) return null;
  const ifdOffset = uint32(4);
  if (ifdOffset === null || ifdOffset + 2 > tiffLength) return null;
  const entryCount = uint16(ifdOffset);
  let x = null;
  let y = null;
  let unit = null;
  for (let index = 0; index < entryCount; index++) {
    const entry = ifdOffset + 2 + index * 12;
    if (entry + 12 > tiffLength) break;
    const tag = uint16(entry);
    const type = uint16(entry + 2);
    const count = uint32(entry + 4);
    if ((tag === 0x011a || tag === 0x011b) && type === 5 && count === 1) {
      const valueOffset = uint32(entry + 8);
      if (valueOffset !== null && valueOffset + 8 <= tiffLength) {
        const numerator = uint32(valueOffset);
        const denominator = uint32(valueOffset + 4);
        const value = numerator !== null && denominator ? numerator / denominator : null;
        if (tag === 0x011a) x = value;
        else y = value;
      }
    }
    if (tag === 0x0128 && type === 3 && count === 1) unit = uint16(entry + 8);
  }
  if (!x || !y || (unit !== 2 && unit !== 3)) return null;
  const factor = unit === 3 ? 2.54 : 1;
  return normalizeDpi(x * factor, y * factor);
}

function normalizeDpi(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return null;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

function setDocument(file, image, metadata) {
  state.file = file;
  state.image = image;
  state.sourceWidth = image.naturalWidth;
  state.sourceHeight = image.naturalHeight;
  state.dpi = metadata.dpi || null;
  state.rotation = 0;
  state.flipX = false;
  state.flipY = false;
  updateDimensions();
  state.zoom = state.autoFit ? fitZoom() : 1;
  render();
  elements.fileName.textContent = file.name;
  elements.fileFormat.textContent = metadata.format;
  elements.fileSize.textContent = formatBytes(file.size);
  updateResolution();
  setEnabled(true);
  elements.dropZone.hidden = true;
}

function clearDocument() {
  state.file = null;
  state.image = null;
  state.sourceWidth = 0;
  state.sourceHeight = 0;
  state.width = 0;
  state.height = 0;
  state.dpi = null;
  state.rotation = 0;
  state.flipX = false;
  state.flipY = false;
  state.zoom = 1;
  elements.canvas.width = 0;
  elements.canvas.height = 0;
  elements.canvas.style.width = "";
  elements.canvas.style.height = "";
  elements.canvasWrap.hidden = true;
  elements.dropZone.hidden = false;
  elements.fileName.textContent = "-";
  elements.fileFormat.textContent = "-";
  elements.fileSize.textContent = "-";
  elements.resolution.textContent = "-";
  setEnabled(false);
  setStatus("cleared", "success");
}

function rotate(degrees, statusKey) {
  if (!state.file) return;
  state.rotation = (state.rotation + degrees + 360) % 360;
  updateDimensions();
  render();
  updateResolution();
  setStatus(statusKey, "success");
}

function flip(axis) {
  if (!state.file) return;
  const sideways = state.rotation === 90 || state.rotation === 270;
  if ((axis === "x") !== sideways) state.flipX = !state.flipX;
  else state.flipY = !state.flipY;
  render();
  setStatus(axis === "x" ? "flippedHorizontal" : "flippedVertical", "success");
}

function resetTransform() {
  if (!state.file) return;
  state.rotation = 0;
  state.flipX = false;
  state.flipY = false;
  updateDimensions();
  render();
  updateResolution();
  setStatus("transformReset", "success");
}

function updateDimensions() {
  const sideways = state.rotation === 90 || state.rotation === 270;
  state.width = sideways ? state.sourceHeight : state.sourceWidth;
  state.height = sideways ? state.sourceWidth : state.sourceHeight;
}

function updateResolution() {
  let value = `${state.width} × ${state.height} px`;
  if (state.dpi) {
    const sideways = state.rotation === 90 || state.rotation === 270;
    const x = sideways ? state.dpi.y : state.dpi.x;
    const y = sideways ? state.dpi.x : state.dpi.y;
    value += ` (${formatDpi(x)} × ${formatDpi(y)} DPI)`;
  }
  elements.resolution.textContent = value;
}

function render() {
  elements.canvas.width = state.width;
  elements.canvas.height = state.height;
  context.save();
  context.translate(state.width / 2, state.height / 2);
  context.rotate(state.rotation * Math.PI / 180);
  context.scale(state.flipX ? -1 : 1, state.flipY ? -1 : 1);
  context.drawImage(state.image, -state.sourceWidth / 2, -state.sourceHeight / 2, state.sourceWidth, state.sourceHeight);
  context.restore();
  setZoom(state.zoom);
  elements.canvasWrap.hidden = false;
}

function setZoom(zoom) {
  state.zoom = Math.max(.1, Math.min(16, Math.round(zoom * 10) / 10));
  elements.canvas.style.width = `${Math.max(1, Math.round(state.width * state.zoom))}px`;
  elements.canvas.style.height = `${Math.max(1, Math.round(state.height * state.zoom))}px`;
  elements.zoomReset.textContent = `${Math.round(state.zoom * 100)}%`;
}

function fitZoom() {
  const availableWidth = Math.max(1, elements.previewPanel.clientWidth - 64);
  const availableHeight = Math.max(1, elements.previewPanel.clientHeight - 64);
  const fit = Math.min(1, Math.max(.1, Math.min(availableWidth / state.width, availableHeight / state.height)));
  return Math.max(.1, Math.floor(fit * 10) / 10);
}

function toggleAutoFit() {
  state.autoFit = elements.autoFit.checked;
  if (state.file) setZoom(state.autoFit ? fitZoom() : 1);
}

function setBackgroundMode(mode) {
  state.background.mode = mode;
  state.background.color = mode === "custom" ? state.background.customColor : PRESET_COLORS[mode];
  updateBackgroundControls();
}

function updateCustomFromRgb() {
  const values = [elements.bgR.value, elements.bgG.value, elements.bgB.value].map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return;
  setCustomBackground(`#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
}

function updateCustomFromHex() {
  const value = elements.bgHex.value.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) setCustomBackground(value);
}

function setCustomBackground(value) {
  const hex = value.toUpperCase();
  state.background.mode = "custom";
  state.background.customColor = hex;
  state.background.color = hex;
  updateBackgroundControls();
}

function updateBackgroundControls() {
  const hex = state.background.color.toUpperCase();
  elements.jpgBackground.value = state.background.mode;
  elements.bgHex.value = hex;
  elements.bgR.value = parseInt(hex.slice(1, 3), 16);
  elements.bgG.value = parseInt(hex.slice(3, 5), 16);
  elements.bgB.value = parseInt(hex.slice(5, 7), 16);
  elements.bgColorPicker.value = hex.toLowerCase();
}

async function exportPng() {
  try {
    if (await saveExport(`${baseName(state.file.name)}.png`, "image/png", ".png", () => canvasBlob(elements.canvas, "image/png"))) setStatus("pngExported", "success");
  } catch {
    setStatus("exportFailed", "error");
  }
}

async function exportJpg() {
  try {
    if (await saveExport(`${baseName(state.file.name)}.jpg`, "image/jpeg", ".jpg", createJpgBlob)) setStatus("jpgExported", "success");
  } catch {
    setStatus("exportFailed", "error");
  }
}

async function exportCtex() {
  try {
    if (state.width > CTEX_MAX_DIMENSION || state.height > CTEX_MAX_DIMENSION) throw new StatusError("dimensionLimit");
    if (await saveExport(`${baseName(state.file.name)}.ctex`, "application/octet-stream", ".ctex", createCtexBlob)) setStatus("ctexExported", "success");
  } catch (error) {
    setStatus(error instanceof StatusError ? error.key : "exportFailed", "error");
  }
}

async function createJpgBlob() {
  const canvas = document.createElement("canvas");
  canvas.width = state.width;
  canvas.height = state.height;
  const jpgContext = canvas.getContext("2d");
  jpgContext.fillStyle = state.background.color;
  jpgContext.fillRect(0, 0, state.width, state.height);
  jpgContext.drawImage(elements.canvas, 0, 0);
  return canvasBlob(canvas, "image/jpeg", 1);
}

async function createCtexBlob() {
  const pixelFormat = hasTransparency() ? IMAGE_FORMAT_RGBA8 : IMAGE_FORMAT_RGB8;
  const webp = await canvasBlob(elements.canvas, "image/webp", 1);
  const webpBytes = new Uint8Array(await webp.arrayBuffer());
  if (readAscii(webpBytes, 0, 4) !== "RIFF" || readAscii(webpBytes, 8, 4) !== "WEBP") throw new StatusError("exportFailed");
  const header = createWebpCtexHeader(state.width, state.height, pixelFormat, webpBytes.length);
  const output = new Uint8Array(header.length + webpBytes.length);
  output.set(header);
  output.set(webpBytes, header.length);
  return new Blob([output], { type: "application/octet-stream" });
}

async function saveExport(suggestedName, mime, extension, blobFactory) {
  let handle = null;
  if ("showSaveFilePicker" in window) {
    try {
      handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: extension.toUpperCase().slice(1), accept: { [mime]: [extension] } }] });
    } catch (error) {
      if (error.name === "AbortError") return false;
    }
  }
  const blob = await blobFactory();
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  }
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: suggestedName });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

function createWebpCtexHeader(width, height, pixelFormat, payloadSize) {
  const header = new Uint8Array(CTEX_WEBP_PAYLOAD_OFFSET);
  header.set([0x47, 0x53, 0x54, 0x32]);
  const view = new DataView(header.buffer);
  view.setUint32(4, 1, true);
  view.setUint32(8, width, true);
  view.setUint32(12, height, true);
  header.set([0x00, 0x00, 0x00, 0x0d], 16);
  view.setUint32(20, 0xffffffff, true);
  view.setUint32(36, DATA_FORMAT_WEBP, true);
  view.setUint16(40, width, true);
  view.setUint16(42, height, true);
  view.setUint32(48, pixelFormat, true);
  view.setUint32(52, payloadSize, true);
  return header;
}

function hasTransparency() {
  const pixels = context.getImageData(0, 0, state.width, state.height).data;
  for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] !== 255) return true;
  return false;
}

function isPng(file) {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

function isJpg(file) {
  return file.type === "image/jpeg" || JPG_EXTENSION.test(file.name);
}

function isPngSignature(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatDpi(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

function readUint16(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true);
}

function readUint16BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, false);
}

function readAscii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function decodeImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    image.src = url;
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("encode")), type, quality));
}

function baseName(name) {
  return name.replace(/\.(png|jpg|jpeg|jpe|jfif|ctex)$/i, "") || "image";
}

function setEnabled(enabled) {
  for (const element of [elements.clearFile, elements.exportPng, elements.exportJpg, elements.exportCtex, elements.rotateLeft, elements.rotateRight, elements.rotate180, elements.resetTransform, elements.flipHorizontal, elements.flipVertical, elements.zoomIn, elements.zoomOut, elements.zoomReset]) element.disabled = !enabled;
}

function setStatus(key, type = "info", values = {}) {
  state.status = { key, type, values };
  renderStatus();
}

function renderStatus() {
  const { key, type, values } = state.status;
  elements.statusText.textContent = t(key, values);
  elements.statusIcon.textContent = type === "success" ? "✓" : type === "error" ? "⚠" : "ⓘ";
  elements.status.className = `status status-${type}`;
}

function getSavedLanguage() {
  try {
    const language = localStorage.getItem("ctex-converter-language");
    return SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  } catch {
    return "en";
  }
}

function getSavedTheme() {
  try {
    return localStorage.getItem("ctex-converter-theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const nextThemeKey = state.theme === "light" ? "themeDark" : "themeLight";
  elements.themeToggle.textContent = state.theme === "light" ? "🌙" : "☀";
  elements.themeToggle.setAttribute("aria-label", t(nextThemeKey));
  elements.themeToggle.title = t(nextThemeKey);
  try { localStorage.setItem("ctex-converter-theme", state.theme); } catch {}
}

setLanguage(state.language);
updateBackgroundControls();
