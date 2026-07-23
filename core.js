export const CTEX_WEBP_PAYLOAD_OFFSET = 56;
export const CTEX_MAX_DIMENSION = 0xffff;
export const DATA_FORMAT_WEBP = 2;
export const IMAGE_FORMAT_RGB8 = 4;
export const IMAGE_FORMAT_RGBA8 = 5;
export const JPEG_METADATA_LIMIT = 2 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 16384;
export const MAX_IMAGE_PIXELS = 24 * 1024 * 1024;
export const MAX_BATCH_PIXELS = 96 * 1024 * 1024;
export const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
export const ZIP_UINT32_MAX = 0xffffffff;

const BI_RGB = 0;
const BI_BITFIELDS = 3;
const BI_ALPHABITFIELDS = 6;
const BITMAPV5HEADER_SIZE = 124;
const BMP_FILE_HEADER_SIZE = 14;
const BMP_PIXEL_OFFSET = BMP_FILE_HEADER_SIZE + BITMAPV5HEADER_SIZE;
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const CRC32_TABLE = createCrc32Table();

export const IMAGE_FORMATS = Object.freeze({
  png: Object.freeze({
    label: "PNG",
    extensions: Object.freeze([".png"]),
    mimeTypes: Object.freeze(["image/png"]),
    signature: isPngSignature,
    parse: parsePngMetadata,
    export: Object.freeze({ extension: ".png", mime: "image/png", description: "PNG" })
  }),
  jpg: Object.freeze({
    label: "JPEG",
    extensions: Object.freeze([".jpg", ".jpeg", ".jpe", ".jfif", ".jif", ".jfi", ".pjpeg", ".pjp"]),
    mimeTypes: Object.freeze(["image/jpeg", "image/pjpeg"]),
    signature: isJpegSignature,
    parse: parseJpegMetadata,
    export: Object.freeze({ extension: ".jpg", mime: "image/jpeg", description: "JPG" })
  }),
  bmp: Object.freeze({
    label: "BMP",
    extensions: Object.freeze([".bmp"]),
    mimeTypes: Object.freeze(["image/bmp", "image/x-bmp", "image/x-ms-bmp"]),
    signature: isBmpSignature,
    parse: parseBmpMetadata,
    export: Object.freeze({ extension: ".bmp", mime: "image/bmp", description: "BMP" })
  }),
  ctex: Object.freeze({
    label: "CTEX",
    extensions: Object.freeze([".ctex"]),
    mimeTypes: Object.freeze(["application/octet-stream"]),
    signature: isCtexSignature,
    parse: parseCtexMetadata,
    export: Object.freeze({ extension: ".ctex", mime: "application/octet-stream", description: "CTEX" })
  })
});

export const EXPORT_FORMATS = Object.freeze(Object.fromEntries(
  Object.entries(IMAGE_FORMATS).map(([kind, descriptor]) => [kind, descriptor.export])
));

export function detectHintKind(file) {
  const name = String(file?.name || "").toLocaleLowerCase("en-US");
  const mime = String(file?.type || "").toLocaleLowerCase("en-US");
  for (const [kind, descriptor] of Object.entries(IMAGE_FORMATS)) {
    if (descriptor.extensions.some((extension) => name.endsWith(extension))) return kind;
  }
  for (const [kind, descriptor] of Object.entries(IMAGE_FORMATS)) {
    if (mime && descriptor.mimeTypes.includes(mime)) return kind;
  }
  return null;
}

export function detectSignatureKind(bytes) {
  for (const [kind, descriptor] of Object.entries(IMAGE_FORMATS)) {
    if (descriptor.signature(bytes)) return kind;
  }
  return null;
}

export function stripSupportedExtension(name) {
  const value = String(name || "");
  const lower = value.toLocaleLowerCase("en-US");
  const extensions = Object.values(IMAGE_FORMATS)
    .flatMap((descriptor) => descriptor.extensions)
    .sort((left, right) => right.length - left.length);
  const extension = extensions.find((candidate) => lower.endsWith(candidate));
  return extension ? value.slice(0, -extension.length) || "image" : value || "image";
}

