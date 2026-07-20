import { translations } from "./locales.js?v=0.8d";

const CTEX_WEBP_PAYLOAD_OFFSET = 56;
const CTEX_MAX_DIMENSION = 0xffff;
const DATA_FORMAT_WEBP = 2;
const IMAGE_FORMAT_RGB8 = 4;
const IMAGE_FORMAT_RGBA8 = 5;
const JPEG_METADATA_LIMIT = 2 * 1024 * 1024;
const MAX_FILES = 20;
const MAX_THUMBNAIL_SIZE = 640;
const ZIP_UINT32_MAX = 0xffffffff;
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPG_EXTENSION = /\.(jpg|jpeg|jpe|jfif)$/i;
const PRESET_COLORS = { white: "#ffffff", gray: "#808080", black: "#000000" };
const SUPPORTED_LANGUAGES = ["en", "ko", "zh-CN", "zh-TW", "ja", "ru"];
const RASTER_FORMATS = {
  png: { matches: isPng, inspect: inspectPng, fallbackFormat: "PNG" },
  jpg: { matches: isJpg, inspect: inspectJpeg, fallbackFormat: "JPEG" }
};
const EXPORT_FORMATS = {
  png: { extension: ".png", mime: "image/png", description: "PNG" },
  jpg: { extension: ".jpg", mime: "image/jpeg", description: "JPG" },
  ctex: { extension: ".ctex", mime: "application/octet-stream", description: "CTEX" }
};
const CRC32_TABLE = createCrc32Table();

const state = {
  documents: [],
  selectedId: null,
  view: "empty",
  detailFromList: false,
  galleryScrollTop: 0,
  galleryScrollLeft: 0,
  activeImage: null,
  activeImageId: null,
  zoom: 1,
  autoShrink: true,
  opening: false,
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
  autoShrink: $("auto-shrink"),
  themeToggle: $("theme-toggle"),
  dropZone: $("drop-zone"),
  previewPanel: $("preview-panel"),
  gallery: $("gallery"),
  previewLoading: $("preview-loading"),
  selectAll: $("select-all"),
  viewLarger: $("view-larger"),
  backList: $("back-list"),
  canvas: $("preview-canvas"),
  canvasWrap: $("canvas-wrap"),
  status: $("status"),
  statusIcon: $("status-icon"),
  statusText: $("status-text"),
  fileName: $("file-name"),
  fileFormat: $("file-format"),
  fileSize: $("file-size"),
  resolution: $("resolution"),
  fileErrorRow: $("file-error-row"),
  fileError: $("file-error"),
  zoomIn: $("zoom-in"),
  zoomOut: $("zoom-out"),
  zoomReset: $("zoom-reset"),
  languageSelect: $("language-select")
};
const infoButtons = [...document.querySelectorAll("[data-info-button]")];
const context = elements.canvas.getContext("2d", { alpha: true, willReadFrequently: true });
let openRequestId = 0;
let detailRequestId = 0;
let documentId = 0;
let exportInProgress = false;
let dragDepth = 0;

class StatusError extends Error {
  constructor(key) {
    super(key);
    this.key = key;
  }
}

elements.openPng.addEventListener("click", () => elements.pngInput.click());
elements.openJpg.addEventListener("click", () => elements.jpgInput.click());
elements.openCtex.addEventListener("click", () => elements.ctexInput.click());
elements.clearFile.addEventListener("click", clearDocuments);
elements.pngInput.addEventListener("change", (event) => handleFileInput(event, "png"));
elements.jpgInput.addEventListener("change", (event) => handleFileInput(event, "jpg"));
elements.ctexInput.addEventListener("change", (event) => handleFileInput(event, "ctex"));
elements.exportPng.addEventListener("click", () => exportImages("png"));
elements.exportJpg.addEventListener("click", () => exportImages("jpg"));
elements.exportCtex.addEventListener("click", () => exportImages("ctex"));
elements.rotateLeft.addEventListener("click", () => rotate(-90, "rotatedLeft"));
elements.rotateRight.addEventListener("click", () => rotate(90, "rotatedRight"));
elements.rotate180.addEventListener("click", () => rotate(180, "rotated180"));
elements.resetTransform.addEventListener("click", resetTransform);
elements.flipHorizontal.addEventListener("click", () => flip("x"));
elements.flipVertical.addEventListener("click", () => flip("y"));
elements.zoomIn.addEventListener("click", () => setManualZoom(state.zoom + .1));
elements.zoomOut.addEventListener("click", () => setManualZoom(state.zoom - .1));
elements.zoomReset.addEventListener("click", () => setManualZoom(1));
elements.selectAll.addEventListener("click", toggleAllChecks);
elements.viewLarger.addEventListener("click", enterDetailView);
elements.backList.addEventListener("click", returnToList);
elements.languageSelect.addEventListener("change", (event) => setLanguage(event.target.value));
elements.themeToggle.addEventListener("click", toggleTheme);
elements.jpgBackground.addEventListener("change", () => setBackgroundMode(elements.jpgBackground.value));
elements.bgR.addEventListener("input", updateCustomFromRgb);
elements.bgG.addEventListener("input", updateCustomFromRgb);
elements.bgB.addEventListener("input", updateCustomFromRgb);
elements.bgHex.addEventListener("input", updateCustomFromHex);
elements.bgColorPicker.addEventListener("input", () => setCustomBackground(elements.bgColorPicker.value));
elements.autoShrink.addEventListener("change", toggleAutoShrink);

