const DEFAULT_TEXT_TO_IMAGE_COST = 10;
const DEFAULT_UPLOAD_DIR = "./uploads";
const DEFAULT_IMAGE_BACKEND = "official";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image-openai";
const DEFAULT_IMAGE_BASE_URL = "https://api.openai.com/v1";

export const imageConfig = {
  backend: process.env.IMAGE_BACKEND ?? DEFAULT_IMAGE_BACKEND,
  apiKey: process.env.IMAGE_API_KEY ?? "",
  baseUrl: (process.env.IMAGE_BASE_URL ?? DEFAULT_IMAGE_BASE_URL).replace(/\/$/, ""),
  model: process.env.IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL,
  uploadDir: process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR,
  textToImageCost:
    parseInt(process.env.TEXT_TO_IMAGE_COST ?? "", 10) || DEFAULT_TEXT_TO_IMAGE_COST,
};

export function isImageBackendConfigured() {
  return ["official", "relay"].includes(imageConfig.backend) && imageConfig.apiKey.length > 0;
}

