// Browser-only. Redraws the photo on a canvas and saves it as a new JPEG.
// Only the pixels are copied, so hidden data in the file (GPS location,
// camera, time taken) is left behind. Big photos are also scaled down.
const MAX_SIDE = 2048;

export async function cleanPhoto(file: File): Promise<Blob> {
  // "from-image" keeps phone photos the right way up
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d")!;
  // Transparent PNGs get a white background instead of black
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read the photo"))), "image/jpeg", 0.9)
  );
}