window.addEventListener("resize", () => {
  if (state.view === "detail" && state.activeImage && state.autoShrink) setZoom(calculateAutoShrinkZoom());
  positionOpenInfoPopovers();
});
window.addEventListener("scroll", positionOpenInfoPopovers, true);

elements.previewPanel.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth++;
  elements.previewPanel.classList.add("dragging");
});
elements.previewPanel.addEventListener("dragover", (event) => event.preventDefault());
elements.previewPanel.addEventListener("dragleave", (event) => {
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) elements.previewPanel.classList.remove("dragging");
});
elements.previewPanel.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  elements.previewPanel.classList.remove("dragging");
  openFiles(event.dataTransfer.files);
});

for (const button of infoButtons) {
  const control = button.closest(".info-control");
  control.addEventListener("mouseenter", () => positionInfoPopover(control));
  control.addEventListener("focusin", () => positionInfoPopover(control));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = !control.classList.contains("is-open");
    closeInfoPopovers();
    if (shouldOpen) {
      control.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => positionInfoPopover(control));
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
  const template = translations[state.language]?.[key] ?? translations.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
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
  renderGallery();
  updateMetadata();
  updatePreviewActions();
  renderStatus();
  applyTheme();
  requestAnimationFrame(positionOpenInfoPopovers);
}

function setButtonLabel(element, key) {
  element.setAttribute("aria-label", t(key));
  element.title = t(key);
}

function closeInfoPopovers() {
  for (const button of infoButtons) {
    const control = button.closest(".info-control");
    control.classList.remove("is-open", "open-up");
    button.setAttribute("aria-expanded", "false");
  }
}

function positionOpenInfoPopovers() {
  for (const button of infoButtons) {
    const control = button.closest(".info-control");
    if (control.classList.contains("is-open")) positionInfoPopover(control);
  }
}

function positionInfoPopover(control) {
  const popover = control.querySelector(".info-popover");
  if (!popover) return;
  control.classList.remove("open-up");
  popover.style.maxHeight = "";
  const rect = control.getBoundingClientRect();
  const height = popover.scrollHeight;
  const below = Math.max(0, window.innerHeight - rect.bottom - 12);
  const above = Math.max(0, rect.top - 12);
  const openUp = below < height && above > below;
  if (openUp) control.classList.add("open-up");
  const available = Math.max(96, (openUp ? above : below) - 8);
  popover.style.maxHeight = `${Math.min(320, available)}px`;
}

function handleFileInput(event, expectedKind) {
  const files = [...event.target.files];
  event.target.value = "";
  return openFiles(files, expectedKind);
}

async function openFiles(fileList, expectedKind = null) {
  if (exportInProgress) return;
  const files = [...(fileList || [])];
  if (!files.length) return;
  if (files.length > MAX_FILES) {
    setStatus("tooManyImages", "error", { count: MAX_FILES });
    return;
  }

  const requestId = ++openRequestId;
  detailRequestId++;
  resetDocumentState();
  state.opening = true;
  state.view = "gallery";
  setStatus("openingImages", "info", { current: 0, total: files.length });
  renderApplication();

  let success = 0;
  let failed = 0;
  let singleErrorKey = "imageRead";
  let singleImage = null;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    let documentRecord;
    let decodedImage = null;
    try {
      const loaded = await createDocumentRecord(file, expectedKind);
      documentRecord = loaded.documentRecord;
      decodedImage = loaded.image;
      success++;
    } catch (error) {
      singleErrorKey = error instanceof StatusError ? error.key : "imageRead";
      documentRecord = createErrorDocument(file, expectedKind || detectKind(file), singleErrorKey);
      failed++;
    }

    if (requestId !== openRequestId) {
      if (documentRecord.thumbnailUrl) URL.revokeObjectURL(documentRecord.thumbnailUrl);
      return;
    }

    state.documents.push(documentRecord);
    if (state.selectedId === null && !documentRecord.errorKey) state.selectedId = documentRecord.id;
    if (files.length === 1 && !documentRecord.errorKey) singleImage = decodedImage;
    setStatus("openingImages", "info", { current: index + 1, total: files.length });
    renderApplication();
  }

  if (requestId !== openRequestId) return;
  state.opening = false;
  if (state.selectedId === null && state.documents.length) state.selectedId = state.documents[0].id;

  if (files.length === 1 && success === 1) {
    state.view = "detail";
    state.detailFromList = false;
    state.activeImage = singleImage;
    state.activeImageId = state.selectedId;
    state.zoom = 1;
  } else {
    state.view = "gallery";
  }
  renderApplication();

  if (files.length === 1) {
    if (success) setStatus("opened", "success", { name: files[0].name });
    else setStatus(singleErrorKey, "error");
  } else if (!failed) {
    setStatus("openedMultiple", "success", { count: success });
  } else if (success) {
    setStatus("openPartial", "warning", { success, failed });
  } else {
    setStatus("openFailed", "error");
  }
}

