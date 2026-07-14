import { translations } from "./locales.js?v=0.7";

const CTEX_WEBP_PAYLOAD_OFFSET = 56;
const CTEX_MAX_DIMENSION = 0xffff;
const DATA_FORMAT_WEBP = 2;
const IMAGE_FORMAT_RGB8 = 4;
const IMAGE_FORMAT_RGBA8 = 5;
const IMAGE_EXTENSIONS = /\.(png|jpe?g|jpe|jfif)$/i;
const state = { file: null, image: null, sourceWidth: 0, sourceHeight: 0, width: 0, height: 0, rotation: 0, zoom: 1, language: "en" };
const $ = (id) => document.getElementById(id);
const elements = {
  openImage: $("open-image"), openCtex: $("open-ctex"), clearFile: $("clear-file"), imageInput: $("image-input"), ctexInput: $("ctex-input"), exportPng: $("export-png"), exportCtex: $("export-ctex"), rotateLeft: $("rotate-left"), rotateRight: $("rotate-right"), dropZone: $("drop-zone"), previewPanel: $("preview-panel"), canvas: $("preview-canvas"), canvasWrap: $("canvas-wrap"), status: $("status"), fileName: $("file-name"), fileFormat: $("file-format"), fileSize: $("file-size"), resolution: $("resolution"), zoomIn: $("zoom-in"), zoomOut: $("zoom-out"), zoomReset: $("zoom-reset"), languageSelect: $("language-select")
};
const context = elements.canvas.getContext("2d", { alpha: true, willReadFrequently: true });

elements.openImage.addEventListener("click", () => elements.imageInput.click());
elements.openCtex.addEventListener("click", () => elements.ctexInput.click());
elements.clearFile.addEventListener("click", clearDocument);
elements.imageInput.addEventListener("change", async (event) => { const file = event.target.files[0]; event.target.value = ""; await openImage(file); });
elements.ctexInput.addEventListener("change", async (event) => { const file = event.target.files[0]; event.target.value = ""; await openCtex(file); });
elements.exportPng.addEventListener("click", exportPng);
elements.exportCtex.addEventListener("click", exportCtex);
elements.rotateLeft.addEventListener("click", () => rotate(-90));
elements.rotateRight.addEventListener("click", () => rotate(90));
elements.zoomIn.addEventListener("click", () => setZoom(state.zoom * 1.25));
elements.zoomOut.addEventListener("click", () => setZoom(state.zoom / 1.25));
elements.zoomReset.addEventListener("click", () => setZoom(1));
elements.languageSelect.addEventListener("change", (event) => setLanguage(event.target.value));
for (const name of ["dragenter", "dragover"]) elements.previewPanel.addEventListener(name, (event) => { event.preventDefault(); elements.previewPanel.classList.add("dragging"); });
for (const name of ["dragleave", "drop"]) elements.previewPanel.addEventListener(name, (event) => { event.preventDefault(); elements.previewPanel.classList.remove("dragging"); });
elements.previewPanel.addEventListener("drop", (event) => openDroppedFile(event.dataTransfer.files[0]));
elements.previewPanel.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && !state.file) elements.imageInput.click(); });