export function isPngSignature(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes?.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

export function isJpegSignature(bytes) {
  return bytes?.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function isBmpSignature(bytes) {
  return bytes?.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d;
}

export function isCtexSignature(bytes) {
  return bytes?.length >= 4 && readAscii(bytes, 0, 4) === "GST2";
}

export function parsePngMetadata(bytes) {
  if (bytes.length < 29 || !isPngSignature(bytes) || readAscii(bytes, 12, 4) !== "IHDR") throw new Error("png-header");
  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
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
  if (!width || !height || !color || !bitDepth) throw new Error("png-header");
  return {
    width,
    height,
    orientation: 1,
    dpi: null,
    format: `PNG (${color.label}, ${bitDepth * color.channels}-bit)`
  };
}

export function parseJpegMetadata(bytes) {
  const result = {
    width: null,
    height: null,
    precision: null,
    components: null,
    orientation: 1,
    exifDpi: null,
    jfifDpi: null,
    jfif: false,
    progressive: false,
    adobeTransform: null
  };
  if (!isJpegSignature(bytes)) throw new Error("jpeg-header");
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
    if (segmentLength < 2) throw new Error("jpeg-header");
    const dataStart = offset + 2;
    const dataEnd = dataStart + segmentLength - 2;
    if (dataEnd > bytes.length) break;

    if (marker === 0xe0 && readAscii(bytes, dataStart, 5) === "JFIF\0") {
      result.jfif = true;
      result.jfifDpi ||= parseJfifDpi(bytes, dataStart, dataEnd);
    } else if (marker === 0xe1 && readAscii(bytes, dataStart, 6) === "Exif\0\0") {
      const exif = parseExifMetadata(bytes, dataStart, dataEnd);
      result.exifDpi ||= exif.dpi;
      result.orientation = exif.orientation || result.orientation;
    } else if (marker === 0xee && dataEnd - dataStart >= 12 && readAscii(bytes, dataStart, 5) === "Adobe") {
      result.adobeTransform = bytes[dataStart + 11];
    }

    if (JPEG_SOF_MARKERS.has(marker) && dataEnd - dataStart >= 6) {
      result.precision = bytes[dataStart];
      result.height = readUint16BE(bytes, dataStart + 1);
      result.width = readUint16BE(bytes, dataStart + 3);
      result.components = bytes[dataStart + 5];
      result.progressive = marker === 0xc2 || marker === 0xca;
    }
    offset = dataEnd;
  }

  if (!result.width || !result.height) throw new Error("jpeg-header");
  const sideways = result.orientation >= 5 && result.orientation <= 8;
  const sourceDpi = result.exifDpi || result.jfifDpi || null;
  const dpi = sourceDpi && sideways ? { x: sourceDpi.y, y: sourceDpi.x } : sourceDpi;
  return {
    ...result,
    decodedWidth: sideways ? result.height : result.width,
    decodedHeight: sideways ? result.width : result.height,
    dpi,
    format: describeJpegMetadata(result)
  };
}

export function describeJpegMetadata(metadata) {
  if (!metadata.precision || !metadata.components) return "JPEG";
  const model = metadata.components === 1
    ? "Grayscale"
    : metadata.components === 3
      ? "RGB"
      : metadata.components === 4
        ? metadata.adobeTransform === 2 ? "YCCK" : "CMYK"
        : `${metadata.components}-channel`;
  const variant = metadata.progressive ? "Progressive / " : metadata.jfif ? "JFIF / " : "";
  return `JPEG (${variant}${model}, ${metadata.precision * metadata.components}-bit)`;
}

export function parseBmpMetadata(bytes, totalSize = bytes.length) {
  if (bytes.length < 26 || !isBmpSignature(bytes)) throw new Error("bmp-header");
  const declaredFileSize = readUint32(bytes, 2);
  const pixelOffset = readUint32(bytes, 10);
  const dibSize = readUint32(bytes, 14);
  let width;
  let height;
  let topDown = false;
  let bitDepth;
  let compression = BI_RGB;
  let xPixelsPerMeter = 0;
  let yPixelsPerMeter = 0;
  let alphaMask = 0;

  if (dibSize === 12) {
    if (bytes.length < 26) throw new Error("bmp-header");
    width = readUint16(bytes, 18);
    height = readUint16(bytes, 20);
    if (readUint16(bytes, 22) !== 1) throw new Error("bmp-header");
    bitDepth = readUint16(bytes, 24);
  } else if (dibSize >= 40) {
    if (bytes.length < Math.min(BMP_FILE_HEADER_SIZE + dibSize, 70)) throw new Error("bmp-header");
    width = readInt32(bytes, 18);
    const signedHeight = readInt32(bytes, 22);
    topDown = signedHeight < 0;
    height = Math.abs(signedHeight);
    if (readUint16(bytes, 26) !== 1) throw new Error("bmp-header");
    bitDepth = readUint16(bytes, 28);
    compression = readUint32(bytes, 30);
    xPixelsPerMeter = readInt32(bytes, 38);
    yPixelsPerMeter = readInt32(bytes, 42);
    if (dibSize >= 56 && bytes.length >= BMP_FILE_HEADER_SIZE + 56) alphaMask = readUint32(bytes, BMP_FILE_HEADER_SIZE + 52);
    else if ((compression === BI_BITFIELDS || compression === BI_ALPHABITFIELDS) && pixelOffset >= 70 && bytes.length >= 70) alphaMask = readUint32(bytes, 66);
  } else {
    throw new Error("bmp-header");
  }

  if (!width || width < 0 || !height || !bitDepth || pixelOffset < BMP_FILE_HEADER_SIZE + dibSize || pixelOffset > totalSize) throw new Error("bmp-header");
  if (declaredFileSize && declaredFileSize > totalSize) throw new Error("bmp-header");
  const model = bitDepth <= 8 ? "Indexed" : bitDepth === 32 && alphaMask ? "RGBA" : "RGB";
  const dpi = xPixelsPerMeter > 0 && yPixelsPerMeter > 0
    ? normalizeDpi(xPixelsPerMeter * 0.0254, yPixelsPerMeter * 0.0254)
    : null;
  return {
    width,
    height,
    decodedWidth: width,
    decodedHeight: height,
    orientation: 1,
    topDown,
    bitDepth,
    compression,
    alphaMask,
    pixelOffset,
    dpi,
    format: `BMP (${model}, ${bitDepth}-bit)`
  };
}

export function parseCtexMetadata(bytes, totalSize = bytes.length) {
  if (bytes.length < 68 || totalSize < 68) throw new Error("ctex-read");
  if (!isCtexSignature(bytes) || readUint32(bytes, 4) !== 1 || readUint32(bytes, 36) !== DATA_FORMAT_WEBP) throw new Error("ctex-unsupported");
  const width = readUint32(bytes, 8);
  const height = readUint32(bytes, 12);
  if (!width || !height || width > CTEX_MAX_DIMENSION || height > CTEX_MAX_DIMENSION || readUint16(bytes, 40) !== width || readUint16(bytes, 42) !== height) throw new Error("ctex-read");
  const pixelFormat = readUint32(bytes, 48);
  if (pixelFormat !== IMAGE_FORMAT_RGB8 && pixelFormat !== IMAGE_FORMAT_RGBA8) throw new Error("ctex-unsupported");
  if (readUint32(bytes, 52) !== totalSize - CTEX_WEBP_PAYLOAD_OFFSET || readAscii(bytes, 56, 4) !== "RIFF" || readAscii(bytes, 64, 4) !== "WEBP") throw new Error("ctex-read");
  const rgba = pixelFormat === IMAGE_FORMAT_RGBA8;
  return {
    width,
    height,
    decodedWidth: width,
    decodedHeight: height,
    orientation: 1,
    pixelFormat,
    dpi: null,
    format: `CTEX (GST2 / WebP / ${rgba ? "RGBA8" : "RGB8"}, ${rgba ? 32 : 24}-bit)`
  };
}

export function validatePixelDimensions(width, height) {
  const pixels = Number(width) * Number(height);
  return Number.isSafeInteger(width)
    && Number.isSafeInteger(height)
    && width > 0
    && height > 0
    && width <= MAX_IMAGE_DIMENSION
    && height <= MAX_IMAGE_DIMENSION
    && Number.isSafeInteger(pixels)
    && pixels <= MAX_IMAGE_PIXELS;
}

export function calculateGalleryColumns(count, width, height, gap = 16) {
  const safeCount = Math.max(1, count);
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const minimumColumns = Math.min(2, safeCount);
  let best = null;
  for (let columns = minimumColumns; columns <= safeCount; columns++) {
    const rows = Math.ceil(safeCount / columns);
    const tileSize = Math.max(1, (safeWidth - gap * (columns - 1)) / columns);
    const contentHeight = rows * tileSize + gap * (rows - 1);
    const overflow = Math.max(0, contentHeight - safeHeight);
    const candidate = { columns, tileSize, overflow };
    if (!best || candidate.overflow < best.overflow - 1 || Math.abs(candidate.overflow - best.overflow) <= 1 && candidate.tileSize > best.tileSize) best = candidate;
  }
  return best.columns;
}

export function calculateGalleryNavigationIndex(count, columns, index, key) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) return index;
  const columnCount = Math.max(1, Math.min(count, Number.isInteger(columns) ? columns : 1));
  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columnCount, ArrowDown: columnCount };
  const offset = offsets[key];
  if (!offset) return index;
  let nextIndex = index + offset;
  if (key === "ArrowDown" && nextIndex >= count && index < count - 1) nextIndex = count - 1;
  return nextIndex >= 0 && nextIndex < count ? nextIndex : index;
}