async function createDocumentRecord(file, expectedKind) {
  const kind = detectKind(file);
  if (!kind || (expectedKind && kind !== expectedKind)) throw new StatusError("unsupportedFile");
  const loaded = await decodeAndInspect(file, kind);
  const thumbnailUrl = await createThumbnailUrl(loaded.image);
  return {
    image: loaded.image,
    documentRecord: {
      id: ++documentId,
      file,
      kind,
      metadata: loaded.metadata,
      sourceWidth: loaded.image.naturalWidth,
      sourceHeight: loaded.image.naturalHeight,
      rotation: 0,
      flipX: false,
      flipY: false,
      checked: true,
      errorKey: null,
      exportState: "idle",
      thumbnailUrl
    }
  };
}

function createErrorDocument(file, kind, errorKey) {
  return {
    id: ++documentId,
    file,
    kind,
    metadata: { format: kind === "ctex" ? "CTEX" : kind === "png" ? "PNG" : kind === "jpg" ? "JPEG" : "-", dpi: null },
    sourceWidth: 0,
    sourceHeight: 0,
    rotation: 0,
    flipX: false,
    flipY: false,
    checked: false,
    errorKey,
    exportState: "idle",
    thumbnailUrl: null
  };
}

async function decodeAndInspect(file, kind) {
  if (kind === "ctex") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const payload = validateWebpCtex(bytes);
    const image = await decodeImage(new Blob([payload], { type: "image/webp" }));
    if (image.naturalWidth !== readUint32(bytes, 8) || image.naturalHeight !== readUint32(bytes, 12)) throw new StatusError("ctexRead");
    const rgba = readUint32(bytes, 48) === IMAGE_FORMAT_RGBA8;
    const pixelFormat = rgba ? "RGBA8" : "RGB8";
    const bitDepth = rgba ? 32 : 24;
    return { image, metadata: { format: `CTEX (GST2 / WebP / ${pixelFormat}, ${bitDepth}-bit)`, dpi: null } };
  }

  const descriptor = RASTER_FORMATS[kind];
  if (!descriptor || !descriptor.matches(file)) throw new StatusError("unsupportedFile");
  const metadataPromise = descriptor.inspect(file).catch(() => ({ format: descriptor.fallbackFormat, dpi: null }));
  try {
    const [image, metadata] = await Promise.all([decodeImage(file), metadataPromise]);
    return { image, metadata };
  } catch (error) {
    if (error instanceof StatusError) throw error;
    throw new StatusError("imageRead");
  }
}

async function decodeDocumentSource(documentRecord) {
  const loaded = await decodeAndInspect(documentRecord.file, documentRecord.kind);
  if (loaded.image.naturalWidth !== documentRecord.sourceWidth || loaded.image.naturalHeight !== documentRecord.sourceHeight) throw new StatusError(documentRecord.kind === "ctex" ? "ctexRead" : "imageRead");
  return loaded.image;
}

function detectKind(file) {
  if (/\.ctex$/i.test(file.name)) return "ctex";
  if (isPng(file)) return "png";
  if (isJpg(file)) return "jpg";
  return null;
}