function t(key, values = {}) { return translations[state.language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
function setLanguage(language) {
  state.language = language;
  document.documentElement.lang = language;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const [element, key] of [[elements.openImage, "openImage"], [elements.openCtex, "openCtex"], [elements.clearFile, "clearFile"], [elements.exportPng, "exportPng"], [elements.exportCtex, "exportCtex"]]) element.textContent = t(key);
  elements.zoomIn.setAttribute("aria-label", t("zoomIn"));
  elements.zoomOut.setAttribute("aria-label", t("zoomOut"));
  elements.languageSelect.value = language;
  if (!state.file) setStatus(t("start"));
}
async function openDroppedFile(file) { if (!file) return; if (file.name.toLowerCase().endsWith(".ctex")) await openCtex(file); else await openImage(file); }
async function openImage(file) {
  if (!file) return;
  try {
    if (!isSupportedImage(file)) throw new Error(t("imageOnly"));
    const image = await decodeImage(file, t("imageRead"));
    setDocument(file, image, imageFormat(file));
    setStatus(t("opened", { name: file.name }));
  } catch (error) { setStatus(error.message, true); }
}
async function openCtex(file) {
  if (!file) return;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = validateWebpCtex(bytes);
    const image = await decodeImage(new Blob([payload], { type: "image/webp" }), t("webpRead"));
    if (image.naturalWidth !== readUint32(bytes, 8) || image.naturalHeight !== readUint32(bytes, 12)) throw new Error(t("mismatchedResolution"));
    const pixelFormat = readUint32(bytes, 48) === IMAGE_FORMAT_RGBA8 ? "RGBA8" : "RGB8";
    setDocument(file, image, `CTEX (GST2 / WebP / ${pixelFormat})`);
    setStatus(t("opened", { name: file.name }));
  } catch (error) { setStatus(error.message, true); }
}
function validateWebpCtex(bytes) {
  if (bytes.length < CTEX_WEBP_PAYLOAD_OFFSET) throw new Error(t("fileTooSmall"));
  if (readAscii(bytes, 0, 4) !== "GST2") throw new Error(t("notGst2"));
  if (readUint32(bytes, 4) !== 1) throw new Error(t("unsupportedVersion"));
  if (readUint32(bytes, 36) !== DATA_FORMAT_WEBP) throw new Error(t("unsupportedCtex"));
  const width = readUint32(bytes, 8); const height = readUint32(bytes, 12);
  if (!width || !height || readUint16(bytes, 40) !== width || readUint16(bytes, 42) !== height) throw new Error(t("invalidResolution"));
  const pixelFormat = readUint32(bytes, 48);
  if (pixelFormat !== IMAGE_FORMAT_RGB8 && pixelFormat !== IMAGE_FORMAT_RGBA8) throw new Error(t("unsupportedPixelFormat"));
  if (readUint32(bytes, 52) !== bytes.length - CTEX_WEBP_PAYLOAD_OFFSET) throw new Error(t("invalidPayloadLength"));
  if (readAscii(bytes, 56, 4) !== "RIFF" || readAscii(bytes, 64, 4) !== "WEBP") throw new Error(t("invalidWebp"));
  return bytes.slice(CTEX_WEBP_PAYLOAD_OFFSET);
}
function setDocument(file, image, format) {
  state.file = file; state.image = image; state.sourceWidth = image.naturalWidth; state.sourceHeight = image.naturalHeight; state.rotation = 0;
  updateDimensions(); state.zoom = fitZoom(); render();
  elements.fileName.textContent = file.name; elements.fileFormat.textContent = format; elements.fileSize.textContent = formatBytes(file.size); updateResolution();
  setEnabled(true); elements.dropZone.hidden = true;
}
function clearDocument() {
  state.file = null; state.image = null; state.sourceWidth = 0; state.sourceHeight = 0; state.width = 0; state.height = 0; state.rotation = 0; state.zoom = 1;
  elements.canvas.width = 0; elements.canvas.height = 0; elements.canvas.style.width = ""; elements.canvas.style.height = ""; elements.canvasWrap.hidden = true; elements.dropZone.hidden = false;
  elements.fileName.textContent = "-"; elements.fileFormat.textContent = "-"; elements.fileSize.textContent = "-"; elements.resolution.textContent = "-";
  setEnabled(false); setStatus(t("cleared"));
}
function rotate(degrees) {
  if (!state.file) return;
  state.rotation = (state.rotation + degrees + 360) % 360;
  updateDimensions(); render(); updateResolution(); setStatus(t("rotated", { degrees: state.rotation }));
}
function updateDimensions() {
  const sideways = state.rotation === 90 || state.rotation === 270;
  state.width = sideways ? state.sourceHeight : state.sourceWidth;
  state.height = sideways ? state.sourceWidth : state.sourceHeight;
}
function updateResolution() { elements.resolution.textContent = `${state.width} × ${state.height}`; }
function render() {
  elements.canvas.width = state.width; elements.canvas.height = state.height;
  context.save();
  if (state.rotation === 90) { context.translate(state.width, 0); context.rotate(Math.PI / 2); }
  else if (state.rotation === 180) { context.translate(state.width, state.height); context.rotate(Math.PI); }
  else if (state.rotation === 270) { context.translate(0, state.height); context.rotate(-Math.PI / 2); }
  context.drawImage(state.image, 0, 0, state.sourceWidth, state.sourceHeight);
  context.restore();
  setZoom(state.zoom); elements.canvasWrap.hidden = false;
}
function setZoom(zoom) { state.zoom = Math.max(0.1, Math.min(16, zoom)); elements.canvas.style.width = `${Math.max(1, Math.round(state.width * state.zoom))}px`; elements.canvas.style.height = `${Math.max(1, Math.round(state.height * state.zoom))}px`; elements.zoomReset.textContent = `${Math.round(state.zoom * 100)}%`; }
function fitZoom() { const availableWidth = Math.max(1, elements.previewPanel.clientWidth - 64); const availableHeight = Math.max(1, elements.previewPanel.clientHeight - 64); return Math.min(1, Math.max(0.1, Math.min(availableWidth / state.width, availableHeight / state.height))); }
async function exportPng() { try { if (await saveExport(`${baseName(state.file.name)}.png`, "image/png", ".png", () => canvasBlob(elements.canvas, "image/png"))) setStatus(t("pngExported")); } catch (error) { setStatus(error.message || t("exportFailed"), true); } }
async function exportCtex() { try { if (state.width > CTEX_MAX_DIMENSION || state.height > CTEX_MAX_DIMENSION) throw new Error(t("dimensionLimit")); if (await saveExport(`${baseName(state.file.name)}.ctex`, "application/octet-stream", ".ctex", createCtexBlob)) setStatus(t("ctexExported")); } catch (error) { setStatus(error.message || t("exportFailed"), true); } }
async function createCtexBlob() { const pixelFormat = hasTransparency() ? IMAGE_FORMAT_RGBA8 : IMAGE_FORMAT_RGB8; const webp = await canvasBlob(elements.canvas, "image/webp", 1); const webpBytes = new Uint8Array(await webp.arrayBuffer()); if (readAscii(webpBytes, 0, 4) !== "RIFF" || readAscii(webpBytes, 8, 4) !== "WEBP") throw new Error(t("webpCreateFailed")); const header = createWebpCtexHeader(state.width, state.height, pixelFormat, webpBytes.length); const output = new Uint8Array(header.length + webpBytes.length); output.set(header); output.set(webpBytes, header.length); return new Blob([output], { type: "application/octet-stream" }); }
async function saveExport(suggestedName, mime, extension, blobFactory) { let handle = null; if ("showSaveFilePicker" in window) { try { handle = await window.showSaveFilePicker({ suggestedName, types: [{ description: extension.toUpperCase().slice(1), accept: { [mime]: [extension] } }] }); } catch (error) { if (error.name === "AbortError") return false; } } const blob = await blobFactory(); if (handle) { const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); return true; } const url = URL.createObjectURL(blob); const anchor = Object.assign(document.createElement("a"), { href: url, download: suggestedName }); document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); return true; }
function createWebpCtexHeader(width, height, pixelFormat, payloadSize) { const header = new Uint8Array(CTEX_WEBP_PAYLOAD_OFFSET); header.set([0x47, 0x53, 0x54, 0x32]); const view = new DataView(header.buffer); view.setUint32(4, 1, true); view.setUint32(8, width, true); view.setUint32(12, height, true); header.set([0x00, 0x00, 0x00, 0x0d], 16); view.setUint32(20, 0xffffffff, true); view.setUint32(36, DATA_FORMAT_WEBP, true); view.setUint16(40, width, true); view.setUint16(42, height, true); view.setUint32(48, pixelFormat, true); view.setUint32(52, payloadSize, true); return header; }
function hasTransparency() { const pixels = context.getImageData(0, 0, state.width, state.height).data; for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] !== 255) return true; return false; }
function isSupportedImage(file) { return file.type === "image/png" || file.type === "image/jpeg" || IMAGE_EXTENSIONS.test(file.name); }
function imageFormat(file) { return /\.png$/i.test(file.name) || file.type === "image/png" ? "PNG" : "JPEG"; }
function formatBytes(bytes) { if (!bytes) return "0 B"; const units = ["B", "KB", "MB", "GB"]; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); const value = bytes / 1024 ** index; return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`; }
function readUint32(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true); }
function readUint16(bytes, offset) { return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true); }
function readAscii(bytes, offset, length) { return String.fromCharCode(...bytes.slice(offset, offset + length)); }
function decodeImage(blob, failureMessage) { return new Promise((resolve, reject) => { const url = URL.createObjectURL(blob); const image = new Image(); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error(failureMessage)); }; image.src = url; }); }
function canvasBlob(canvas, type, quality) { return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(t("imageCreateFailed"))), type, quality)); }
function baseName(name) { return name.replace(/\.(png|jpe?g|jpe|jfif|ctex)$/i, "") || "image"; }
function setEnabled(enabled) { for (const element of [elements.clearFile, elements.exportPng, elements.exportCtex, elements.rotateLeft, elements.rotateRight, elements.zoomIn, elements.zoomOut, elements.zoomReset]) element.disabled = !enabled; }
function setStatus(message, isError = false) { elements.status.textContent = message; elements.status.style.color = isError ? "#ff9d9d" : ""; }
