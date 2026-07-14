"use strict";

const CTEX = { HEADER_SIZE: 56, currentFile: null, currentHeader: null, currentWebP: null, currentImage: null };
const $ = (id) => document.getElementById(id);

async function readCTEX(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    CTEX.currentFile = file;
    parseCTEX(bytes);
  } catch (error) { setStatus(error.message, true); }
}

function parseCTEX(bytes) {
  if (bytes.length < CTEX.HEADER_SIZE) throw new Error("The file is too small.");
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "GST2") throw new Error("This is not a GST2 CTEX file.");
  CTEX.currentHeader = bytes.slice(0, CTEX.HEADER_SIZE);
  const riffOffset = findRIFF(bytes);
  if (riffOffset < 0) throw new Error("Unable to find RIFF/WebP data.");
  CTEX.currentWebP = bytes.slice(riffOffset);
  loadPreview();
}

function findRIFF(bytes) { for (let index = 0; index <= bytes.length - 4; index++) if (bytes[index] === 0x52 && bytes[index + 1] === 0x49 && bytes[index + 2] === 0x46 && bytes[index + 3] === 0x46) return index; return -1; }
function loadPreview() {
  const url = URL.createObjectURL(new Blob([CTEX.currentWebP], { type: "image/webp" }));
  const image = new Image();
  image.onload = () => { CTEX.currentImage = image; drawPreview(image); updateFileInfo(image); URL.revokeObjectURL(url); $("export-png").disabled = false; setStatus(`${CTEX.currentFile.name} opened.`); };
  image.onerror = () => { URL.revokeObjectURL(url); setStatus("Unable to read the embedded WebP image.", true); };
  image.src = url;
}
function drawPreview(image) { const canvas = $("preview-canvas"); canvas.width = image.width; canvas.height = image.height; canvas.getContext("2d").drawImage(image, 0, 0); $("canvas-wrap").hidden = false; $("drop-zone").hidden = true; }
function updateFileInfo(image) { $("info-name").textContent = CTEX.currentFile.name; $("info-size").textContent = `${CTEX.currentFile.size.toLocaleString()} bytes`; $("info-format").textContent = "GST2 / WebP"; $("info-header").textContent = "56 bytes"; $("info-resolution").textContent = `${image.width} × ${image.height}`; }
function exportPNG() { if (!CTEX.currentImage) return; $("preview-canvas").toBlob((blob) => { const url = URL.createObjectURL(blob); const anchor = Object.assign(document.createElement("a"), { href: url, download: CTEX.currentFile.name.replace(/\.ctex$/i, ".png") }); document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }, "image/png"); }
function setStatus(message, isError = false) { const status = $("status"); status.textContent = message; status.style.color = isError ? "#ff9d9d" : ""; }