async function createThumbnailUrl(image) {
  const scale = Math.min(1, MAX_THUMBNAIL_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return URL.createObjectURL(await canvasBlob(canvas, "image/png"));
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

function renderApplication() {
  renderPreview();
  updateMetadata();
  updateControls();
}

function renderPreview() {
  const isEmpty = state.documents.length === 0;
  elements.dropZone.hidden = !isEmpty || state.opening;
  elements.gallery.hidden = state.view !== "gallery" || isEmpty;
  elements.previewLoading.hidden = state.view !== "detail" || Boolean(state.activeImage);
  elements.canvasWrap.hidden = state.view !== "detail" || !state.activeImage;
  if (state.view === "gallery") renderGallery();
  if (state.view === "detail" && state.activeImage) renderCanvas();
  updatePreviewActions();
}

function renderGallery() {
  if (!elements.gallery || state.view !== "gallery") return;
  elements.gallery.replaceChildren();
  elements.gallery.className = `gallery ${getGalleryLayoutClass()}`;
  for (const documentRecord of state.documents) {
    const tile = document.createElement("article");
    tile.className = "gallery-item";
    if (documentRecord.id === state.selectedId) tile.classList.add("selected");
    if (documentRecord.errorKey) tile.classList.add("has-error");
    if (documentRecord.exportState !== "idle") tile.classList.add(`export-${documentRecord.exportState}`);
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", t("selectImage", { name: documentRecord.file.name }));
    tile.addEventListener("click", (event) => {
      if (event.target.closest("input, button")) return;
      selectDocument(documentRecord.id);
    });
    tile.addEventListener("dblclick", (event) => {
      if (event.target.closest("input, button") || documentRecord.errorKey) return;
      selectDocument(documentRecord.id);
      enterDetailView();
    });
    tile.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (state.selectedId === documentRecord.id && event.key === "Enter" && !documentRecord.errorKey) enterDetailView();
      else selectDocument(documentRecord.id);
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "gallery-check";
    checkbox.checked = documentRecord.checked;
    checkbox.disabled = Boolean(documentRecord.errorKey) || exportInProgress || state.opening;
    checkbox.setAttribute("aria-label", t("includeInExport", { name: documentRecord.file.name }));
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      documentRecord.checked = checkbox.checked;
      updateControls();
      updatePreviewActions();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "gallery-remove";
    remove.textContent = "×";
    remove.disabled = exportInProgress || state.opening;
    remove.setAttribute("aria-label", t("removeImage", { name: documentRecord.file.name }));
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeDocument(documentRecord.id);
    });

    const thumbnail = document.createElement("div");
    thumbnail.className = "gallery-thumbnail";
    if (documentRecord.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = documentRecord.thumbnailUrl;
      image.alt = "";
      image.draggable = false;
      image.style.transform = `rotate(${documentRecord.rotation}deg) scale(${documentRecord.flipX ? -1 : 1}, ${documentRecord.flipY ? -1 : 1})`;
      thumbnail.append(image);
    } else {
      const errorIcon = document.createElement("span");
      errorIcon.className = "gallery-error-icon";
      errorIcon.textContent = "⚠";
      errorIcon.setAttribute("aria-hidden", "true");
      thumbnail.append(errorIcon);
    }

    const name = document.createElement("span");
    name.className = "gallery-name";
    name.textContent = documentRecord.file.name;

    tile.append(checkbox, remove, thumbnail, name);
    const badge = createGalleryBadge(documentRecord);
    if (badge) tile.append(badge);
    elements.gallery.append(tile);
  }
}

function getGalleryLayoutClass() {
  const count = state.documents.length;
  if (count <= 1) return "gallery-single";
  if (count === 2) {
    const shapes = state.documents.map(getGalleryShape);
    if (shapes.every((shape) => shape === "wide")) return "gallery-two-wide";
    if (shapes.every((shape) => shape === "tall")) return "gallery-two-tall";
    return "gallery-two-equal";
  }
  if (count <= 6) return "gallery-columns-2";
  if (count <= 12) return "gallery-columns-3";
  return "gallery-columns-4";
}

function getGalleryShape(documentRecord) {
  if (!documentRecord.sourceWidth || !documentRecord.sourceHeight) return "standard";
  const { width, height } = getDocumentDimensions(documentRecord);
  const ratio = width / height;
  if (ratio >= 1.25) return "wide";
  if (ratio <= .8) return "tall";
  return "standard";
}

function createGalleryBadge(documentRecord) {
  let text = "";
  let className = "";
  if (documentRecord.errorKey) {
    text = t("errorBadge");
    className = "error";
  } else if (documentRecord.exportState === "processing") {
    text = t("processingBadge");
    className = "processing";
  } else if (documentRecord.exportState === "success") {
    text = t("successBadge");
    className = "success";
  } else if (documentRecord.exportState === "error") {
    text = t("failedBadge");
    className = "error";
  }
  if (!text) return null;
  const badge = document.createElement("span");
  badge.className = `gallery-badge ${className}`;
  badge.textContent = text;
  return badge;
}

function selectDocument(id) {
  if (!state.documents.some((item) => item.id === id)) return;
  state.selectedId = id;
  renderGallery();
  updateMetadata();
  updateControls();
}