export function createWebpCtexHeader(width, height, pixelFormat, payloadSize) {
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

export function getBmpFileSize(width, height) {
  const imageSize = Number(width) * Number(height) * 4;
  const fileSize = BMP_PIXEL_OFFSET + imageSize;
  return Number.isSafeInteger(imageSize) && fileSize <= ZIP_UINT32_MAX ? fileSize : null;
}

export function createBmpHeader(width, height, dpi = null) {
  const fileSize = getBmpFileSize(width, height);
  if (!fileSize) throw new Error("bmp-size");
  const imageSize = width * height * 4;
  const header = new Uint8Array(BMP_PIXEL_OFFSET);
  const view = new DataView(header.buffer);
  header.set([0x42, 0x4d]);
  view.setUint32(2, fileSize, true);
  view.setUint32(10, BMP_PIXEL_OFFSET, true);
  view.setUint32(14, BITMAPV5HEADER_SIZE, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(30, BI_BITFIELDS, true);
  view.setUint32(34, imageSize, true);
  if (dpi) {
    view.setInt32(38, Math.max(1, Math.round(dpi.x / 0.0254)), true);
    view.setInt32(42, Math.max(1, Math.round(dpi.y / 0.0254)), true);
  }
  view.setUint32(54, 0x00ff0000, true);
  view.setUint32(58, 0x0000ff00, true);
  view.setUint32(62, 0x000000ff, true);
  view.setUint32(66, 0xff000000, true);
  view.setUint32(70, 0x73524742, true);
  view.setUint32(122, 4, true);
  return header;
}

export function writeBmpBgraRows(rgba, destination, width, sourceY, rowCount, height) {
  const rowBytes = width * 4;
  if (!Number.isInteger(width) || !Number.isInteger(sourceY) || !Number.isInteger(rowCount) || !Number.isInteger(height)
    || width <= 0 || sourceY < 0 || rowCount <= 0 || sourceY + rowCount > height
    || rgba.length < rowBytes * rowCount || destination.length < rowBytes * height) throw new Error("bmp-pixels");
  for (let row = 0; row < rowCount; row++) {
    const destinationRow = height - 1 - (sourceY + row);
    let destinationOffset = destinationRow * rowBytes;
    let sourceOffset = row * rowBytes;
    for (let x = 0; x < width; x++) {
      destination[destinationOffset++] = rgba[sourceOffset + 2];
      destination[destinationOffset++] = rgba[sourceOffset + 1];
      destination[destinationOffset++] = rgba[sourceOffset];
      destination[destinationOffset++] = rgba[sourceOffset + 3];
      sourceOffset += 4;
    }
  }
  return destination;
}

export function createUniqueOutputName(originalName, extension, usedNames) {
  const stem = stripSupportedExtension(originalName);
  let candidate = `${stem}${extension}`;
  let number = 2;
  while (usedNames.has(candidate.toLocaleLowerCase("en-US"))) candidate = `${stem} (${number++})${extension}`;
  usedNames.add(candidate.toLocaleLowerCase("en-US"));
  return candidate;
}

export function createTimestampZipName(date) {
  const part = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}_${part(date.getHours())}-${part(date.getMinutes())}-${part(date.getSeconds())}.zip`;
}

export function calculateStoredZipEntrySize(nameByteLength, dataSize) {
  if (!Number.isSafeInteger(nameByteLength) || nameByteLength < 0 || nameByteLength > 0xffff
    || !Number.isSafeInteger(dataSize) || dataSize < 0 || dataSize > ZIP_UINT32_MAX) return null;
  const size = 76 + nameByteLength * 2 + dataSize;
  return Number.isSafeInteger(size) && size <= ZIP_UINT32_MAX ? size : null;
}

export async function createStoredZip(entries, timestamp) {
  if (entries.length > 0xffff) throw new Error("zip-size");
  const preparedEntries = [];
  let projectedSize = 22;
  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const size = Number(entry.blob?.size);
    const entrySize = calculateStoredZipEntrySize(nameBytes.length, size);
    if (!entrySize) throw new Error("zip-size");
    projectedSize += entrySize;
    if (!Number.isSafeInteger(projectedSize) || projectedSize > MAX_ARCHIVE_BYTES) throw new Error("zip-size");
    preparedEntries.push({ ...entry, nameBytes, size });
  }

  const localParts = [];
  const centralParts = [];
  const { time, date } = toDosDateTime(timestamp);
  let offset = 0;
  let centralSize = 0;
  for (const entry of preparedEntries) {
    const { nameBytes, size } = entry;
    if (offset > ZIP_UINT32_MAX) throw new Error("zip-size");
    const crc = await crc32Blob(entry.blob);
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
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);
    centralSize += centralHeader.length;
    offset += localHeader.length + size;
  }
  if (offset + centralSize > ZIP_UINT32_MAX) throw new Error("zip-size");
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
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

function parseExifMetadata(bytes, start, end) {
  const fallback = { dpi: null, orientation: 1 };
  if (end - start < 14 || readAscii(bytes, start, 6) !== "Exif\0\0") return fallback;
  const tiffStart = start + 6;
  const tiffLength = end - tiffStart;
  const byteOrder = readAscii(bytes, tiffStart, 2);
  const littleEndian = byteOrder === "II";
  if (!littleEndian && byteOrder !== "MM") return fallback;
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffStart, tiffLength);
  const uint16 = (offset) => offset >= 0 && offset + 2 <= tiffLength ? view.getUint16(offset, littleEndian) : null;
  const uint32 = (offset) => offset >= 0 && offset + 4 <= tiffLength ? view.getUint32(offset, littleEndian) : null;
  if (uint16(2) !== 42) return fallback;
  const ifdOffset = uint32(4);
  if (ifdOffset === null || ifdOffset + 2 > tiffLength) return fallback;
  const entryCount = uint16(ifdOffset);
  let x = null;
  let y = null;
  let unit = null;
  let orientation = 1;
  for (let index = 0; index < entryCount; index++) {
    const entry = ifdOffset + 2 + index * 12;
    if (entry + 12 > tiffLength) break;
    const tag = uint16(entry);
    const type = uint16(entry + 2);
    const count = uint32(entry + 4);
    if (tag === 0x0112 && type === 3 && count === 1) orientation = uint16(entry + 8) || 1;
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
  const factor = unit === 3 ? 2.54 : 1;
  const dpi = x && y && (unit === 2 || unit === 3) ? normalizeDpi(x * factor, y * factor) : null;
  return { dpi, orientation: orientation >= 1 && orientation <= 8 ? orientation : 1 };
}

function normalizeDpi(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return null;
  const round = (value) => {
    const integer = Math.round(value);
    return Math.abs(value - integer) < .05 ? integer : Math.round(value * 100) / 100;
  };
  return { x: round(x), y: round(y) };
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

export function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
}

export function readInt32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getInt32(0, true);
}

export function readUint16(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, true);
}

export function readUint16BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 2).getUint16(0, false);
}

export function readUint32BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

export function readAscii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
