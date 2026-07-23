import {
  CTEX_MAX_DIMENSION,
  CTEX_WEBP_PAYLOAD_OFFSET,
  EXPORT_FORMATS,
  IMAGE_FORMATS,
  IMAGE_FORMAT_RGB8,
  IMAGE_FORMAT_RGBA8,
  JPEG_METADATA_LIMIT,
  MAX_ARCHIVE_BYTES,
  MAX_BATCH_PIXELS,
  calculateGalleryColumns,
  calculateGalleryNavigationIndex,
  calculateStoredZipEntrySize,
  createBmpHeader,
  createStoredZip,
  createTimestampZipName,
  createUniqueOutputName,
  createWebpCtexHeader,
  detectHintKind,
  detectSignatureKind,
  getBmpFileSize,
  readAscii,
  stripSupportedExtension,
  validatePixelDimensions,
  writeBmpBgraRows
} from "./core.js?v=0.8.4";
import { translations } from "./locales.js?v=0.8.4";

const FILE_SIGNATURE_BYTES = 70;
const MAX_FILES = 20;
const MAX_THUMBNAIL_SIZE = 640;
const GALLERY_RESIZE_DELAY = 100;
const BMP_SCAN_ROWS = 32;
const ALPHA_SCAN_ROWS = 128;
const PRESET_COLORS = { white: "#ffffff", gray: "#808080", black: "#000000" };
const FORMAT_BADGES = { png: "PNG", jpg: "JPG", bmp: "BMP", ctex: "CTEX" };
const CLIPBOARD_MIME_KINDS = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/pjpeg", "jpg"],
  ["image/bmp", "bmp"],
  ["image/x-ms-bmp", "bmp"]
]);
const SUPPORTED_LANGUAGES = ["en", "ko", "zh-CN", "zh-TW", "ja", "ru", "es"];
const BACKGROUND_STORAGE_KEY = "ctex-converter-jpg-background";

const state = {
  documents: [],
  selectedId: null,
  view: "empty",
  detailFromList: false,
  galleryScrollTop: 0,
  galleryScrollLeft: 0,
  activeImage: null,
  activeImageId: null,
  detailLoading: false,
  zoom: 1,
  autoShrink: true,
  opening: false,
  language: getSavedLanguage(),
  theme: getSavedTheme(),
  background: getSavedBackground(),
  status: { key: "start", type: "info", values: {} }
};

const $ = (id) => document.getElementById(id);
const elements = {
  appShell: document.querySelector(".app-shell"),
  openPng: $("open-png"),
  openJpg: $("open-jpg"),
  openBmp: $("open-bmp"),
  openCtex: $("open-ctex"),
  openTogether: $("open-together"),
  clearFile: $("clear-file"),
  allInput: $("all-input"),
  pngInput: $("png-input"),
  jpgInput: $("jpg-input"),
  bmpInput: $("bmp-input"),
  ctexInput: $("ctex-input"),
  exportPng: $("export-png"),
  exportJpg: $("export-jpg"),
  exportBmp: $("export-bmp"),
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
  previewCount: $("preview-count"),
  selectAll: $("select-all"),
  viewLarger: $("view-larger"),
  backList: $("back-list"),
  previousImage: $("previous-image"),
  nextImage: $("next-image"),
  dropOverlay: $("drop-overlay"),
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
  languageSelect: $("language-select"),
  footer: document.querySelector(".footer")
};
const infoButtons = [...document.querySelectorAll("[data-info-button]")];
const context = elements.canvas.getContext("2d", { alpha: true, willReadFrequently: true });
let openRequestId = 0;
let detailRequestId = 0;
let documentId = 0;
let exportInProgress = false;
let dragDepth = 0;
let galleryResizeTimer = 0;
let galleryScaleFrame = 0;

class StatusError extends Error {
  constructor(key) {
    super(key);
    this.key = key;
  }
}

elements.openPng.addEventListener("click", () => elements.pngInput.click());
elements.openJpg.addEventListener("click", () => elements.jpgInput.click());
elements.openBmp.addEventListener("click", () => elements.bmpInput.click());
elements.openCtex.addEventListener("click", () => elements.ctexInput.click());
elements.openTogether.addEventListener("click", () => elements.allInput.click());
elements.clearFile.addEventListener("click", clearDocuments);
elements.allInput.addEventListener("change", (event) => handleFileInput(event));
elements.pngInput.addEventListener("change", (event) => handleFileInput(event, "png"));
elements.jpgInput.addEventListener("change", (event) => handleFileInput(event, "jpg"));
elements.bmpInput.addEventListener("change", (event) => handleFileInput(event, "bmp"));
elements.ctexInput.addEventListener("change", (event) => handleFileInput(event, "ctex"));
elements.exportPng.addEventListener("click", () => exportImages("png"));
elements.exportJpg.addEventListener("click", () => exportImages("jpg"));
elements.exportBmp.addEventListener("click", () => exportImages("bmp"));
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
elements.previousImage.addEventListener("click", () => navigateDetail(-1));
elements.nextImage.addEventListener("click", () => navigateDetail(1));
elements.languageSelect.addEventListener("change", (event) => setLanguage(event.target.value));
elements.themeToggle.addEventListener("click", toggleTheme);
elements.jpgBackground.addEventListener("change", () => setBackgroundMode(elements.jpgBackground.value));
elements.bgR.addEventListener("input", updateCustomFromRgb);
elements.bgG.addEventListener("input", updateCustomFromRgb);
elements.bgB.addEventListener("input", updateCustomFromRgb);
elements.bgHex.addEventListener("input", updateCustomFromHex);
for (const input of [elements.bgR, elements.bgG, elements.bgB]) input.addEventListener("blur", normalizeRgbInputs);
elements.bgHex.addEventListener("blur", normalizeHexInput);
elements.bgColorPicker.addEventListener("input", () => setCustomBackground(elements.bgColorPicker.value));
elements.autoShrink.addEventListener("change", toggleAutoShrink);