async function enterDetailView() {
  const documentRecord = getSelectedDocument();
  if (!documentRecord || documentRecord.errorKey || state.opening || exportInProgress) return;
  const requestId = ++detailRequestId;
  state.detailFromList = state.view === "gallery";
  if (state.detailFromList) {
    state.galleryScrollTop = elements.previewPanel.scrollTop;
    state.galleryScrollLeft = elements.previewPanel.scrollLeft;
  }
  state.view = "detail";
  state.activeImage = null;
  state.activeImageId = null;
  state.zoom = 1;
  elements.zoomReset.textContent = "100%";
  renderApplication();
  elements.previewPanel.scrollTop = 0;
  elements.previewPanel.scrollLeft = 0;
  try {
    const image = await decodeDocumentSource(documentRecord);
    if (requestId !== detailRequestId || state.selectedId !== documentRecord.id || state.view !== "detail") return;
    state.activeImage = image;
    state.activeImageId = documentRecord.id;
    renderApplication();
  } catch (error) {
    if (requestId !== detailRequestId) return;
    documentRecord.errorKey = error instanceof StatusError ? error.key : "imageRead";
    documentRecord.checked = false;
    state.activeImage = null;
    state.activeImageId = null;
    state.view = "gallery";
    state.detailFromList = false;
    renderApplication();
    setStatus(documentRecord.errorKey, "error");
  }
}

function returnToList() {
  if (!state.detailFromList) return;
  detailRequestId++;
  state.view = "gallery";
  state.detailFromList = false;
  state.activeImage = null;
  state.activeImageId = null;
  state.zoom = 1;
  elements.zoomReset.textContent = "100%";
  renderApplication();
  requestAnimationFrame(() => {
    elements.previewPanel.scrollTop = state.galleryScrollTop;
    elements.previewPanel.scrollLeft = state.galleryScrollLeft;
    elements.gallery.querySelector(".gallery-item.selected")?.focus({ preventScroll: true });
  });
}

function removeDocument(id) {
  const index = state.documents.findIndex((item) => item.id === id);
  if (index === -1 || exportInProgress || state.opening) return;
  const [removed] = state.documents.splice(index, 1);
  if (removed.thumbnailUrl) URL.revokeObjectURL(removed.thumbnailUrl);
  if (state.selectedId === id) {
    const next = state.documents[index] || state.documents[index - 1] || null;
    state.selectedId = next?.id ?? null;
  }
  if (!state.documents.length) {
    state.view = "empty";
    state.activeImage = null;
    state.activeImageId = null;
  }
  renderApplication();
  setStatus("removed", "success", { name: removed.file.name });
}

function toggleAllChecks() {
  const valid = state.documents.filter((item) => !item.errorKey);
  if (!valid.length || exportInProgress || state.opening) return;
  const shouldCheck = !valid.every((item) => item.checked);
  for (const documentRecord of valid) documentRecord.checked = shouldCheck;
  renderGallery();
  updateControls();
}

function updatePreviewActions() {
  const selected = getSelectedDocument();
  const valid = state.documents.filter((item) => !item.errorKey);
  const listVisible = state.view === "gallery" && state.documents.length > 0;
  elements.selectAll.hidden = !listVisible;
  elements.viewLarger.hidden = !listVisible;
  elements.backList.hidden = state.view !== "detail" || !state.detailFromList;
  elements.selectAll.disabled = !valid.length || state.opening || exportInProgress;
  elements.viewLarger.disabled = !selected || Boolean(selected.errorKey) || state.opening || exportInProgress;
  elements.selectAll.textContent = t(valid.length && valid.every((item) => item.checked) ? "deselectAll" : "selectAll");
}

function updateMetadata() {
  const documentRecord = getSelectedDocument();
  if (!documentRecord) {
    elements.fileName.textContent = "-";
    elements.fileFormat.textContent = "-";
    elements.fileSize.textContent = "-";
    elements.resolution.textContent = "-";
    elements.fileErrorRow.hidden = true;
    elements.fileError.textContent = "-";
    return;
  }
  elements.fileName.textContent = documentRecord.file.name;
  elements.fileFormat.textContent = documentRecord.metadata.format;
  elements.fileSize.textContent = formatBytes(documentRecord.file.size);
  elements.resolution.textContent = documentRecord.errorKey ? "-" : getResolutionText(documentRecord);
  elements.fileErrorRow.hidden = !documentRecord.errorKey;
  elements.fileError.textContent = documentRecord.errorKey ? t(documentRecord.errorKey) : "-";
}

