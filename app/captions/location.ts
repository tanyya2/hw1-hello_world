// Whether a JPEG still carries a GPS location, in its EXIF data (the GPS tag)
// or in XMP data (GPSLatitude). Photos cleaned in the browser never do; this
// catches uploads that skipped the app.
export function hasLocation(bytes: Uint8Array): boolean {
  let i = 2; // after the JPEG start marker
  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1];
    if (marker === 0xda) break; // start of the image data: no more metadata
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const segment = bytes.subarray(i + 4, i + 2 + length);
    if (marker === 0xe1 && (exifHasGps(segment) || text(segment).includes("GPSLatitude"))) return true;
    i += 2 + length;
  }
  return false;
}

function text(bytes: Uint8Array) {
  return new TextDecoder("latin1").decode(bytes);
}

// EXIF: "Exif\0\0", then a TIFF header and the first list of tags; 0x8825 points to GPS data
function exifHasGps(segment: Uint8Array): boolean {
  if (text(segment.subarray(0, 6)) !== "Exif\0\0") return false;
  const tiff = segment.subarray(6);
  if (tiff.length < 8) return false;
  const little = tiff[0] === 0x49; // "II" = little-endian, "MM" = big-endian
  const read16 = (at: number) => (little ? tiff[at] | (tiff[at + 1] << 8) : (tiff[at] << 8) | tiff[at + 1]);
  const read32 = (at: number) => (little ? read16(at) + read16(at + 2) * 65536 : read16(at) * 65536 + read16(at + 2));

  const ifd = read32(4);
  if (ifd + 2 > tiff.length) return false;
  const count = read16(ifd);
  for (let n = 0; n < count; n++) {
    const entry = ifd + 2 + n * 12;
    if (entry + 2 > tiff.length) break;
    if (read16(entry) === 0x8825) return true;
  }
  return false;
}