window.addEventListener("resize", () => {
  if (state.view === "detail" && state.activeImage && state.autoShrink) setZoom(calculateAutoShrinkZoom());
  scheduleGalleryLayoutUpdate();
  positionOpenInfoPopovers();
  positionDropOverlay();
});
window.addEventListener("scroll", positionOpenInfoPopovers, true);
window.addEventListener("scroll", positionDropOverlay, true);

elements.previewPanel.addEventListener("dragenter", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth++;
  setDragState(true);
});
elements.previewPanel.addEventListener("dragover", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  positionDropOverlay();
});
elements.previewPanel.addEventListener("dragleave", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) setDragState(false);
});
elements.previewPanel.addEventListener("drop", (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault();
  dragDepth = 0;
  setDragState(false);
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
document.addEventListener("keydown", handleDocumentKeydown);
document.addEventListener("paste", handlePaste);

function isFileDrag(event) {
  return dragDepth > 0 || [...(event.dataTransfer?.types || [])].includes("Files");
}

function setDragState(active) {
  elements.previewPanel.classList.toggle("dragging", active);
  elements.dropOverlay.hidden = !active || state.documents.length === 0;
  if (active) positionDropOverlay();
}

function positionDropOverlay() {
  if (elements.dropOverlay.hidden) return;
  const rect = elements.previewPanel.getBoundingClientRect();
  elements.dropOverlay.style.left = `${Math.max(0, rect.left)}px`;
  elements.dropOverlay.style.top = `${Math.max(0, rect.top)}px`;
  elements.dropOverlay.style.width = `${Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(0, rect.left))}px`;
  elements.dropOverlay.style.height = `${Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(0, rect.top))}px`;
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape") {
    const hadOpenPopover = infoButtons.some((button) => button.closest(".info-control")?.classList.contains("is-open"));
    closeInfoPopovers();
    if (document.activeElement?.matches?.("[data-info-button]")) document.activeElement.blur();
    if (!hadOpenPopover && state.view === "detail" && state.detailFromList) {
      event.preventDefault();
      returnToList();
    }
    return;
  }
  if (event.repeat || state.view !== "detail" || state.detailLoading || exportInProgress || isInteractiveKeyboardTarget(event.target)) return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    navigateDetail(event.key === "ArrowLeft" ? -1 : 1);
  }
}

function isInteractiveKeyboardTarget(target) {
  return target instanceof Element && Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}

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
    [elements.zoomIn, "zoomIn10"],
    [elements.viewLarger, "viewLarger"],
    [elements.backList, "backToList"],
    [elements.previousImage, "previousImage"],
    [elements.nextImage, "nextImage"]
  ]) setButtonLabel(element, key);
  for (const [element, key] of [
    [elements.openPng, "openPng"],
    [elements.openJpg, "openJpg"],
    [elements.openBmp, "openBmp"],
    [elements.openCtex, "openCtex"],
    [elements.openTogether, "openTogether"],
    [elements.exportPng, "exportPng"],
    [elements.exportJpg, "exportJpg"],
    [elements.exportBmp, "exportBmp"],
    [elements.exportCtex, "exportCtex"]
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
    if (control.classList.contains("is-open") || control.matches(":hover") || control.contains(document.activeElement)) positionInfoPopover(control);
  }
}