function getResolutionText(documentRecord) {
  const { width, height } = getDocumentDimensions(documentRecord);
  let value = `${width} × ${height} px`;
  if (documentRecord.metadata.dpi) {
    const sideways = isSideways(documentRecord);
    const x = sideways ? documentRecord.metadata.dpi.y : documentRecord.metadata.dpi.x;
    const y = sideways ? documentRecord.metadata.dpi.x : documentRecord.metadata.dpi.y;
    value += ` (${formatDpi(x)} × ${formatDpi(y)} DPI)`;
  }
  return value;
}

function getDocumentDimensions(documentRecord) {
  return isSideways(documentRecord)
    ? { width: documentRecord.sourceHeight, height: documentRecord.sourceWidth }
    : { width: documentRecord.sourceWidth, height: documentRecord.sourceHeight };
}

function isSideways(documentRecord) {
  return documentRecord.rotation === 90 || documentRecord.rotation === 270;
}

function rotate(degrees, statusKey) {
  const documentRecord = getEditableDocument();
  if (!documentRecord) return;
  documentRecord.rotation = (documentRecord.rotation + degrees + 360) % 360;
  refreshEditedDocument();
  setStatus(statusKey, "success");
}

function flip(axis) {
  const documentRecord = getEditableDocument();
  if (!documentRecord) return;
  const sideways = isSideways(documentRecord);
  if ((axis === "x") !== sideways) documentRecord.flipX = !documentRecord.flipX;
  else documentRecord.flipY = !documentRecord.flipY;
  refreshEditedDocument();
  setStatus(axis === "x" ? "flippedHorizontal" : "flippedVertical", "success");
}

function resetTransform() {
  const documentRecord = getEditableDocument();
  if (!documentRecord) return;
  documentRecord.rotation = 0;
  documentRecord.flipX = false;
  documentRecord.flipY = false;
  refreshEditedDocument();
  setStatus("transformReset", "success");
}

function refreshEditedDocument() {
  updateMetadata();
  if (state.view === "detail" && state.activeImageId === state.selectedId) renderCanvas();
  else renderGallery();
}

function getEditableDocument() {
  const documentRecord = getSelectedDocument();
  return documentRecord && !documentRecord.errorKey && !state.opening && !exportInProgress ? documentRecord : null;
}

function getSelectedDocument() {
  return state.documents.find((item) => item.id === state.selectedId) || null;
}

function renderCanvas() {
  const documentRecord = getSelectedDocument();
  if (!documentRecord || !state.activeImage || state.activeImageId !== documentRecord.id) return;
  const { width, height } = getDocumentDimensions(documentRecord);
  elements.canvas.width = width;
  elements.canvas.height = height;
  drawTransformedImage(context, state.activeImage, documentRecord, width, height);
  setZoom(state.autoShrink ? calculateAutoShrinkZoom() : state.zoom);
  elements.canvasWrap.hidden = false;
  elements.previewLoading.hidden = true;
}

function drawTransformedImage(targetContext, image, documentRecord, width, height) {
  targetContext.save();
  targetContext.translate(width / 2, height / 2);
  targetContext.rotate(documentRecord.rotation * Math.PI / 180);
  targetContext.scale(documentRecord.flipX ? -1 : 1, documentRecord.flipY ? -1 : 1);
  targetContext.drawImage(image, -documentRecord.sourceWidth / 2, -documentRecord.sourceHeight / 2, documentRecord.sourceWidth, documentRecord.sourceHeight);
  targetContext.restore();
}

function setZoom(zoom) {
  const documentRecord = getSelectedDocument();
  if (!documentRecord) return;
  const { width, height } = getDocumentDimensions(documentRecord);
  state.zoom = Math.max(.1, Math.min(16, Math.round(zoom * 10) / 10));
  elements.canvas.style.width = `${Math.max(1, Math.round(width * state.zoom))}px`;
  elements.canvas.style.height = `${Math.max(1, Math.round(height * state.zoom))}px`;
  elements.zoomReset.textContent = `${Math.round(state.zoom * 100)}%`;
}

function setManualZoom(zoom) {
  if (state.view !== "detail" || !state.activeImage) return;
  if (state.autoShrink) {
    state.autoShrink = false;
    elements.autoShrink.checked = false;
  }
  setZoom(zoom);
}

function calculateAutoShrinkZoom() {
  const documentRecord = getSelectedDocument();
  if (!documentRecord) return 1;
  const { width, height } = getDocumentDimensions(documentRecord);
  const availableWidth = Math.max(1, elements.previewPanel.clientWidth - 64);
  const availableHeight = Math.max(1, elements.previewPanel.clientHeight - 64);
  const fit = Math.min(1, Math.max(.1, Math.min(availableWidth / width, availableHeight / height)));
  return Math.max(.1, Math.floor(fit * 10) / 10);
}

