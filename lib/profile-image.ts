type OptimizeImageOptions = {
  maxDimension?: number;
  quality?: number;
};

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_QUALITY = 0.82;

function getBaseName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex <= 0) return fileName;
  return fileName.slice(0, lastDotIndex);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image."));
    };

    image.src = objectUrl;
  });
}

export async function optimizeProfileImage(
  file: File,
  options?: OptimizeImageOptions
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof window === "undefined" || typeof document === "undefined") return file;

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  try {
    const image = await loadImage(file);
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;

    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) return file;
    if (blob.size >= file.size && scale === 1) return file;

    const optimizedName = `${getBaseName(file.name)}.jpg`;
    return new File([blob], optimizedName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