function positionInfoPopover(control) {
  const popover = control.querySelector(".info-popover");
  if (!popover) return;
  control.classList.remove("open-up");
  popover.style.left = "";
  popover.style.right = "";
  popover.style.top = "";
  popover.style.bottom = "";
  popover.style.maxHeight = "";
  const rect = control.getBoundingClientRect();
  const height = popover.scrollHeight;
  const below = Math.max(0, window.innerHeight - rect.bottom - 12);
  const above = Math.max(0, rect.top - 12);
  const openUp = below < height && above > below;
  if (openUp) control.classList.add("open-up");
  const available = Math.max(96, (openUp ? above : below) - 8);
  const maxHeight = Math.min(320, available);
  popover.style.maxHeight = `${maxHeight}px`;

  const margin = 12;
  const gap = 6;
  const popoverRect = popover.getBoundingClientRect();
  const width = popoverRect.width;
  const preferredLeft = control.closest(".preview-title") ? rect.left : rect.right - width;
  const maximumLeft = Math.max(margin, window.innerWidth - width - margin);
  const left = Math.min(Math.max(margin, preferredLeft), maximumLeft);
  const visibleHeight = Math.min(height, maxHeight);
  const top = openUp
    ? Math.max(margin, rect.top - gap - visibleHeight)
    : Math.min(window.innerHeight - margin - visibleHeight, rect.bottom + gap);
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(Math.max(margin, top))}px`;
}

function handlePaste(event) {
  if (isInteractiveKeyboardTarget(event.target) || state.opening || exportInProgress) return;
  const files = getClipboardImageFiles(event.clipboardData);
  if (!files.length) return;
  event.preventDefault();
  openFiles(nameClipboardFiles(files));
}

function getClipboardImageFiles(clipboardData) {
  if (!clipboardData) return [];
  const itemFiles = [...(clipboardData.items || [])]
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const candidates = itemFiles.length ? itemFiles : [...(clipboardData.files || [])];
  return candidates.filter((file) => detectHintKind(file) || CLIPBOARD_MIME_KINDS.has((file.type || "").toLowerCase()));
}

function nameClipboardFiles(files, now = new Date()) {
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-") + "_" + [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("-");
  let generated = 0;
  return files.map((file) => {
    if (isMeaningfulClipboardName(file.name)) return file;
    generated++;
    const kind = detectHintKind(file) || CLIPBOARD_MIME_KINDS.get((file.type || "").toLowerCase()) || "png";
    const suffix = generated === 1 ? "" : `-${generated}`;
    return new File([file], `clipboard-${timestamp}${suffix}.${kind}`, {
      type: file.type,
      lastModified: file.lastModified
    });
  });
}

function isMeaningfulClipboardName(name) {
  return Boolean(name && !/^(?:image|clipboard|blob)(?:\.[a-z0-9]+)?$/i.test(name.trim()));
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
  let batchPixels = 0;
  let singleErrorKey = "imageRead";
  let singleImage = null;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    let documentRecord;
    let decodedImage = null;
    try {
      const loaded = await createDocumentRecord(file, expectedKind, MAX_BATCH_PIXELS - batchPixels);
      documentRecord = loaded.documentRecord;
      decodedImage = loaded.image;
      batchPixels += documentRecord.sourceWidth * documentRecord.sourceHeight;
      success++;
    } catch (error) {
      singleErrorKey = error instanceof StatusError ? error.key : "imageRead";
      documentRecord = createErrorDocument(file, expectedKind || detectHintKind(file), singleErrorKey);
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

async function createDocumentRecord(file, expectedKind, remainingBatchPixels) {
  const kind = await detectKind(file, expectedKind);
  const loaded = await decodeAndInspect(file, kind, remainingBatchPixels);
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
    metadata: { format: IMAGE_FORMATS[kind]?.label || "-", dpi: null },
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

async function detectKind(file, expectedKind = null) {
  const bytes = new Uint8Array(await file.slice(0, FILE_SIGNATURE_BYTES).arrayBuffer());
  const signatureKind = detectSignatureKind(bytes);
  const hintedKind = detectHintKind(file);
  if (!signatureKind) {
    const intendedKind = expectedKind || hintedKind;
    if (intendedKind === "ctex") throw new StatusError("ctexRead");
    if (intendedKind) throw new StatusError("imageRead");
    throw new StatusError("unsupportedFile");
  }
  if (expectedKind && signatureKind !== expectedKind) throw new StatusError("unsupportedFile");
  return signatureKind;
}

async function inspectFile(file, kind) {
  const descriptor = IMAGE_FORMATS[kind];
  if (!descriptor) throw new StatusError("unsupportedFile");
  const readLimit = kind === "jpg" ? JPEG_METADATA_LIMIT : kind === "bmp" ? 256 : FILE_SIGNATURE_BYTES;
  const bytes = new Uint8Array(await file.slice(0, Math.min(file.size, readLimit)).arrayBuffer());
  try {
    return descriptor.parse(bytes, file.size);
  } catch (error) {
    if (error?.message === "ctex-unsupported") throw new StatusError("unsupportedCtex");
    if (kind === "ctex") throw new StatusError("ctexRead");
    throw new StatusError("imageRead");
  }
}

async function decodeAndInspect(file, kind, remainingBatchPixels = MAX_BATCH_PIXELS) {
  const metadata = await inspectFile(file, kind);
  const expectedWidth = metadata.decodedWidth || metadata.width;
  const expectedHeight = metadata.decodedHeight || metadata.height;
  if (!validatePixelDimensions(expectedWidth, expectedHeight)) throw new StatusError("imageTooLarge");
  if (expectedWidth * expectedHeight > remainingBatchPixels) throw new StatusError("batchTooLarge");
  const source = kind === "ctex"
    ? file.slice(CTEX_WEBP_PAYLOAD_OFFSET, file.size, "image/webp")
    : file;
  try {
    const image = await decodeImage(source);
    const decodedMatches = image.naturalWidth === expectedWidth && image.naturalHeight === expectedHeight;
    const rawMatches = image.naturalWidth === metadata.width && image.naturalHeight === metadata.height;
    if (!decodedMatches && !rawMatches) throw new StatusError(kind === "ctex" ? "ctexRead" : "imageRead");
    if (!decodedMatches && rawMatches && metadata.dpi && metadata.orientation >= 5 && metadata.orientation <= 8) {
      metadata.dpi = { x: metadata.dpi.y, y: metadata.dpi.x };
    }
    return { image, metadata };
  } catch (error) {
    if (error instanceof StatusError) throw error;
    throw new StatusError(kind === "ctex" ? "ctexRead" : "imageRead");
  }
}

async function decodeDocumentSource(documentRecord) {
  const loaded = await decodeAndInspect(documentRecord.file, documentRecord.kind);
  if (loaded.image.naturalWidth !== documentRecord.sourceWidth || loaded.image.naturalHeight !== documentRecord.sourceHeight) throw new StatusError(documentRecord.kind === "ctex" ? "ctexRead" : "imageRead");
  return loaded.image;
}

async function createThumbnailUrl(image) {
  const scale = Math.min(1, MAX_THUMBNAIL_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const thumbnailContext = canvas.getContext("2d");
  if (!thumbnailContext) throw new StatusError("imageTooLarge");
  thumbnailContext.drawImage(image, 0, 0, canvas.width, canvas.height);
  return URL.createObjectURL(await canvasBlob(canvas, "image/png"));
}

function renderApplication() {
  renderPreview();
  updateMetadata();
  updateControls();
}

function renderPreview() {
  const isEmpty = state.documents.length === 0;
  const galleryVisible = state.view === "gallery" && !isEmpty;
  elements.dropZone.hidden = !isEmpty || state.opening;
  elements.gallery.hidden = !galleryVisible;
  elements.previewLoading.hidden = !state.detailLoading;
  elements.canvasWrap.hidden = state.view !== "detail" || !state.activeImage;
  elements.previewPanel.classList.toggle("gallery-view", galleryVisible);
  if (state.view === "gallery") renderGallery();
  if (state.view === "detail" && state.activeImage) renderCanvas();
}

function renderGallery() {
  if (!elements.gallery || state.view !== "gallery") return;
  elements.gallery.replaceChildren();
  updateGalleryLayout();
  for (const [index, documentRecord] of state.documents.entries()) {
    const tile = document.createElement("article");
    tile.className = "gallery-item";
    tile.dataset.documentId = String(documentRecord.id);
    if (documentRecord.id === state.selectedId) tile.classList.add("selected");
    if (documentRecord.errorKey) tile.classList.add("has-error");
    if (documentRecord.exportState !== "idle") tile.classList.add(`export-${documentRecord.exportState}`);

    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "gallery-select";
    selectButton.setAttribute("aria-label", t("selectImage", { name: documentRecord.file.name }));
    selectButton.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight ArrowUp ArrowDown Enter Space");
    if (documentRecord.id === state.selectedId) selectButton.setAttribute("aria-current", "true");
    selectButton.addEventListener("click", () => selectDocument(documentRecord.id));
    selectButton.addEventListener("dblclick", () => {
      if (documentRecord.errorKey) return;
      selectDocument(documentRecord.id);
      enterDetailView();
    });
    selectButton.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        moveGalleryFocus(event, index);
      } else if (event.key === "Enter") {
        event.preventDefault();
        selectDocument(documentRecord.id);
        if (!documentRecord.errorKey) enterDetailView();
      } else if (isSpaceKey(event.key)) {
        event.preventDefault();
        selectDocument(documentRecord.id);
        toggleDocumentCheck(documentRecord.id);
      }
    });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "gallery-check";
    checkbox.checked = documentRecord.checked;
    checkbox.disabled = Boolean(documentRecord.errorKey) || exportInProgress || state.opening;
    checkbox.setAttribute("aria-label", t("includeInExport", { name: documentRecord.file.name }));
    const updateCheckedState = () => {
      documentRecord.checked = checkbox.checked;
      updateControls();
    };
    checkbox.addEventListener("change", updateCheckedState);
    checkbox.addEventListener("keydown", (event) => {
      if (!isSpaceKey(event.key) || event.repeat) return;
      event.preventDefault();
      checkbox.checked = !checkbox.checked;
      updateCheckedState();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "gallery-remove";
    remove.textContent = "×";
    remove.disabled = exportInProgress || state.opening;
    remove.setAttribute("aria-label", t("removeImage", { name: documentRecord.file.name }));
    remove.addEventListener("click", () => removeDocument(documentRecord.id));
    remove.addEventListener("keydown", (event) => {
      if ((event.key !== "Enter" && !isSpaceKey(event.key)) || event.repeat) return;
      event.preventDefault();
      removeDocument(documentRecord.id);
    });

    let editedBadge = null;
    if (hasDocumentEdits(documentRecord)) {
      editedBadge = document.createElement("span");
      editedBadge.className = "gallery-edited-badge";
      editedBadge.textContent = "✎";
      editedBadge.title = t("editedImage");
      editedBadge.setAttribute("role", "img");
      editedBadge.setAttribute("aria-label", t("editedImage"));
    }

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

    const caption = document.createElement("span");
    caption.className = "gallery-name";
    const formatBadge = document.createElement("span");
    formatBadge.className = "gallery-format-badge";
    formatBadge.textContent = FORMAT_BADGES[documentRecord.kind] || "?";
    formatBadge.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "gallery-file-name";
    name.textContent = documentRecord.file.name;
    caption.append(formatBadge, name);

    selectButton.append(thumbnail, caption);
    tile.append(selectButton, checkbox, remove);
    if (editedBadge) tile.append(editedBadge);
    const badge = createGalleryBadge(documentRecord);
    if (badge) tile.append(badge);
    elements.gallery.append(tile);
  }
}

function isSpaceKey(key) {
  return key === " " || key === "Space" || key === "Spacebar";
}

function moveGalleryFocus(event, index) {
  const columns = Math.max(1, Number.parseInt(getComputedStyle(elements.gallery).getPropertyValue("--gallery-columns"), 10) || 1);
  event.preventDefault();
  const nextIndex = calculateGalleryNavigationIndex(state.documents.length, columns, index, event.key);
  if (nextIndex === index) return;
  const documentRecord = state.documents[nextIndex];
  selectDocument(documentRecord.id);
  const button = elements.gallery.querySelector(`.gallery-item[data-document-id="${documentRecord.id}"] .gallery-select`);
  button?.focus({ preventScroll: true });
  button?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function toggleDocumentCheck(id) {
  const documentRecord = state.documents.find((item) => item.id === id);
  if (!documentRecord || documentRecord.errorKey || exportInProgress || state.opening) return;
  documentRecord.checked = !documentRecord.checked;
  const checkbox = elements.gallery.querySelector(`.gallery-item[data-document-id="${id}"] .gallery-check`);
  if (checkbox) checkbox.checked = documentRecord.checked;
  updateControls();
}

function updateGalleryLayout() {
  const count = state.documents.length;
  const multiple = count >= 2;
  elements.gallery.className = `gallery ${multiple ? "gallery-multiple" : "gallery-single"}`;
  elements.gallery.style.removeProperty("--gallery-columns");
  if (multiple) {
    const { width, height, gap } = getGalleryAvailableSize();
    elements.gallery.style.setProperty("--gallery-columns", calculateGalleryColumns(count, width, height, gap));
  }
  scheduleGalleryThumbnailScaleUpdate();
}

function scheduleGalleryLayoutUpdate() {
  if (galleryResizeTimer) clearTimeout(galleryResizeTimer);
  galleryResizeTimer = window.setTimeout(() => {
    galleryResizeTimer = 0;
    if (state.view === "gallery" && state.documents.length) updateGalleryLayout();
  }, GALLERY_RESIZE_DELAY);
}

function getGalleryAvailableSize() {
  const panelStyle = getComputedStyle(elements.previewPanel);
  const galleryStyle = getComputedStyle(elements.gallery);
  const appStyle = getComputedStyle(elements.appShell);
  const pixels = (value) => parseFloat(value) || 0;
  const horizontalPadding = pixels(panelStyle.paddingLeft) + pixels(panelStyle.paddingRight);
  const verticalPadding = pixels(panelStyle.paddingTop) + pixels(panelStyle.paddingBottom);
  const panelRect = elements.previewPanel.getBoundingClientRect();
  const viewportPanelHeight = Math.max(
    1,
    window.innerHeight
      - Math.max(0, panelRect.top)
      - elements.footer.offsetHeight
      - pixels(appStyle.paddingBottom)
  );
  return {
    width: Math.max(1, elements.previewPanel.clientWidth - horizontalPadding),
    height: Math.max(1, Math.min(elements.previewPanel.clientHeight, viewportPanelHeight) - verticalPadding),
    gap: pixels(galleryStyle.columnGap) || 16
  };
}

function scheduleGalleryThumbnailScaleUpdate() {
  if (galleryScaleFrame) cancelAnimationFrame(galleryScaleFrame);
  galleryScaleFrame = requestAnimationFrame(() => {
    galleryScaleFrame = 0;
    updateGalleryThumbnailScales();
  });
}

function updateGalleryThumbnailScales() {
  if (state.view !== "gallery") return;
  for (const tile of elements.gallery.querySelectorAll(".gallery-item")) {
    const documentRecord = state.documents.find((item) => item.id === Number(tile.dataset.documentId));
    const thumbnail = tile.querySelector(".gallery-thumbnail");
    const image = thumbnail?.querySelector("img");
    if (!documentRecord || !thumbnail || !image) continue;

    const rotated = Math.abs(documentRecord.rotation % 180) === 90;
    const boundingWidth = rotated ? documentRecord.sourceHeight : documentRecord.sourceWidth;
    const boundingHeight = rotated ? documentRecord.sourceWidth : documentRecord.sourceHeight;
    const fit = Math.min(thumbnail.clientWidth / boundingWidth, thumbnail.clientHeight / boundingHeight);
    const scale = state.autoShrink ? Math.min(1, Math.max(.1, fit)) : 1;
    image.style.width = `${Math.max(1, Math.round(documentRecord.sourceWidth * scale))}px`;
    image.style.height = `${Math.max(1, Math.round(documentRecord.sourceHeight * scale))}px`;
  }
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
  for (const tile of elements.gallery.querySelectorAll(".gallery-item")) {
    const selected = Number(tile.dataset.documentId) === id;
    tile.classList.toggle("selected", selected);
    const selectButton = tile.querySelector(".gallery-select");
    if (selected) selectButton?.setAttribute("aria-current", "true");
    else selectButton?.removeAttribute("aria-current");
  }
  updateMetadata();
  updateControls();
}

async function enterDetailView() {
  const documentRecord = getSelectedDocument();
  if (!documentRecord || documentRecord.errorKey || state.opening || exportInProgress) return;
  const requestId = ++detailRequestId;
  const enteringFromGallery = state.view === "gallery";
  if (enteringFromGallery) {
    state.detailFromList = true;
    state.galleryScrollTop = elements.previewPanel.scrollTop;
    state.galleryScrollLeft = elements.previewPanel.scrollLeft;
  }
  state.view = "detail";
  state.activeImage = null;
  state.activeImageId = null;
  state.detailLoading = true;
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
    state.detailLoading = false;
    renderApplication();
  } catch (error) {
    if (requestId !== detailRequestId) return;
    documentRecord.errorKey = error instanceof StatusError ? error.key : "imageRead";
    documentRecord.checked = false;
    state.activeImage = null;
    state.activeImageId = null;
    state.detailLoading = false;
    state.view = "gallery";
    state.detailFromList = false;
    renderApplication();
    setStatus(documentRecord.errorKey, "error");
  }
}

function navigateDetail(direction) {
  if (state.view !== "detail" || state.detailLoading || state.opening || exportInProgress) return;
  const documents = state.documents.filter((item) => !item.errorKey);
  const index = documents.findIndex((item) => item.id === state.selectedId);
  const next = documents[index + direction];
  if (index === -1 || !next) return;
  state.selectedId = next.id;
  updateMetadata();
  enterDetailView();
}

function returnToList() {
  if (!state.detailFromList) return;
  detailRequestId++;
  state.view = "gallery";
  state.detailFromList = false;
  state.activeImage = null;
  state.activeImageId = null;
  state.detailLoading = false;
  state.zoom = 1;
  elements.zoomReset.textContent = "100%";
  renderApplication();
  requestAnimationFrame(() => {
    elements.previewPanel.scrollTop = state.galleryScrollTop;
    elements.previewPanel.scrollLeft = state.galleryScrollLeft;
    const selectedButton = elements.gallery.querySelector(".gallery-item.selected .gallery-select");
    selectedButton?.focus({ preventScroll: true });
    const selectedTile = selectedButton?.closest(".gallery-item");
    if (selectedTile) {
      const panelRect = elements.previewPanel.getBoundingClientRect();
      const tileRect = selectedTile.getBoundingClientRect();
      const outside = tileRect.top < panelRect.top || tileRect.bottom > panelRect.bottom || tileRect.left < panelRect.left || tileRect.right > panelRect.right;
      if (outside) selectedTile.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
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
  const detailNavigationVisible = state.view === "detail" && state.detailFromList && valid.length > 1;
  const detailIndex = valid.findIndex((item) => item.id === state.selectedId);
  const checkedCount = valid.filter((item) => item.checked).length;
  elements.previewCount.hidden = state.documents.length === 0;
  const countText = state.documents.length ? t("previewCount", { total: state.documents.length, selected: checkedCount }) : "";
  if (elements.previewCount.textContent !== countText) elements.previewCount.textContent = countText;
  elements.selectAll.hidden = !listVisible;
  elements.viewLarger.hidden = !listVisible;
  elements.backList.hidden = state.view !== "detail" || !state.detailFromList;
  elements.previousImage.hidden = !detailNavigationVisible;
  elements.nextImage.hidden = !detailNavigationVisible;
  elements.selectAll.disabled = !valid.length || state.opening || exportInProgress;
  elements.viewLarger.disabled = !selected || Boolean(selected.errorKey) || state.opening || exportInProgress;
  elements.previousImage.disabled = !detailNavigationVisible || detailIndex <= 0 || state.detailLoading || state.opening || exportInProgress;
  elements.nextImage.disabled = !detailNavigationVisible || detailIndex < 0 || detailIndex >= valid.length - 1 || state.detailLoading || state.opening || exportInProgress;
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

function hasDocumentEdits(documentRecord) {
  return documentRecord.rotation !== 0 || documentRecord.flipX || documentRecord.flipY;
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
  const documentRecord = getSelectedDocument();
  if (documentRecord) documentRecord.exportState = "idle";
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
  if (state.view === "gallery") scheduleGalleryThumbnailScaleUpdate();
}

function setBackgroundMode(mode) {
  if (mode !== "custom" && !Object.hasOwn(PRESET_COLORS, mode)) return;
  state.background.mode = mode;
  state.background.color = mode === "custom" ? state.background.customColor : PRESET_COLORS[mode];
  saveBackgroundPreference();
  invalidateExportStates();
  updateBackgroundControls();
}

function updateCustomFromRgb() {
  const values = [elements.bgR.value, elements.bgG.value, elements.bgB.value].map(Number);
  const invalid = values.some((value) => !Number.isInteger(value) || value < 0 || value > 255);
  for (const input of [elements.bgR, elements.bgG, elements.bgB]) input.setAttribute("aria-invalid", String(invalid));
  if (invalid) return;
  setCustomBackground(`#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
}