function toggleAutoShrink() {
  state.autoShrink = elements.autoShrink.checked;
  if (state.view === "detail" && state.activeImage) setZoom(state.autoShrink ? calculateAutoShrinkZoom() : 1);
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

async function exportImages(kind) {
  const targets = state.documents.filter((item) => item.checked && !item.errorKey);
  if (!targets.length || !beginExport()) return;
  try {
    for (const documentRecord of state.documents) documentRecord.exportState = "idle";
    if (targets.length === 1) await exportSingleImage(targets[0], kind);
    else await exportImageArchive(targets, kind);
  } catch (error) {
    setStatus(error instanceof StatusError ? error.key : "exportFailed", "error");
  } finally {
    endExport();
  }
}

async function exportSingleImage(documentRecord, kind) {
  const format = EXPORT_FORMATS[kind];
  const suggestedName = `${baseName(documentRecord.file.name)}${format.extension}`;
  const result = await saveExport(suggestedName, format.mime, format.extension, format.description, async () => {
    documentRecord.exportState = "processing";
    renderGallery();
    setStatus("convertingImages", "info", { current: 1, total: 1 });
    try {
      const blob = await createOutputBlob(documentRecord, kind);
      documentRecord.exportState = "success";
      renderGallery();
      return blob;
    } catch (error) {
      documentRecord.exportState = "error";
      renderGallery();
      throw error;
    }
  });
  if (result) setStatus("exportedSingle", "success", { name: result.name });
}

async function exportImageArchive(targets, kind) {
  const zipName = createTimestampZipName(new Date());
  let summary = null;
  const result = await saveExport(zipName, "application/zip", ".zip", "ZIP", async () => {
    const entries = [];
    const usedNames = new Set();
    let failed = 0;
    for (let index = 0; index < targets.length; index++) {
      const documentRecord = targets[index];
      documentRecord.exportState = "processing";
      renderGallery();
      setStatus("convertingImages", "info", { current: index + 1, total: targets.length });
      try {
        const blob = await createOutputBlob(documentRecord, kind);
        const name = createUniqueOutputName(documentRecord.file.name, EXPORT_FORMATS[kind].extension, usedNames);
        entries.push({ name, blob });
        documentRecord.exportState = "success";
      } catch {
        failed++;
        documentRecord.exportState = "error";
      }
      renderGallery();
    }
    if (!entries.length) throw new StatusError("exportFailed");
    setStatus("creatingZip", "info");
    summary = { success: entries.length, failed };
    return createStoredZip(entries, new Date());
  });
  if (!result || !summary) return;
  if (summary.failed) setStatus("exportPartial", "warning", { name: result.name, success: summary.success, failed: summary.failed });
  else setStatus("exportedMultiple", "success", { count: summary.success, name: result.name });
}

function beginExport() {
  if (exportInProgress || state.opening) return false;
  openRequestId++;
  detailRequestId++;
  exportInProgress = true;
  updateControls();
  renderGallery();
  return true;
}

function endExport() {
  exportInProgress = false;
  updateControls();
  renderGallery();
}

async function createOutputBlob(documentRecord, kind) {
  const image = await decodeDocumentSource(documentRecord);
  const canvas = createRenderedCanvas(documentRecord, image, kind === "jpg" ? state.background.color : null);
  if (kind === "png") return canvasBlob(canvas, "image/png");
  if (kind === "jpg") return canvasBlob(canvas, "image/jpeg", 1);
  if (canvas.width > CTEX_MAX_DIMENSION || canvas.height > CTEX_MAX_DIMENSION) throw new StatusError("dimensionLimit");
  return createCtexBlob(canvas);
}

function createRenderedCanvas(documentRecord, image, backgroundColor = null) {
  const { width, height } = getDocumentDimensions(documentRecord);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const targetContext = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (backgroundColor) {
    targetContext.fillStyle = backgroundColor;
    targetContext.fillRect(0, 0, width, height);
  }
  drawTransformedImage(targetContext, image, documentRecord, width, height);
  return canvas;
}

async function createCtexBlob(canvas) {
  const pixelFormat = hasTransparency(canvas) ? IMAGE_FORMAT_RGBA8 : IMAGE_FORMAT_RGB8;
  const webp = await canvasBlob(canvas, "image/webp", 1);
  const webpBytes = new Uint8Array(await webp.arrayBuffer());
  if (readAscii(webpBytes, 0, 4) !== "RIFF" || readAscii(webpBytes, 8, 4) !== "WEBP") throw new StatusError("exportFailed");
  const header = createWebpCtexHeader(canvas.width, canvas.height, pixelFormat, webpBytes.length);
  return new Blob([header, webpBytes], { type: "application/octet-stream" });
}

async function saveExport(suggestedName, mime, extension, description, blobFactory) {
  let handle = null;
  if ("showSaveFilePicker" in window) {
    try {
      handle = await window.showSaveFilePicker({ suggestedName, types: [{ description, accept: { [mime]: [extension] } }] });
    } catch (error) {
      if (error.name === "AbortError") return null;
    }
  }
  const blob = await blobFactory();
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { name: handle.name || suggestedName };
  }
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: suggestedName });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { name: suggestedName };
}

function createUniqueOutputName(originalName, extension, usedNames) {
  const stem = baseName(originalName);
  let candidate = `${stem}${extension}`;
  let number = 2;
  while (usedNames.has(candidate.toLocaleLowerCase("en-US"))) candidate = `${stem} (${number++})${extension}`;
  usedNames.add(candidate.toLocaleLowerCase("en-US"));
  return candidate;
}

function createTimestampZipName(date) {
  const part = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}_${part(date.getHours())}-${part(date.getMinutes())}-${part(date.getSeconds())}.zip`;
}

async function createStoredZip(entries, timestamp) {
  const localParts = [];
  const centralParts = [];
  const { time, date } = toDosDateTime(timestamp);
  let offset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    if (nameBytes.length > 0xffff || entry.blob.size > ZIP_UINT32_MAX || offset > ZIP_UINT32_MAX) throw new StatusError("zipFailed");
    const crc = await crc32Blob(entry.blob);
    const size = entry.blob.size;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, entry.blob);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    centralSize += centralHeader.length;
    offset += localHeader.length + size;
  }

  if (offset + centralSize > ZIP_UINT32_MAX) throw new StatusError("zipFailed");
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

function toDosDateTime(value) {
  const year = Math.max(1980, Math.min(2107, value.getFullYear()));
  return {
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate()
  };
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    table[index] = value >>> 0;
  }
  return table;
}

async function crc32Blob(blob) {
  let crc = 0xffffffff;
  if (blob.stream) {
    const reader = blob.stream().getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const byte of value) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
  } else {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
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

function hasTransparency(canvas) {
  const pixels = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
  for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] !== 255) return true;
  return false;
}

function clearDocuments() {
  openRequestId++;
  detailRequestId++;
  resetDocumentState();
  renderApplication();
  setStatus("cleared", "success");
}

function resetDocumentState() {
  for (const documentRecord of state.documents) if (documentRecord.thumbnailUrl) URL.revokeObjectURL(documentRecord.thumbnailUrl);
  state.documents = [];
  state.selectedId = null;
  state.view = "empty";
  state.detailFromList = false;
  state.galleryScrollTop = 0;
  state.galleryScrollLeft = 0;
  state.activeImage = null;
  state.activeImageId = null;
  state.zoom = 1;
  state.opening = false;
  elements.canvas.width = 0;
  elements.canvas.height = 0;
  elements.canvas.style.width = "";
  elements.canvas.style.height = "";
  elements.previewPanel.scrollTop = 0;
  elements.previewPanel.scrollLeft = 0;
  elements.zoomReset.textContent = "100%";
}

function updateControls() {
  const selected = getSelectedDocument();
  const editable = Boolean(selected && !selected.errorKey && !state.opening && !exportInProgress);
  const zoomable = editable && state.view === "detail" && Boolean(state.activeImage);
  elements.clearFile.disabled = (!state.documents.length && !state.opening) || exportInProgress;
  for (const element of [elements.rotateLeft, elements.rotateRight, elements.rotate180, elements.resetTransform, elements.flipHorizontal, elements.flipVertical]) element.disabled = !editable;
  for (const element of [elements.zoomIn, elements.zoomOut, elements.zoomReset]) element.disabled = !zoomable;
  for (const element of [elements.openPng, elements.openJpg, elements.openCtex]) element.disabled = exportInProgress;
  updateExportButtons();
  updatePreviewActions();
}

function updateExportButtons() {
  const disabled = exportInProgress || state.opening || !state.documents.some((item) => item.checked && !item.errorKey);
  for (const element of [elements.exportPng, elements.exportJpg, elements.exportCtex]) element.disabled = disabled;
}

function setStatus(key, type = "info", values = {}) {
  state.status = { key, type, values };
  renderStatus();
}

function renderStatus() {
  const { key, type, values } = state.status;
  elements.statusText.textContent = t(key, values);
  elements.statusIcon.textContent = type === "success" ? "✓" : type === "error" || type === "warning" ? "⚠" : "ⓘ";
  elements.status.className = `status status-${type}`;
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
renderApplication();