function updateCustomFromHex() {
  const value = elements.bgHex.value.trim();
  const valid = /^#[0-9a-f]{6}$/i.test(value);
  elements.bgHex.setAttribute("aria-invalid", String(!valid));
  if (valid) setCustomBackground(value);
}

function normalizeRgbInputs() {
  const values = [elements.bgR.value, elements.bgG.value, elements.bgB.value].map((value) => Math.max(0, Math.min(255, Math.round(Number(value)))));
  if (values.some((value) => !Number.isFinite(value))) {
    updateBackgroundControls();
    return;
  }
  setCustomBackground(`#${values.map((value) => value.toString(16).padStart(2, "0")).join("")}`);
}

function normalizeHexInput() {
  if (/^#[0-9a-f]{6}$/i.test(elements.bgHex.value.trim())) setCustomBackground(elements.bgHex.value.trim());
  else updateBackgroundControls();
}

function setCustomBackground(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return;
  const hex = value.toUpperCase();
  state.background.mode = "custom";
  state.background.customColor = hex;
  state.background.color = hex;
  saveBackgroundPreference();
  invalidateExportStates();
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
  for (const input of [elements.bgR, elements.bgG, elements.bgB, elements.bgHex]) input.setAttribute("aria-invalid", "false");
}

function invalidateExportStates() {
  let changed = false;
  for (const documentRecord of state.documents) {
    if (documentRecord.exportState === "idle") continue;
    documentRecord.exportState = "idle";
    changed = true;
  }
  if (changed && state.view === "gallery") renderGallery();
}

async function exportImages(kind) {
  const targets = state.documents.filter((item) => item.checked && !item.errorKey);
  if (!targets.length || !EXPORT_FORMATS[kind]) return;
  try {
    validateExportPlan(targets, kind);
  } catch (error) {
    setStatus(error instanceof StatusError ? error.key : "exportFailed", "error");
    return;
  }
  if (!beginExport()) return;
  const exportOptions = { backgroundColor: state.background.color };
  try {
    for (const documentRecord of state.documents) documentRecord.exportState = "idle";
    if (targets.length === 1) await exportSingleImage(targets[0], kind, exportOptions);
    else await exportImageArchive(targets, kind, exportOptions);
  } catch (error) {
    for (const documentRecord of targets) {
      if (documentRecord.exportState !== "error") documentRecord.exportState = "idle";
    }
    setStatus(error instanceof StatusError ? error.key : "exportFailed", "error");
  } finally {
    endExport();
  }
}

function validateExportPlan(targets, kind) {
  let totalPixels = 0;
  let bmpArchiveBytes = 22;
  const bmpNames = new Set();
  for (const documentRecord of targets) {
    const { width, height } = getDocumentDimensions(documentRecord);
    if (!validatePixelDimensions(width, height)) throw new StatusError("imageTooLarge");
    if (kind === "ctex" && (width > CTEX_MAX_DIMENSION || height > CTEX_MAX_DIMENSION)) throw new StatusError("dimensionLimit");
    totalPixels += width * height;
    if (kind === "bmp") {
      const size = getBmpFileSize(width, height);
      if (!size) throw new StatusError("imageTooLarge");
      const name = createUniqueOutputName(documentRecord.file.name, EXPORT_FORMATS.bmp.extension, bmpNames);
      const nameByteLength = new TextEncoder().encode(name).length;
      const entrySize = calculateStoredZipEntrySize(nameByteLength, size);
      if (!entrySize) throw new StatusError("batchTooLarge");
      bmpArchiveBytes += entrySize;
    }
  }
  if (totalPixels > MAX_BATCH_PIXELS) throw new StatusError("batchTooLarge");
  if (targets.length > 1 && kind === "bmp" && bmpArchiveBytes > MAX_ARCHIVE_BYTES) throw new StatusError("batchTooLarge");
}

async function exportSingleImage(documentRecord, kind, exportOptions) {
  const format = EXPORT_FORMATS[kind];
  const suggestedName = `${baseName(documentRecord.file.name)}${format.extension}`;
  const result = await saveExport(suggestedName, format.mime, format.extension, format.description, async () => {
    documentRecord.exportState = "processing";
    renderGallery();
    setStatus("convertingImages", "info", { current: 1, total: 1 });
    try {
      const blob = await createOutputBlob(documentRecord, kind, exportOptions);
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

async function exportImageArchive(targets, kind, exportOptions) {
  const zipName = createTimestampZipName(new Date());
  let summary = null;
  const result = await saveExport(zipName, "application/zip", ".zip", "ZIP", async () => {
    const entries = [];
    const usedNames = new Set();
    let archiveBytes = 22;
    let failed = 0;
    for (let index = 0; index < targets.length; index++) {
      const documentRecord = targets[index];
      documentRecord.exportState = "processing";
      renderGallery();
      setStatus("convertingImages", "info", { current: index + 1, total: targets.length });
      try {
        const blob = await createOutputBlob(documentRecord, kind, exportOptions);
        const name = createUniqueOutputName(documentRecord.file.name, EXPORT_FORMATS[kind].extension, usedNames);
        const nameBytes = new TextEncoder().encode(name).length;
        const entrySize = calculateStoredZipEntrySize(nameBytes, blob.size);
        if (!entrySize || archiveBytes + entrySize > MAX_ARCHIVE_BYTES) throw new StatusError("batchTooLarge");
        archiveBytes += entrySize;
        entries.push({ name, blob });
        documentRecord.exportState = "success";
      } catch (error) {
        if (error instanceof StatusError && error.key === "batchTooLarge") throw error;
        failed++;
        documentRecord.exportState = "error";
      }
      renderGallery();
    }
    if (!entries.length) throw new StatusError("exportFailed");
    setStatus("creatingZip", "info");
    summary = { success: entries.length, failed };
    try {
      return await createStoredZip(entries, new Date());
    } catch {
      throw new StatusError("zipFailed");
    }
  });
  if (!result || !summary) return;
  if (summary.failed) setStatus("exportPartial", "warning", { name: result.name, success: summary.success, failed: summary.failed });
  else setStatus("exportedMultiple", "success", { count: summary.success, name: result.name });
}

function beginExport() {
  if (exportInProgress || state.opening || state.detailLoading) return false;
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

async function createOutputBlob(documentRecord, kind, exportOptions) {
  const { width, height } = getDocumentDimensions(documentRecord);
  if (!validatePixelDimensions(width, height)) throw new StatusError("imageTooLarge");
  if (kind === "ctex" && (width > CTEX_MAX_DIMENSION || height > CTEX_MAX_DIMENSION)) throw new StatusError("dimensionLimit");
  if (kind === documentRecord.kind && !hasDocumentEdits(documentRecord)) return documentRecord.file;
  const image = await decodeDocumentSource(documentRecord);
  const canvas = createRenderedCanvas(documentRecord, image, kind === "jpg" ? exportOptions.backgroundColor : null);
  if (kind === "png") return canvasBlob(canvas, "image/png");
  if (kind === "jpg") return canvasBlob(canvas, "image/jpeg", 1);
  if (kind === "bmp") return createBmpBlob(canvas, getDocumentDpi(documentRecord));
  if (kind === "ctex") return createCtexBlob(canvas);
  throw new StatusError("exportFailed");
}

function createRenderedCanvas(documentRecord, image, backgroundColor = null) {
  const { width, height } = getDocumentDimensions(documentRecord);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const targetContext = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
  if (!targetContext) throw new StatusError("imageTooLarge");
  if (backgroundColor) {
    targetContext.fillStyle = backgroundColor;
    targetContext.fillRect(0, 0, width, height);
  }
  drawTransformedImage(targetContext, image, documentRecord, width, height);
  return canvas;
}

function getDocumentDpi(documentRecord) {
  if (!documentRecord.metadata.dpi) return null;
  return isSideways(documentRecord)
    ? { x: documentRecord.metadata.dpi.y, y: documentRecord.metadata.dpi.x }
    : { ...documentRecord.metadata.dpi };
}

function createBmpBlob(canvas, dpi) {
  const header = createBmpHeader(canvas.width, canvas.height, dpi);
  const pixelBytes = new Uint8Array(canvas.width * canvas.height * 4);
  const sourceContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new StatusError("exportFailed");
  for (let sourceY = 0; sourceY < canvas.height; sourceY += BMP_SCAN_ROWS) {
    const rowCount = Math.min(BMP_SCAN_ROWS, canvas.height - sourceY);
    const rgba = sourceContext.getImageData(0, sourceY, canvas.width, rowCount).data;
    writeBmpBgraRows(rgba, pixelBytes, canvas.width, sourceY, rowCount, canvas.height);
  }
  return new Blob([header, pixelBytes], { type: "image/bmp" });
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

function hasTransparency(canvas) {
  const sourceContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) throw new StatusError("exportFailed");
  for (let y = 0; y < canvas.height; y += ALPHA_SCAN_ROWS) {
    const rows = Math.min(ALPHA_SCAN_ROWS, canvas.height - y);
    const pixels = sourceContext.getImageData(0, y, canvas.width, rows).data;
    for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] !== 255) return true;
  }
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
  if (galleryResizeTimer) {
    clearTimeout(galleryResizeTimer);
    galleryResizeTimer = 0;
  }
  if (galleryScaleFrame) {
    cancelAnimationFrame(galleryScaleFrame);
    galleryScaleFrame = 0;
  }
  dragDepth = 0;
  setDragState(false);
  for (const documentRecord of state.documents) if (documentRecord.thumbnailUrl) URL.revokeObjectURL(documentRecord.thumbnailUrl);
  elements.gallery.replaceChildren();
  elements.gallery.className = "gallery";
  elements.gallery.style.removeProperty("--gallery-columns");
  state.documents = [];
  state.selectedId = null;
  state.view = "empty";
  state.detailFromList = false;
  state.galleryScrollTop = 0;
  state.galleryScrollLeft = 0;
  state.activeImage = null;
  state.activeImageId = null;
  state.detailLoading = false;
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
  for (const element of [elements.openPng, elements.openJpg, elements.openBmp, elements.openCtex, elements.openTogether]) element.disabled = exportInProgress;
  for (const element of [elements.jpgBackground, elements.bgR, elements.bgG, elements.bgB, elements.bgHex, elements.bgColorPicker]) element.disabled = exportInProgress;
  updateExportButtons();
  updatePreviewActions();
}

function updateExportButtons() {
  const disabled = exportInProgress || state.opening || state.detailLoading || !state.documents.some((item) => item.checked && !item.errorKey);
  for (const element of [elements.exportPng, elements.exportJpg, elements.exportBmp, elements.exportCtex]) element.disabled = disabled;
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
  return stripSupportedExtension(name);
}

function getSavedLanguage() {
  try {
    const language = localStorage.getItem("ctex-converter-language");
    return SUPPORTED_LANGUAGES.includes(language) ? language : "en";
  } catch {
    return "en";
  }
}

function getSavedBackground() {
  const fallback = { mode: "white", color: PRESET_COLORS.white, customColor: PRESET_COLORS.white };
  try {
    const stored = JSON.parse(localStorage.getItem(BACKGROUND_STORAGE_KEY));
    const mode = stored?.mode === "custom" || Object.hasOwn(PRESET_COLORS, stored?.mode) ? stored.mode : fallback.mode;
    const customColor = /^#[0-9a-f]{6}$/i.test(stored?.customColor || "") ? stored.customColor.toUpperCase() : fallback.customColor;
    return {
      mode,
      customColor,
      color: mode === "custom" ? customColor : PRESET_COLORS[mode]
    };
  } catch {
    return fallback;
  }
}

function saveBackgroundPreference() {
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, JSON.stringify({
      mode: state.background.mode,
      customColor: state.background.customColor
    }));
  } catch {}
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
document.documentElement.classList.remove("i18n-pending");
