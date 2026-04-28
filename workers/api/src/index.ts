export interface Env {
  SPARKPOST_DB?: {
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        first: <T = unknown>() => Promise<T | null>;
        all: <T = unknown>() => Promise<{ results?: T[] }>;
        run: () => Promise<{ meta?: { changes?: number } }>;
      };
    };
  };
  SPARKPOST_ASSETS?: {
    fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
  };
  SPARKPOST_R2?: {
    put: (
      key: string,
      value: ArrayBuffer | ArrayBufferView | ReadableStream | Blob | string,
      options?: { httpMetadata?: { contentType?: string } },
    ) => Promise<unknown>;
    get: (key: string) => Promise<{
      body: ReadableStream | null;
      httpMetadata?: { contentType?: string };
      writeHttpMetadata?: (headers: Headers) => void;
    } | null>;
  };
  IMAGE_GENERATION_QUEUE?: {
    send: (message: ImageGenerationQueueMessage) => Promise<void>;
  };
  SESSION_SECRET?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  EMAIL_SUBJECT_PREFIX?: string;
  RESEND_API_KEY?: string;
    IMAGE_BACKEND?: string;
    IMAGE_API_KEY?: string;
    IMAGE_MODEL?: string;
    IMAGE_DEFAULT_MODEL_ID?: string;
    IMAGE_BASE_URL?: string;
    OPENAI_IMAGE_API_KEY?: string;
    RELAY_IMAGE_API_KEY?: string;
    RELAY_IMAGE_API_KEY_MICU?: string;
    GPT_IMAGE_RELAY_API_KEY?: string;
    RELAY_IMAGE_BASE_URL_MICU?: string;
    IMAGE_RELAY_BASE_URL_MICU?: string;
    GPT_IMAGE_RELAY_BASE_URL?: string;
    GPT_IMAGE_2_RELAY_PROVIDER?: string;
    RELAY_IMAGE_BASE_URL?: string;
    OPENAI_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
    MINIMAX_API_KEY?: string;
    GEMINI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    PROMPT_IDEA_PROVIDER?: string;
    PROMPT_IDEA_MODEL?: string;
    PROMPT_EXPAND_PROVIDER?: string;
    PROMPT_EXPAND_MODEL?: string;
    DEEPSEEK_BASE_URL?: string;
    MINIMAX_BASE_URL?: string;
    OPENAI_BASE_URL?: string;
    TEXT_TO_IMAGE_COST?: string;
    IMAGE_TO_IMAGE_COST?: string;
  DEV_AUTH_DEBUG_CODE?: string;
  AUTH_CODE_TTL_MINUTES?: string;
  AUTH_CODE_COOLDOWN_SECONDS?: string;
  AUTH_VERIFY_CODE_MAX_ATTEMPTS?: string;
  AUTH_VERIFY_CODE_LOCKOUT_SECONDS?: string;
  AUTH_SESSION_TTL_DAYS?: string;
  SIGNUP_BONUS_CREDITS?: string;
  DAILY_CHECK_IN_CREDITS?: string;
  ALLOWED_ORIGINS?: string;
}

type JsonRecord = Record<string, unknown>;
type WorkerExecutionContext = {
  waitUntil?: (promise: Promise<unknown>) => void;
};
type RouteHandler = (request: Request, env: Env, url: URL, ctx?: WorkerExecutionContext) => Promise<Response> | Response;

type SessionPayload = {
  userId: string;
  email: string;
  issuedAt: number;
  expiresAt: number;
};

type AuthenticatedUserRow = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  creditBalance: number | null;
};

type VerificationCodeRow = {
  id: string;
  email: string;
  codeHash: string;
  attemptCount: number;
  expiresAt: string;
  lockedUntil: string | null;
  usedAt: string | null;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
};

type ProviderResult = {
  bytes: Uint8Array;
  mimeType: string;
  model: string;
};

type PromptAssistAction = "inspire" | "enhance";

type ImageMode = "t2i" | "i2i";
type ImageProviderKey = "official" | "relay";
type ImageSize =
  | "auto"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "2048x2048"
  | "2048x1152"
  | "3840x2160"
  | "2160x3840"
  | "1792x1024"
  | "1024x1792";
type ImageQuality = "auto" | "low" | "medium" | "high";

type ImageModelDefinition = {
  id: string;
  label: string;
  provider: ImageProviderKey;
  remoteModel: string;
  supports: Record<ImageMode, boolean>;
  supportedSizes: ImageSize[];
  defaultSize: ImageSize;
  defaultQuality?: ImageQuality;
  relayConfigKey?: "default" | "micu";
};

type ResolvedImageConfig = {
  backend: ImageProviderKey;
  apiKey: string;
  model: string;
  modelId: string;
  label: string;
  baseUrl: string;
  textToImageCost: number;
  imageToImageCost: number;
  supports: Record<ImageMode, boolean>;
  supportedSizes: ImageSize[];
  defaultSize: ImageSize;
  defaultQuality?: ImageQuality;
  status: "available" | "unavailable";
  statusCode?: string;
  statusMessage?: string;
};

type PromptAssistConfig = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  status: "available" | "unavailable";
};

type StoredAsset = {
  assetId: string;
  fileUrl: string;
  width: number | null;
  height: number | null;
};

type GenerationTaskRow = {
  id: string;
  status: string;
  prompt: string;
  compiledPrompt: string | null;
  requestedSize: string | null;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
  errorMessage?: string | null;
  isFavorite?: number | boolean | null;
  remainingCredits?: number;
};

type GenerationTaskDetailRow = {
  id: string;
  userId: string;
  taskType: "text_to_image" | "image_to_image";
  status: string;
  prompt: string;
  compiledPrompt: string | null;
  inputImageUrl: string | null;
  inputReferenceKeys: string | null;
  requestedSize: string | null;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
  errorMessage: string | null;
  isFavorite: number | boolean | null;
};

type GenerationHistoryAssetItem = {
  id: string;
  fileUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type GenerationHistoryItem = {
  id: string;
  taskType: string;
  status: string;
  prompt: string;
  requestedSize: string | null;
  model: string | null;
  costCredits: number;
  errorMessage: string | null;
  isFavorite: boolean;
  createdAt: string;
  completedAt: string | null;
  assets: GenerationHistoryAssetItem[];
};

type GenerationHistoryRow = Omit<GenerationHistoryItem, "assets"> & {
  assetId: string | null;
  fileUrl: string | null;
  width: number | null;
  height: number | null;
  assetCreatedAt: string | null;
};

type GenerationHistoryFilter = "all" | "succeeded" | "failed" | "favorites" | "t2i" | "i2i";

type GallerySort = "latest" | "popular";

type GalleryItemRow = {
  id: string;
  taskId: string;
  userId: string;
  title: string | null;
  description: string | null;
  visibility: string;
  likeCount: number;
  remixCount: number;
  createdAt: string;
  updatedAt: string;
  taskType: string;
  prompt: string;
  requestedSize: string | null;
  model: string | null;
  completedAt: string | null;
  authorName: string | null;
  authorEmail: string;
  assetId: string | null;
  fileUrl: string | null;
  width: number | null;
  height: number | null;
  likedByMe: number | boolean | null;
};

type GalleryItem = {
  id: string;
  taskId: string;
  title: string | null;
  description: string | null;
  visibility: string;
  likeCount: number;
  remixCount: number;
  createdAt: string;
  updatedAt: string;
  task: {
    taskType: string;
    prompt: string;
    requestedSize: string | null;
    model: string | null;
    completedAt: string | null;
  };
  author: {
    id: string;
    displayName: string;
  };
  asset: {
    id: string;
    fileUrl: string;
    width: number | null;
    height: number | null;
  } | null;
  likedByMe: boolean;
};

type CreditTransactionRow = {
  id: string;
  type: string;
  sourceType: string | null;
  amount: number;
  balanceAfter: number;
  remainingAmount: number | null;
  expiresAt: string | null;
  packageCode: string | null;
  paymentProvider: string | null;
  paymentSessionId: string | null;
  remark: string | null;
  createdAt: string;
};

type CreditTransactionItem = {
  id: string;
  type: "earned" | "consumed";
  title: string;
  amount: number;
  date: string;
  balanceAfter: number;
  sourceType: string | null;
  expiresAt: string | null;
  remainingAmount: number | null;
  packageCode: string | null;
  paymentProvider: string | null;
  paymentSessionId: string | null;
};

type CreditLotRow = {
  id: string;
  type: string;
  sourceType: string | null;
  remainingAmount: number;
  expiresAt: string | null;
  createdAt: string;
};

type CreditPackageDefinition = {
  code: string;
  title: string;
  credits: number;
  priceUsd: string;
};

type ImageGenerationQueueMessage = {
  taskId: string;
  userId: string;
};

const withErrorCode = (code: string, error: string) => ({ code, error });

type CreditSummaryResponse = {
  creditBalance: number;
  hasCheckedInToday: boolean;
  dailyCheckInCredits: number;
  currentPlan: "free";
  usageLast7Days: number[];
};

class ImageGenerationConfigError extends Error {}
class ImageGenerationAuthError extends Error {}
class ImageGenerationCreditsError extends Error {}
class ImageGenerationProviderError extends Error {}
class PromptAssistConfigError extends Error {}
class PromptAssistProviderError extends Error {}
class EmailDeliveryConfigError extends Error {}
class EmailDeliveryProviderError extends Error {}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_EMAIL_PROVIDER = "resend";
const DEFAULT_EMAIL_SUBJECT_PREFIX = "[SparkPost]";
const DEFAULT_RESEND_BASE_URL = "https://api.resend.com";
const DEFAULT_IMAGE_BACKEND = "official";
const DEFAULT_IMAGE_MODEL = "dall-e-3";
const DEFAULT_IMAGE_MODEL_ID = "nano-banana-2";
const DEFAULT_OPENAI_IMAGE_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_TEXT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
const DEFAULT_PROMPT_IDEA_PROVIDER = "deepseek";
const DEFAULT_PROMPT_IDEA_MODEL = "deepseek-chat";
const DEFAULT_PROMPT_EXPAND_PROVIDER = "minimax";
const DEFAULT_PROMPT_EXPAND_MODEL = "MiniMax-Text-01";
const DEFAULT_TEXT_TO_IMAGE_COST = 10;
const DEFAULT_IMAGE_TO_IMAGE_COST = 10;
const DEFAULT_CODE_TTL_MINUTES = 10;
const DEFAULT_CODE_COOLDOWN_SECONDS = 60;
const DEFAULT_VERIFY_CODE_MAX_ATTEMPTS = 5;
const DEFAULT_VERIFY_CODE_LOCKOUT_SECONDS = 15 * 60;
const DEFAULT_SESSION_TTL_DAYS = 7;
const DEFAULT_SIGNUP_BONUS_CREDITS = 20;
const DEFAULT_DAILY_CHECK_IN_CREDITS = 20;
const DEFAULT_CREDIT_TIMEZONE = "Asia/Shanghai";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://776607.xyz",
  "https://www.776607.xyz",
  "https://sparkpost.pages.dev",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
];
const PROTECTED_ROUTE_PREFIXES = [
  "/api/auth/",
  "/api/credits/",
  "/api/generate/image",
  "/api/generate/tasks/",
  "/api/generations/",
  "/api/gallery/",
  "/api/prompt/",
];
const GPT_IMAGE_SIZES: ImageSize[] = [
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "2048x2048",
  "2048x1152",
  "3840x2160",
  "2160x3840",
];
const GPT_RELAY_IMAGE_SIZES: ImageSize[] = [
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "2048x2048",
  "2048x1152",
  "3840x2160",
  "2160x3840",
];
const DALLE_IMAGE_SIZES: ImageSize[] = ["1024x1024", "1792x1024", "1024x1792"];
const DEFAULT_IMAGE_SIZE: ImageSize = "auto";
const DAILY_CHECK_IN_EXPIRY_DAYS = 7;
const SESSION_COOKIE_NAME = "sparkpost_session";
const SESSION_COOKIE_PATH = "/";
const GENERATED_ASSET_PREFIX = "generated";
const CREDIT_PACKAGE_DEFINITIONS: CreditPackageDefinition[] = [
  { code: "starter_pack", title: "Starter Pack", credits: 500, priceUsd: "4.99" },
  { code: "creator_pack", title: "Creator Pack", credits: 1200, priceUsd: "9.99" },
  { code: "pro_studio", title: "Pro Studio", credits: 3000, priceUsd: "19.99" },
];

const IMAGE_MODEL_REGISTRY: Record<string, ImageModelDefinition> = {
  "nano-banana-2": {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    provider: "relay",
    remoteModel: "gemini-3.1-flash-image-openai",
    supports: { t2i: true, i2i: true },
    supportedSizes: GPT_IMAGE_SIZES,
    defaultSize: DEFAULT_IMAGE_SIZE,
    relayConfigKey: "default",
  },
  "gpt-image-2": {
    id: "gpt-image-2",
    label: "GPT-Image 2",
    provider: "relay",
    remoteModel: "gpt-image-2",
    supports: { t2i: true, i2i: true },
    supportedSizes: GPT_RELAY_IMAGE_SIZES,
    defaultSize: DEFAULT_IMAGE_SIZE,
    defaultQuality: "high",
    relayConfigKey: "default",
  },
  "dall-e-3": {
    id: "dall-e-3",
    label: "DALL-E 3",
    provider: "official",
    remoteModel: "dall-e-3",
    supports: { t2i: true, i2i: false },
    supportedSizes: DALLE_IMAGE_SIZES,
    defaultSize: "1024x1024",
  },
};

const IMAGE_MODEL_ALIAS_MAP: Record<string, string> = {
  "gemini-3.1-flash-image-openai": "nano-banana-2",
  "gemini-3.1-image-openai": "nano-banana-2",
  "gpt-image-2": "gpt-image-2",
  "gpt-image2": "gpt-image-2",
  "dall-e-3": "dall-e-3",
};

const getNumberEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getAuthConfig = (env: Env) => ({
  codeLength: 6,
  codeTtlMinutes: getNumberEnv(env.AUTH_CODE_TTL_MINUTES, DEFAULT_CODE_TTL_MINUTES),
  codeCooldownSeconds: getNumberEnv(env.AUTH_CODE_COOLDOWN_SECONDS, DEFAULT_CODE_COOLDOWN_SECONDS),
  verifyCodeMaxAttempts: getNumberEnv(
    env.AUTH_VERIFY_CODE_MAX_ATTEMPTS,
    DEFAULT_VERIFY_CODE_MAX_ATTEMPTS,
  ),
  verifyCodeLockoutSeconds: getNumberEnv(
    env.AUTH_VERIFY_CODE_LOCKOUT_SECONDS,
    DEFAULT_VERIFY_CODE_LOCKOUT_SECONDS,
  ),
  sessionTtlDays: getNumberEnv(env.AUTH_SESSION_TTL_DAYS, DEFAULT_SESSION_TTL_DAYS),
  signupBonusCredits: getNumberEnv(env.SIGNUP_BONUS_CREDITS, DEFAULT_SIGNUP_BONUS_CREDITS),
  dailyCheckInCredits: getNumberEnv(env.DAILY_CHECK_IN_CREDITS, DEFAULT_DAILY_CHECK_IN_CREDITS),
});

const getDefaultImageModelId = (env: Env) => {
  const configuredModelId = env.IMAGE_DEFAULT_MODEL_ID?.trim().toLowerCase();
  if (configuredModelId && IMAGE_MODEL_REGISTRY[configuredModelId]) {
    return configuredModelId;
  }

  const legacyModel = env.IMAGE_MODEL?.trim().toLowerCase();
  if (legacyModel && IMAGE_MODEL_ALIAS_MAP[legacyModel]) {
    return IMAGE_MODEL_ALIAS_MAP[legacyModel];
  }

  return DEFAULT_IMAGE_MODEL_ID;
};

const getRelayConfigKey = (env: Env, registryModel?: ImageModelDefinition) => {
  if (registryModel?.id === "gpt-image-2") {
    const configuredProvider = env.GPT_IMAGE_2_RELAY_PROVIDER?.trim().toLowerCase();
    if (configuredProvider === "micu") return "micu";
    if (configuredProvider === "default") return "default";
  }

  return registryModel?.relayConfigKey ?? "default";
};

const getRelayProviderConfig = (env: Env, registryModel?: ImageModelDefinition) => {
  const relayConfigKey = getRelayConfigKey(env, registryModel);
  if (relayConfigKey === "micu") {
    return {
      apiKey: env.RELAY_IMAGE_API_KEY_MICU?.trim() || "",
      baseUrl: (
        env.RELAY_IMAGE_BASE_URL_MICU?.trim() ||
        env.IMAGE_RELAY_BASE_URL_MICU?.trim() ||
        ""
      ).replace(/\/$/, ""),
    };
  }

  return {
    apiKey: env.RELAY_IMAGE_API_KEY?.trim() || env.IMAGE_API_KEY?.trim() || "",
    baseUrl: (
      env.RELAY_IMAGE_BASE_URL?.trim() ||
      env.IMAGE_BASE_URL?.trim() ||
      ""
    ).replace(/\/$/, ""),
  };
};
// 中文说明：
// 这里优先使用新的 modelId 注册表来选择图片模型；如果线上仍然只配置了旧的 IMAGE_MODEL，
// 也会回退到旧逻辑，避免现有 Cloudflare 环境立刻失效。
const getImageConfig = (env: Env, requestedModelId?: string): ResolvedImageConfig => {
  const normalizedRequestedModelId = requestedModelId?.trim().toLowerCase();
  const resolvedModelId = normalizedRequestedModelId || getDefaultImageModelId(env);
  const backend = (env.IMAGE_BACKEND ?? DEFAULT_IMAGE_BACKEND).trim().toLowerCase() as ImageProviderKey;
  const textToImageCost = getNumberEnv(env.TEXT_TO_IMAGE_COST, DEFAULT_TEXT_TO_IMAGE_COST);
  const imageToImageCost = getNumberEnv(env.IMAGE_TO_IMAGE_COST, DEFAULT_IMAGE_TO_IMAGE_COST);
  const openAiApiKey = env.OPENAI_IMAGE_API_KEY?.trim() || env.IMAGE_API_KEY?.trim() || "";
  const registryModel = IMAGE_MODEL_REGISTRY[resolvedModelId];
  const relayConfigKey = getRelayConfigKey(env, registryModel);
  const relayProviderConfig = getRelayProviderConfig(env, registryModel);

  const effectiveBackend = registryModel?.provider ?? (backend === "relay" ? "relay" : "official");
  const effectiveModel = registryModel?.remoteModel ?? (env.IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL);
  const providerConfig =
    effectiveBackend === "relay"
      ? {
          apiKey: relayProviderConfig.apiKey,
          baseUrl: relayProviderConfig.baseUrl,
        }
      : {
          apiKey: openAiApiKey,
          baseUrl: DEFAULT_OPENAI_IMAGE_BASE_URL,
        };

  const statusReason =
    effectiveBackend === "official"
      ? {
          code: providerConfig.apiKey.length > 0 ? undefined : "OFFICIAL_IMAGE_API_KEY_MISSING",
          message: providerConfig.apiKey.length > 0 ? undefined : "Official image API key is not configured.",
        }
      : {
          code:
            providerConfig.baseUrl.length === 0
              ? "RELAY_BASE_URL_MISSING"
              : providerConfig.apiKey.length === 0
                ? relayConfigKey === "micu"
                  ? "RELAY_IMAGE_API_KEY_MICU_MISSING"
                  : "RELAY_IMAGE_API_KEY_MISSING"
                : undefined,
          message:
            providerConfig.baseUrl.length === 0
              ? "Relay base URL is not configured."
              : providerConfig.apiKey.length === 0
                ? relayConfigKey === "micu"
                  ? "Relay image API key for the micu provider is not configured."
                  : "Relay image API key is not configured."
                : undefined,
        };

  return {
    backend: effectiveBackend,
    apiKey: providerConfig.apiKey,
    model: effectiveModel,
    modelId: registryModel?.id ?? resolvedModelId,
    label: registryModel?.label ?? resolvedModelId,
    baseUrl: providerConfig.baseUrl,
    textToImageCost,
    imageToImageCost,
    supports: registryModel?.supports ?? { t2i: true, i2i: true },
    supportedSizes: registryModel?.supportedSizes ?? GPT_IMAGE_SIZES,
    defaultSize: registryModel?.defaultSize ?? DEFAULT_IMAGE_SIZE,
    defaultQuality: registryModel?.defaultQuality,
    status:
      (
        (effectiveBackend === "official" && providerConfig.apiKey.length > 0) ||
        (effectiveBackend === "relay" && providerConfig.apiKey.length > 0 && providerConfig.baseUrl.length > 0)
      )
        ? "available"
        : "unavailable",
    statusCode: statusReason.code,
    statusMessage: statusReason.message,
  };
};

const getPromptAssistConfig = (env: Env, action: PromptAssistAction): PromptAssistConfig => {
  const provider =
    (
      action === "inspire"
        ? env.PROMPT_IDEA_PROVIDER ?? DEFAULT_PROMPT_IDEA_PROVIDER
        : env.PROMPT_EXPAND_PROVIDER ?? DEFAULT_PROMPT_EXPAND_PROVIDER
    )
      .trim()
      .toLowerCase();
  const model =
    (
      action === "inspire"
        ? env.PROMPT_IDEA_MODEL ?? DEFAULT_PROMPT_IDEA_MODEL
        : env.PROMPT_EXPAND_MODEL ?? DEFAULT_PROMPT_EXPAND_MODEL
    ).trim();

  const providerMap: Record<string, { apiKey: string; baseUrl: string }> = {
    openai: {
      apiKey: env.OPENAI_API_KEY?.trim() ?? "",
      baseUrl: (env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_TEXT_BASE_URL).replace(/\/$/, ""),
    },
    deepseek: {
      apiKey: env.DEEPSEEK_API_KEY?.trim() ?? "",
      baseUrl: (env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, ""),
    },
    minimax: {
      apiKey: env.MINIMAX_API_KEY?.trim() ?? "",
      baseUrl: (env.MINIMAX_BASE_URL?.trim() || "").replace(/\/$/, ""),
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY?.trim() ?? "",
      baseUrl: "",
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY?.trim() ?? "",
      baseUrl: "",
    },
  };

  const selectedProvider = providerMap[provider];
  if (!selectedProvider) {
    return { provider, model, apiKey: "", baseUrl: "", status: "unavailable" };
  }

  const status =
    selectedProvider.apiKey && (provider === "gemini" || provider === "anthropic" ? true : selectedProvider.baseUrl)
      ? "available"
      : "unavailable";

  return {
    provider,
    model,
    apiKey: selectedProvider.apiKey,
    baseUrl: selectedProvider.baseUrl,
    status: status ? "available" : "unavailable",
  };
};

const getEmailConfig = (env: Env) => {
  const provider = (env.EMAIL_PROVIDER ?? DEFAULT_EMAIL_PROVIDER).trim().toLowerCase();
  const from = env.EMAIL_FROM?.trim() ?? "";
  const subjectPrefix = env.EMAIL_SUBJECT_PREFIX?.trim() || DEFAULT_EMAIL_SUBJECT_PREFIX;
  const resendApiKey = env.RESEND_API_KEY?.trim() ?? "";

  if (!from) {
    throw new EmailDeliveryConfigError("EMAIL_FROM is required for verification emails.");
  }

  if (provider !== "resend") {
    throw new EmailDeliveryConfigError(`Unsupported email provider: ${provider}`);
  }

  if (!resendApiKey) {
    throw new EmailDeliveryConfigError("RESEND_API_KEY is required for verification emails.");
  }

  return {
    provider,
    from,
    subjectPrefix,
    resendApiKey,
    resendBaseUrl: DEFAULT_RESEND_BASE_URL,
  };
};

const getPromptAssistEndpoint = (config: PromptAssistConfig) => {
  if (["openai", "deepseek", "minimax"].includes(config.provider)) {
    if (config.baseUrl.endsWith("/chat/completions")) {
      return config.baseUrl;
    }
    return `${config.baseUrl}/chat/completions`;
  }

  throw new PromptAssistConfigError(`Unsupported prompt provider: ${config.provider}`);
};

const formatVerificationCodeHtml = (code: string) => `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b0d14;color:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px;border-radius:24px;background:#111522;border:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#7f8aa3;">SparkPost</p>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Your verification code</h1>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#b7c0d4;">Use the code below to continue signing in. It expires in 10 minutes.</p>
      <div style="margin:0 0 24px;padding:18px 20px;border-radius:18px;background:#171d2d;border:1px solid rgba(255,255,255,0.08);font-size:32px;font-weight:700;letter-spacing:0.3em;text-align:center;color:#ffffff;">
        ${code}
      </div>
      <p style="margin:0;font-size:13px;line-height:1.7;color:#7f8aa3;">If you did not request this code, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;

const sendVerificationCodeEmail = async (email: string, code: string, env: Env) => {
  const emailConfig = getEmailConfig(env);
  const response = await fetch(`${emailConfig.resendBaseUrl}/emails`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${emailConfig.resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: emailConfig.from,
      to: [email],
      subject: `${emailConfig.subjectPrefix} Your verification code`,
      html: formatVerificationCodeHtml(code),
      text: `Your SparkPost verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new EmailDeliveryProviderError(
      `Verification email delivery failed with status ${response.status}${responseText ? `: ${responseText}` : ""}`
    );
  }
};

const normalizeOrigin = (value: string | null) => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getAllowedOrigins = (env: Env) => {
  const configuredOrigins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => normalizeOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));

  return new Set(configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS);
};

const getRequestSourceOrigin = (request: Request) => {
  const origin = normalizeOrigin(request.headers.get("origin"));
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

const isLocalOrTestHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.endsWith(".test");

const isProtectedRoute = (request: Request, url: URL) =>
  request.method !== "GET" &&
  PROTECTED_ROUTE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

const isRequestFromAllowedOrigin = (request: Request, env: Env, url: URL) => {
  if (!isProtectedRoute(request, url)) return true;
  if (isLocalOrTestHost(url.hostname)) return true;

  const sourceOrigin = getRequestSourceOrigin(request);
  if (!sourceOrigin) return false;

  return getAllowedOrigins(env).has(sourceOrigin);
};

const getCorsHeaders = (request: Request, env: Env) => {
  const origin = request.headers.get("origin");
  const normalizedOrigin = normalizeOrigin(origin);
  const allowOrigin = normalizedOrigin && getAllowedOrigins(env).has(normalizedOrigin);

  return {
    ...(allowOrigin ? { "access-control-allow-origin": normalizedOrigin } : {}),
    "access-control-allow-credentials": allowOrigin ? "true" : "false",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
    vary: "Origin",
  };
};

const withCors = (request: Request, response: Response, env: Env) => {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(getCorsHeaders(request, env))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const json = (body: JsonRecord, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) => email.length <= 320 && EMAIL_REGEX.test(email);
const normalizePrompt = (prompt: string) => prompt.trim();
const REFERENCE_TOKEN_REGEX = /@R(\d+)\b/gi;
const clampText = (value: string, maxLength: number) => value.trim().slice(0, maxLength);
const getPublicAuthorName = (name: string | null, email: string) => {
  const cleanedName = name?.trim();
  if (cleanedName) return cleanedName.slice(0, 40);
  const [localPart] = email.split("@");
  const safeLocalPart = localPart || "Creator";
  return safeLocalPart.length <= 3 ? `${safeLocalPart}***` : `${safeLocalPart.slice(0, 3)}***`;
};

const getCreditDateKey = (date: Date, timeZone = DEFAULT_CREDIT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
};

const mapCreditTransactionTitle = (transactionType: string, remark: string | null, locale: "zh" | "en" = "zh") => {
  const normalizedType = transactionType.trim().toLowerCase();

  if (normalizedType === "signup_bonus") {
    return locale === "zh" ? "新用户赠送积分" : "Signup bonus";
  }

  if (normalizedType === "daily_check_in") {
    return locale === "zh" ? "每日签到" : "Daily check-in";
  }

  if (normalizedType === "daily_check_in_expired") {
    return locale === "zh" ? "绛惧埌绉垎杩囨湡" : "Check-in credits expired";
  }

  if (normalizedType === "text_to_image") {
    return locale === "zh" ? "文生图消耗" : "Text-to-image";
  }

  if (normalizedType === "image_to_image") {
    return locale === "zh" ? "图生图消耗" : "Image-to-image";
  }

  if (normalizedType === "topup") {
    return remark || (locale === "zh" ? "充值套餐" : "Top-up");
  }

  return remark || (locale === "zh" ? "积分变动" : "Credit update");
};

const mapCreditTransactionItem = (
  row: CreditTransactionRow,
  locale: "zh" | "en" = "zh",
): CreditTransactionItem => ({
  id: row.id,
  type: row.amount >= 0 ? "earned" : "consumed",
  title: mapCreditTransactionTitle(row.type, row.remark, locale),
  amount: row.amount,
  date: row.createdAt,
  balanceAfter: row.balanceAfter,
  sourceType: row.sourceType,
  expiresAt: row.expiresAt,
  remainingAmount: row.remainingAmount,
  packageCode: row.packageCode,
  paymentProvider: row.paymentProvider,
  paymentSessionId: row.paymentSessionId,
});

const getExpiryDateIso = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const findCreditPackage = (code: string) =>
  CREDIT_PACKAGE_DEFINITIONS.find((item) => item.code === code);

const reconcileExpiredCreditsForUser = async (userId: string, env: Env, now = new Date()) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const expiredLots = await env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       type,
       source_type AS sourceType,
       COALESCE(remaining_amount, CASE WHEN amount > 0 THEN amount ELSE 0 END) AS remainingAmount,
       expires_at AS expiresAt,
       created_at AS createdAt
     FROM credit_transactions
     WHERE user_id = ?
       AND amount > 0
       AND expires_at IS NOT NULL
       AND expires_at <= ?
       AND COALESCE(remaining_amount, CASE WHEN amount > 0 THEN amount ELSE 0 END) > 0
     ORDER BY expires_at ASC, created_at ASC`,
  ).bind(userId, now.toISOString()).all<CreditLotRow>();

  const lots = expiredLots.results ?? [];
  if (lots.length === 0) {
    return { expiredCredits: 0 };
  }

  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!account) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  const expiredCredits = lots.reduce((sum, lot) => sum + lot.remainingAmount, 0);
  const nextBalance = Math.max(0, account.balance - expiredCredits);

  for (const lot of lots) {
    await env.SPARKPOST_DB.prepare(
      `UPDATE credit_transactions SET remaining_amount = ? WHERE id = ?`,
    ).bind(0, lot.id).run();
  }

  await env.SPARKPOST_DB.prepare(
    `UPDATE credit_accounts SET balance = ?, updated_at = ? WHERE user_id = ?`,
  ).bind(nextBalance, now.toISOString(), userId).run();

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO credit_transactions (
       id, user_id, type, source_type, amount, balance_after, remaining_amount, expires_at,
       related_task_id, package_code, payment_provider, payment_session_id, remark, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    userId,
    "daily_check_in_expired",
    "expiration",
    -expiredCredits,
    nextBalance,
    null,
    null,
    null,
    null,
    null,
    null,
    "Expired daily check-in credits",
    now.toISOString(),
  ).run();

  return { expiredCredits };
};

const awardCreditsToUser = async (
  userId: string,
  env: Env,
  options: {
    amount: number;
    type: string;
    sourceType: string;
    remark: string;
    now?: Date;
    expiresAt?: string | null;
    packageCode?: string | null;
    paymentProvider?: string | null;
    paymentSessionId?: string | null;
  },
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const now = options.now ?? new Date();
  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!account) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  const nextBalance = account.balance + options.amount;

  await env.SPARKPOST_DB.prepare(
    `UPDATE credit_accounts SET balance = ?, updated_at = ? WHERE user_id = ?`,
  ).bind(nextBalance, now.toISOString(), userId).run();

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO credit_transactions (
       id, user_id, type, source_type, amount, balance_after, remaining_amount, expires_at,
       related_task_id, package_code, payment_provider, payment_session_id, remark, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    userId,
    options.type,
    options.sourceType,
    options.amount,
    nextBalance,
    options.amount,
    options.expiresAt ?? null,
    null,
    options.packageCode ?? null,
    options.paymentProvider ?? null,
    options.paymentSessionId ?? null,
    options.remark,
    now.toISOString(),
  ).run();

  return nextBalance;
};

const spendCreditsForUser = async (
  userId: string,
  env: Env,
  options: {
    amount: number;
    type: "text_to_image" | "image_to_image";
    sourceType?: string;
    relatedTaskId?: string | null;
    remark: string;
    now?: Date;
  },
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const now = options.now ?? new Date();
  await reconcileExpiredCreditsForUser(userId, env, now);

  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!account) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  if (account.balance < options.amount) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const lots = await env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       type,
       source_type AS sourceType,
       COALESCE(remaining_amount, CASE WHEN amount > 0 THEN amount ELSE 0 END) AS remainingAmount,
       expires_at AS expiresAt,
       created_at AS createdAt
     FROM credit_transactions
     WHERE user_id = ?
       AND amount > 0
       AND COALESCE(remaining_amount, CASE WHEN amount > 0 THEN amount ELSE 0 END) > 0
     ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END ASC, expires_at ASC, created_at ASC`,
  ).bind(userId).all<CreditLotRow>();

  let remaining = options.amount;
  for (const lot of lots.results ?? []) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, lot.remainingAmount);
    await env.SPARKPOST_DB.prepare(
      `UPDATE credit_transactions SET remaining_amount = ? WHERE id = ?`,
    ).bind(lot.remainingAmount - used, lot.id).run();
    remaining -= used;
  }

  if (remaining > 0) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const nextBalance = account.balance - options.amount;
  await env.SPARKPOST_DB.prepare(
    `UPDATE credit_accounts SET balance = ?, updated_at = ? WHERE user_id = ?`,
  ).bind(nextBalance, now.toISOString(), userId).run();

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO credit_transactions (
       id, user_id, type, source_type, amount, balance_after, remaining_amount, expires_at,
       related_task_id, package_code, payment_provider, payment_session_id, remark, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    userId,
    options.type,
    options.sourceType ?? "generation",
    -options.amount,
    nextBalance,
    null,
    null,
    options.relatedTaskId ?? null,
    null,
    null,
    null,
    options.remark,
    now.toISOString(),
  ).run();

  return nextBalance;
};

const getCreditSummaryForUser = async (userId: string, env: Env): Promise<CreditSummaryResponse> => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  await reconcileExpiredCreditsForUser(userId, env);
  const authConfig = getAuthConfig(env);
  const todayKey = getCreditDateKey(new Date());
  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  const checkIn = await env.SPARKPOST_DB.prepare(
    `SELECT id FROM daily_check_ins WHERE user_id = ? AND check_in_date = ? LIMIT 1`,
  ).bind(userId, todayKey).first<{ id: string }>();

  const transactions = await env.SPARKPOST_DB.prepare(
    `SELECT created_at AS createdAt, amount, type
     FROM credit_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 200`,
  ).bind(userId).all<{ createdAt: string; amount: number; type: string }>();

  const today = new Date();
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return getCreditDateKey(date);
  });
  const usageMap = new Map(dayKeys.map((key) => [key, 0]));

  for (const item of transactions.results ?? []) {
    const key = getCreditDateKey(new Date(item.createdAt));
    if (!usageMap.has(key)) continue;
    if (item.amount < 0 && item.type !== "daily_check_in_expired") {
      usageMap.set(key, (usageMap.get(key) ?? 0) + Math.abs(item.amount));
    }
  }

  return {
    creditBalance: account?.balance ?? 0,
    hasCheckedInToday: Boolean(checkIn),
    dailyCheckInCredits: authConfig.dailyCheckInCredits,
    currentPlan: "free",
    usageLast7Days: dayKeys.map((key) => usageMap.get(key) ?? 0),
  };
};

const getCreditTransactionsForUser = async (
  userId: string,
  env: Env,
  options: { filter: "all" | "earned" | "consumed"; limit: number; locale: "zh" | "en" },
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  await reconcileExpiredCreditsForUser(userId, env);
  const clauses = ["user_id = ?"];
  const values: unknown[] = [userId];

  if (options.filter === "earned") {
    clauses.push("amount >= 0");
  } else if (options.filter === "consumed") {
    clauses.push("amount < 0");
  }

  clauses.push("1 = 1");
  values.push(options.limit);

  const result = await env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       type,
       source_type AS sourceType,
       amount,
       balance_after AS balanceAfter,
       COALESCE(remaining_amount, CASE WHEN amount > 0 THEN amount ELSE NULL END) AS remainingAmount,
       expires_at AS expiresAt,
       package_code AS packageCode,
       payment_provider AS paymentProvider,
       payment_session_id AS paymentSessionId,
       remark,
       created_at AS createdAt
     FROM credit_transactions
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT ?`,
  ).bind(...values).all<CreditTransactionRow>();

  return (result.results ?? []).map((row) => mapCreditTransactionItem(row, options.locale));
};

let generationFavoriteColumnReady: Promise<void> | null = null;
let galleryTablesReady: Promise<void> | null = null;

const ensureGenerationFavoriteColumn = async (env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  generationFavoriteColumnReady ??= env.SPARKPOST_DB.prepare(
    `ALTER TABLE generation_tasks ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0`,
  ).bind().run().then(
    () => undefined,
    (error) => {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("duplicate column") || message.includes("already exists")) return undefined;
      throw error;
    },
  );

  try {
    await generationFavoriteColumnReady;
  } catch (error) {
    generationFavoriteColumnReady = null;
    throw error;
  }
};

const ensureGalleryTables = async (env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  galleryTablesReady ??= (async () => {
    await env.SPARKPOST_DB!.prepare(
      `CREATE TABLE IF NOT EXISTS gallery_items (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'public',
        like_count INTEGER NOT NULL DEFAULT 0,
        remix_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES generation_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    ).bind().run();
    await env.SPARKPOST_DB!.prepare(
      `CREATE INDEX IF NOT EXISTS idx_gallery_items_visibility_created_at
       ON gallery_items (visibility, created_at)`,
    ).bind().run();
    await env.SPARKPOST_DB!.prepare(
      `CREATE INDEX IF NOT EXISTS idx_gallery_items_visibility_like_count
       ON gallery_items (visibility, like_count)`,
    ).bind().run();
    await env.SPARKPOST_DB!.prepare(
      `CREATE TABLE IF NOT EXISTS gallery_likes (
        gallery_item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (gallery_item_id, user_id),
        FOREIGN KEY (gallery_item_id) REFERENCES gallery_items(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
    ).bind().run();
    await env.SPARKPOST_DB!.prepare(
      `CREATE INDEX IF NOT EXISTS idx_gallery_likes_user_id
       ON gallery_likes (user_id)`,
    ).bind().run();
  })();

  try {
    await galleryTablesReady;
  } catch (error) {
    galleryTablesReady = null;
    throw error;
  }
};

const getGenerationHistoryForUser = async (
  userId: string,
  env: Env,
  options: { limit: number; offset: number; filter: GenerationHistoryFilter },
): Promise<{ items: GenerationHistoryItem[]; hasMore: boolean; nextOffset: number }> => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }
  await ensureGenerationFavoriteColumn(env);

  const clauses = ["user_id = ?"];
  const values: Array<string | number> = [userId];
  if (options.filter === "succeeded" || options.filter === "failed") {
    clauses.push("status = ?");
    values.push(options.filter);
  } else if (options.filter === "favorites") {
    clauses.push("is_favorite = 1");
  } else if (options.filter === "t2i" || options.filter === "i2i") {
    clauses.push("task_type = ?");
    values.push(options.filter === "t2i" ? "text_to_image" : "image_to_image");
  }

  const queryLimit = options.limit + 1;
  values.push(queryLimit, options.offset);

  const result = await env.SPARKPOST_DB.prepare(
    `SELECT
       gt.id,
       gt.task_type AS taskType,
       gt.status,
       gt.prompt,
       gt.requested_size AS requestedSize,
       gt.model,
       gt.cost_credits AS costCredits,
       gt.error_message AS errorMessage,
       COALESCE(gt.is_favorite, 0) AS isFavorite,
       gt.created_at AS createdAt,
       gt.completed_at AS completedAt,
       ga.id AS assetId,
       ga.file_url AS fileUrl,
       ga.width,
       ga.height,
       ga.created_at AS assetCreatedAt
     FROM (
       SELECT *
       FROM generation_tasks
       WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT ?
       OFFSET ?
     ) gt
     LEFT JOIN generated_assets ga ON ga.task_id = gt.id
     ORDER BY gt.created_at DESC, ga.created_at ASC`,
  ).bind(...values).all<GenerationHistoryRow>();

  const itemsById = new Map<string, GenerationHistoryItem>();

  for (const row of result.results ?? []) {
    const existing = itemsById.get(row.id);
    const item =
      existing ??
      {
        id: row.id,
        taskType: row.taskType,
        status: row.status,
        prompt: row.prompt,
        requestedSize: row.requestedSize,
        model: row.model,
        costCredits: row.costCredits,
        errorMessage: row.errorMessage,
        isFavorite: Boolean(row.isFavorite),
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        assets: [],
      };

    if (!existing) itemsById.set(row.id, item);

    if (row.assetId && row.fileUrl) {
      item.assets.push({
        id: row.assetId,
        fileUrl: row.fileUrl,
        width: row.width,
        height: row.height,
        createdAt: row.assetCreatedAt ?? row.completedAt ?? row.createdAt,
      });
    }
  }

  const items = [...itemsById.values()];
  const pageItems = items.slice(0, options.limit);

  return {
    items: pageItems,
    hasMore: items.length > options.limit,
    nextOffset: options.offset + pageItems.length,
  };
};

const performDailyCheckInForUser = async (userId: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const authConfig = getAuthConfig(env);
  const now = new Date();
  await reconcileExpiredCreditsForUser(userId, env, now);
  const todayKey = getCreditDateKey(now);
  const existingCheckIn = await env.SPARKPOST_DB.prepare(
    `SELECT id FROM daily_check_ins WHERE user_id = ? AND check_in_date = ? LIMIT 1`,
  ).bind(userId, todayKey).first<{ id: string }>();

  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!account) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  if (existingCheckIn) {
    return {
      awardedCredits: 0,
      summary: await getCreditSummaryForUser(userId, env),
    };
  }

  const awardedCredits = authConfig.dailyCheckInCredits;

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO daily_check_ins (id, user_id, check_in_date, reward_credits, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), userId, todayKey, awardedCredits, now.toISOString()).run();

  await awardCreditsToUser(userId, env, {
    amount: awardedCredits,
    type: "daily_check_in",
    sourceType: "check_in",
    remark: "Daily check-in",
    expiresAt: getExpiryDateIso(now, DAILY_CHECK_IN_EXPIRY_DAYS),
    now,
  });

  return {
    awardedCredits,
    summary: await getCreditSummaryForUser(userId, env),
  };
};

const getMentionedReferenceIndexes = (prompt: string, referenceCount: number) => {
  const mentioned = new Set<number>();
  for (const match of prompt.matchAll(REFERENCE_TOKEN_REGEX)) {
    const rawIndex = Number.parseInt(match[1] ?? "", 10);
    if (Number.isFinite(rawIndex) && rawIndex >= 1 && rawIndex <= referenceCount) {
      mentioned.add(rawIndex);
    }
  }
  return Array.from(mentioned);
};

const getFallbackReferenceRole = (index: number) => {
  if (index === 1) return "Primary subject and composition anchor.";
  if (index === 2) return "Secondary style, pose, or mood reference.";
  if (index === 3) return "Support details, materials, or color palette reference.";
  if (index === 4) return "Lighting, camera, or background atmosphere reference.";
  return "Low-priority supporting reference unless explicitly requested.";
};

const getMatchedReferenceIndex = (pattern: RegExp, prompt: string, referenceCount: number) => {
  const match = pattern.exec(prompt);
  pattern.lastIndex = 0;
  if (!match) {
    return null;
  }

  const rawIndex = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(rawIndex) || rawIndex < 1 || rawIndex > referenceCount) {
    return null;
  }

  return rawIndex;
};

const getMatchedReferencePair = (pattern: RegExp, prompt: string, referenceCount: number) => {
  const match = pattern.exec(prompt);
  pattern.lastIndex = 0;
  if (!match) {
    return null;
  }

  const leftIndex = Number.parseInt(match[1] ?? "", 10);
  const rightIndex = Number.parseInt(match[2] ?? "", 10);
  if (
    !Number.isFinite(leftIndex) ||
    !Number.isFinite(rightIndex) ||
    leftIndex < 1 ||
    rightIndex < 1 ||
    leftIndex > referenceCount ||
    rightIndex > referenceCount
  ) {
    return null;
  }

  return { leftIndex, rightIndex };
};

const getImageToImageIntentHints = (prompt: string, referenceCount: number) => {
  const hints: string[] = [];

  const replacementPair = getMatchedReferencePair(
    /@R(\d+).*?(?:换成|改成|替换成|替换为|变成).*?@R(\d+)/i,
    prompt,
    referenceCount,
  );
  if (replacementPair) {
    hints.push(
      `Treat R${replacementPair.leftIndex} as the original subject that should stay identifiable, and borrow the requested replacement traits from R${replacementPair.rightIndex}.`,
    );
  }

  const styleReference = getMatchedReferenceIndex(
    /(?:参考|按照|用|沿用|借鉴)\s*@R(\d+).*?(?:风格|画风|配色|氛围|质感|材质)/i,
    prompt,
    referenceCount,
  );
  if (styleReference) {
    hints.push(`Use R${styleReference} as the dominant style, color, and rendering reference.`);
  }

  const poseReference = getMatchedReferenceIndex(
    /(?:参考|按照|用|沿用|借鉴)\s*@R(\d+).*?(?:姿势|动作|构图|机位|角度|表情)/i,
    prompt,
    referenceCount,
  );
  if (poseReference) {
    hints.push(`Follow the pose, composition, or camera language from R${poseReference}.`);
  }

  const preserveReference = getMatchedReferenceIndex(
    /(?:保留|保持|沿用|维持)\s*@R(\d+).*?(?:主体|轮廓|人设|角色|脸|特征|构图|服装|元素|细节)?/i,
    prompt,
    referenceCount,
  );
  if (preserveReference) {
    hints.push(`Preserve the key identity, silhouette, and recognizable subject cues from R${preserveReference}.`);
  }

  const blendPair = getMatchedReferencePair(/(?:融合|结合|混合).*?@R(\d+).*?@R(\d+)/i, prompt, referenceCount);
  if (blendPair) {
    hints.push(
      `Blend the strengths of R${blendPair.leftIndex} and R${blendPair.rightIndex} in a controlled way instead of averaging all references equally.`,
    );
  }

  if (/(光影|灯光|lighting)/i.test(prompt)) {
    hints.push("Pay close attention to the requested lighting direction, contrast, and atmosphere.");
  }

  if (/(背景|场景|环境|background|scene)/i.test(prompt)) {
    hints.push("Keep the final background coherent with the requested environment instead of overfitting to every reference.");
  }

  if (/(一致|统一|coherent|consistent)/i.test(prompt)) {
    hints.push("Favor one coherent final image and avoid visual conflicts between references.");
  }

  return hints;
};

// 中文注释：
// 这里把文本模型辅助功能的固定规则尽量前置并保持稳定，用户输入永远放在最后。
// 这样后续接 DeepSeek 时，系统提示词和固定前缀更容易形成“相同前缀”，从而提高缓存命中率。
const getPromptAssistSystemPrompt = (action: PromptAssistAction, mode: "t2i" | "i2i") => {
  if (action === "inspire") {
    return mode === "i2i"
      ? [
          "You are SparkPost Prompt Assist.",
          "Your job is to turn rough image-to-image intentions into concise production-ready prompts.",
          "Always return prompt text only.",
          "Do not use markdown, bullet lists, headings, numbering, quotes, or explanations.",
          "Keep any @R# markers intact when they are useful for the user's instruction.",
          "Prefer one compact prompt with clear subject, composition, transfer intent, constraints, and quality cues.",
        ].join(" ")
      : [
          "You are SparkPost Prompt Assist.",
          "Your job is to turn rough text-to-image ideas into concise production-ready prompts.",
          "Always return prompt text only.",
          "Do not use markdown, bullet lists, headings, numbering, quotes, or explanations.",
          "Prefer one compact prompt with clear subject, environment, lighting, style, camera, and quality cues.",
        ].join(" ");
  }

  return mode === "i2i"
    ? [
        "You are SparkPost Prompt Assist.",
        "Rewrite rough image-to-image prompts into polished professional prompts.",
        "Always return prompt text only.",
        "Do not use markdown, bullet lists, headings, numbering, quotes, or explanations.",
        "Preserve the user's core intent.",
        "Keep any @R# reference markers intact.",
        "Improve clarity, structure, editability, and creative precision without changing the requested outcome.",
      ].join(" ")
    : [
        "You are SparkPost Prompt Assist.",
        "Rewrite rough text-to-image prompts into polished professional prompts.",
        "Always return prompt text only.",
        "Do not use markdown, bullet lists, headings, numbering, quotes, or explanations.",
        "Preserve the user's core intent while improving clarity, specificity, and renderability.",
      ].join(" ");
};

const getPromptAssistUserPrompt = (action: PromptAssistAction, prompt: string, mode: "t2i" | "i2i") => {
  const fixedPrefix =
    action === "inspire"
      ? mode === "i2i"
        ? [
            "Task:",
            "Create a stronger image-to-image prompt from the user's rough idea.",
            "Output contract:",
            "- output a single prompt only",
            "- keep useful @R# markers",
            "- make the wording direct and production-ready",
            "- avoid extra commentary",
            "User input:",
          ].join("\n")
        : [
            "Task:",
            "Create a stronger text-to-image prompt from the user's rough idea.",
            "Output contract:",
            "- output a single prompt only",
            "- make the wording direct and production-ready",
            "- avoid extra commentary",
            "User input:",
          ].join("\n")
      : mode === "i2i"
        ? [
            "Task:",
            "Rewrite the user's image-to-image prompt into a cleaner professional version.",
            "Output contract:",
            "- output a single prompt only",
            "- preserve the original intent",
            "- keep @R# markers intact",
            "- improve clarity and controllability",
            "- avoid extra commentary",
            "User input:",
          ].join("\n")
        : [
            "Task:",
            "Rewrite the user's text-to-image prompt into a cleaner professional version.",
            "Output contract:",
            "- output a single prompt only",
            "- preserve the original intent",
            "- improve clarity and controllability",
            "- avoid extra commentary",
            "User input:",
          ].join("\n");

  return `${fixedPrefix}\n${prompt.trim()}`;
};

const extractPromptAssistText = (body: unknown) => {
  if (!body || typeof body !== "object") {
    return null;
  }

  if ("choices" in body && Array.isArray((body as { choices?: unknown[] }).choices)) {
    const firstChoice = (body as { choices: Array<{ message?: { content?: unknown } }> }).choices[0];
    const content = firstChoice?.message?.content;
    if (typeof content === "string" && content.trim()) {
      return content.trim();
    }
  }

  return null;
};

const callPromptAssistProvider = async (
  action: PromptAssistAction,
  prompt: string,
  mode: "t2i" | "i2i",
  env: Env,
) => {
  const config = getPromptAssistConfig(env, action);
  if (config.status !== "available") {
    throw new PromptAssistConfigError("Prompt assist provider is not configured.");
  }

  if (!["openai", "deepseek", "minimax"].includes(config.provider)) {
    throw new PromptAssistConfigError(`Prompt assist provider ${config.provider} is not supported yet.`);
  }

  const endpoint = getPromptAssistEndpoint(config);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: action === "inspire" ? 0.9 : 0.6,
      messages: [
        { role: "system", content: getPromptAssistSystemPrompt(action, mode) },
        { role: "user", content: getPromptAssistUserPrompt(action, prompt, mode) },
      ],
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Prompt assist provider request failed.", { action, status: response.status, body });
    throw new PromptAssistProviderError("Prompt assist provider request failed.");
  }

  const text = extractPromptAssistText(body);
  if (!text) {
    throw new PromptAssistProviderError("Prompt assist provider returned no text.");
  }

  return {
    prompt: text,
    provider: config.provider,
    model: config.model,
  };
};

// 中文说明：
// 这里不会直接把用户原始提示词裸传给图生图模型，而是先做一层“提示词编译”。
// 目标不是替用户重写创意，而是把 @R1 / @R2 这类引用、以及“参考 / 保留 / 换成 / 融合”
// 这类中文动作词翻译成更稳定的英文控制指令，让模型更清楚每张参考图扮演什么角色。

// 中文说明：
// 这里把用户在前端输入的 @R1 / @R2 之类标记，编译成更适合图生图模型理解的专业提示词。
// 目标不是替用户改写创意，而是把“哪张图扮演什么角色”表达得更清楚。
const compileImageToImagePrompt = (userPrompt: string, referenceCount: number) => {
  const normalizedPrompt = normalizePrompt(userPrompt);
  const mentionedReferences = getMentionedReferenceIndexes(normalizedPrompt, referenceCount);
  const effectiveReferences =
    mentionedReferences.length > 0
      ? mentionedReferences
      : Array.from({ length: referenceCount }, (_, index) => index + 1);

  const referenceGuide = Array.from({ length: referenceCount }, (_, index) => {
    const refIndex = index + 1;
    const isExplicitlyMentioned = mentionedReferences.includes(refIndex);
    const role = isExplicitlyMentioned
      ? "Explicitly referenced by the user. Follow any requested transfer, replacement, or blend involving this image."
      : getFallbackReferenceRole(refIndex);
    return `- R${refIndex}: ${role}`;
  }).join("\n");

  const priorityLine =
    mentionedReferences.length > 0
      ? `Prioritize the explicitly referenced images in this order: ${effectiveReferences.map((index) => `R${index}`).join(", ")}. Treat unmentioned references as lower-priority support.`
      : `No explicit @R token was provided. Use R1 as the primary reference and treat R2-R${referenceCount} as supporting references in descending priority.`;
  const intentHints = getImageToImageIntentHints(normalizedPrompt, referenceCount);
  const intentGuide =
    intentHints.length > 0
      ? ["Interpretation hints:", ...intentHints.map((hint) => `- ${hint}`)]
      : [
          "Interpretation hints:",
          "- If the user does not clearly assign roles, keep R1 as the main subject anchor and use the remaining references as secondary style or detail support.",
        ];

  return [
    "You are performing professional image-to-image generation with uploaded reference images.",
    "Interpret every @R# token in the user intent as a direct pointer to the matching uploaded reference image.",
    priorityLine,
    "Preserve only the attributes the user wants to keep, and transfer only the attributes the user explicitly asks to change.",
    "When multiple references are present, keep the result coherent and avoid averaging everything blindly.",
    ...intentGuide,
    "Reference guide:",
    referenceGuide,
    "User intent:",
    normalizedPrompt,
  ].join("\n");
};

const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
};

const getSessionSecret = (env: Env) => {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  throw new Error("SESSION_SECRET is required for Workers auth routes.");
};

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
};

const decodeBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");
const encodeBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const hmacSha256 = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
};

const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const createSessionToken = async (userId: string, email: string, env: Env) => {
  const authConfig = getAuthConfig(env);
  const issuedAt = Date.now();
  const expiresAt = issuedAt + authConfig.sessionTtlDays * 24 * 60 * 60 * 1000;
  const payload: SessionPayload = { userId, email, issuedAt, expiresAt };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = Buffer.from(await hmacSha256(encodedPayload, getSessionSecret(env))).toString("base64url");
  return `${encodedPayload}.${signature}`;
};

const verifySessionToken = async (token: string | undefined, env: Env): Promise<SessionPayload | null> => {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignatureBuffer = await hmacSha256(encodedPayload, getSessionSecret(env));
  const actualSignatureBuffer = Buffer.from(signature, "base64url");

  if (!constantTimeEqual(actualSignatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    if (!payload.userId || !payload.email || Date.now() >= payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const getAuthenticatedUser = async (request: Request, env: Env) => {
  const sessionToken = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  const session = await verifySessionToken(sessionToken, env);

  if (!session) {
    return { ok: true, user: null } as const;
  }

  if (!env.SPARKPOST_DB) {
    return {
      ok: false,
      response: json({ error: "Authentication service is temporarily unavailable." }, { status: 503 }),
    } as const;
  }

  const user = await env.SPARKPOST_DB.prepare(
    `SELECT
       users.id,
       users.email,
       users.created_at AS createdAt,
       users.email_verified_at AS emailVerifiedAt,
       users.last_login_at AS lastLoginAt,
       COALESCE(credit_accounts.balance, 0) AS creditBalance
     FROM users
     LEFT JOIN credit_accounts ON credit_accounts.user_id = users.id
     WHERE users.id = ?
     LIMIT 1`,
  ).bind(session.userId).first<AuthenticatedUserRow>();

  if (!user || user.email !== session.email) {
    return { ok: true, user: null } as const;
  }

  await reconcileExpiredCreditsForUser(user.id, env);

  const refreshedAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(user.id).first<{ balance: number }>();

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      creditBalance: refreshedAccount?.balance ?? user.creditBalance ?? 0,
    },
  } as const;
};

const parseJsonBody = async (request: Request) => {
  try {
    return { ok: true as const, body: (await request.json()) as unknown };
  } catch {
    return { ok: false as const, error: "Request body must be valid JSON." };
  }
};

const validatePromptAssistInput = (input: unknown) => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const prompt = "prompt" in input ? input.prompt : undefined;
  const mode = "mode" in input ? input.mode : undefined;

  if (typeof prompt !== "string" || !prompt.trim()) {
    return { ok: false as const, error: "Prompt is required." };
  }

  if (mode !== "t2i" && mode !== "i2i") {
    return { ok: false as const, error: "Mode must be t2i or i2i." };
  }

  return {
    ok: true as const,
    prompt: normalizePrompt(prompt),
    mode: mode as "t2i" | "i2i",
  };
};

const validateSendCodeInput = (input: unknown) => {
  const email = typeof input === "object" && input !== null && !Array.isArray(input) && "email" in input ? input.email : undefined;
  if (typeof email !== "string") {
    return { ok: false as const, error: "Email is required." };
  }
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }
  return { ok: true as const, email: normalizedEmail };
};

const validateVerifyCodeInput = (input: unknown, env: Env) => {
  const email = typeof input === "object" && input !== null && !Array.isArray(input) && "email" in input ? input.email : undefined;
  const code = typeof input === "object" && input !== null && !Array.isArray(input) && "code" in input ? input.code : undefined;

  if (typeof email !== "string" || typeof code !== "string") {
    return { ok: false as const, error: "Email and code are required." };
  }

  const authConfig = getAuthConfig(env);
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();
  const codePattern = new RegExp(`^\\d{${authConfig.codeLength}}$`);

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  if (!codePattern.test(normalizedCode)) {
    return { ok: false as const, error: `Verification code must be ${authConfig.codeLength} digits.` };
  }

  return { ok: true as const, email: normalizedEmail, code: normalizedCode };
};

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isSupportedReferenceImage = (value: string) =>
  /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);

const normalizeImageSize = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const validateGenerateImageInput = (input: unknown) => {
  const prompt = isRecord(input) && "prompt" in input ? input.prompt : undefined;
  const mode = isRecord(input) && "mode" in input ? input.mode : undefined;
  const modelId = isRecord(input) && "modelId" in input ? input.modelId : undefined;
  const requestedSize =
    isRecord(input) && "size" in input
      ? input.size
      : isRecord(input) && "imageSize" in input
        ? input.imageSize
        : isRecord(input) && "resolution" in input
          ? input.resolution
          : undefined;
  const referenceImages = isRecord(input) && "referenceImages" in input ? input.referenceImages : undefined;

  if (typeof prompt !== "string") {
    return { ok: false as const, error: "Prompt is required." };
  }

  const normalizedPrompt = normalizePrompt(prompt);
  if (normalizedPrompt.length < 3) {
    return { ok: false as const, error: "Prompt must be at least 3 characters." };
  }
  if (normalizedPrompt.length > 2000) {
    return { ok: false as const, error: "Prompt must be 2000 characters or fewer." };
  }

  const normalizedMode =
    mode === "i2i" || mode === "t2i" ? mode : Array.isArray(referenceImages) && referenceImages.length > 0 ? "i2i" : "t2i";
  const normalizedModelId = typeof modelId === "string" && modelId.trim().length > 0 ? modelId.trim().toLowerCase() : undefined;
  const normalizedSize = normalizeImageSize(requestedSize);
  const size = normalizedSize.length > 0 ? (normalizedSize as ImageSize) : undefined;
  const supportedSizes = IMAGE_MODEL_REGISTRY[normalizedModelId ?? DEFAULT_IMAGE_MODEL_ID]?.supportedSizes ?? GPT_IMAGE_SIZES;
  if (size && !supportedSizes.includes(size)) {
    return {
      ok: false as const,
      error: `Unsupported image size. Supported sizes: ${supportedSizes.join(", ")}.`,
    };
  }

  if (normalizedMode === "t2i") {
    return {
      ok: true as const,
      mode: normalizedMode,
      modelId: normalizedModelId,
      size,
      prompt: normalizedPrompt,
      referenceImages: [] as string[],
    };
  }

  if (!Array.isArray(referenceImages) || referenceImages.length === 0) {
    return { ok: false as const, error: "At least one reference image is required for image-to-image." };
  }

  if (referenceImages.length > 5) {
    return { ok: false as const, error: "Image-to-image supports up to 5 reference images." };
  }

  if (referenceImages.some((value) => typeof value !== "string" || !isSupportedReferenceImage(value))) {
    return { ok: false as const, error: "Reference images must be valid image data URLs." };
  }

  return {
    ok: true as const,
    mode: normalizedMode,
    modelId: normalizedModelId,
    size,
    prompt: normalizedPrompt,
    referenceImages,
  };
};

const validateCreateCheckoutInput = (input: unknown) => {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const packageCode = typeof input.packageCode === "string" ? input.packageCode.trim() : "";
  const paymentProvider =
    typeof input.paymentProvider === "string" && input.paymentProvider.trim()
      ? input.paymentProvider.trim().toLowerCase()
      : "stripe";

  if (!packageCode) {
    return { ok: false as const, error: "packageCode is required." };
  }

  const creditPackage = findCreditPackage(packageCode);
  if (!creditPackage) {
    return { ok: false as const, error: "Unsupported credit package." };
  }

  return {
    ok: true as const,
    packageCode,
    paymentProvider,
    creditPackage,
  };
};

const generateVerificationCode = (env: Env) => {
  const authConfig = getAuthConfig(env);
  const min = 10 ** (authConfig.codeLength - 1);
  const max = 10 ** authConfig.codeLength;
  const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
  return String(min + (randomValue % (max - min)));
};

const hashVerificationCode = async (email: string, code: string, env: Env) => {
  return sha256Hex(`${normalizeEmail(email)}:${code}:${getSessionSecret(env)}`);
};

const shouldExposeDebugCode = (env: Env) => env.DEV_AUTH_DEBUG_CODE === "true";

const issueVerificationCode = async (email: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new Error("D1 binding SPARKPOST_DB is not configured.");
  }

  const authConfig = getAuthConfig(env);
  const now = new Date();
  const latestCode = await env.SPARKPOST_DB.prepare(
    `SELECT created_at AS createdAt FROM email_verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(email).first<{ createdAt: string }>();

  if (latestCode) {
    const millisecondsSinceLastCode = now.getTime() - new Date(latestCode.createdAt).getTime();
    const cooldownMilliseconds = authConfig.codeCooldownSeconds * 1000;
    if (millisecondsSinceLastCode < cooldownMilliseconds) {
      return { ok: false as const, retryAfterSeconds: Math.ceil((cooldownMilliseconds - millisecondsSinceLastCode) / 1000) };
    }
  }

  const code = generateVerificationCode(env);
  const expiresAt = new Date(now.getTime() + authConfig.codeTtlMinutes * 60 * 1000);
  const codeHash = await hashVerificationCode(email, code, env);

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO email_verification_codes (id, email, code_hash, expires_at, attempt_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
  ).bind(crypto.randomUUID(), email, codeHash, expiresAt.toISOString(), now.toISOString(), now.toISOString()).run();

  if (shouldExposeDebugCode(env)) {
    return { ok: true as const, expiresAt, debugCode: code };
  }

  await sendVerificationCodeEmail(email, code, env);
  return { ok: true as const, expiresAt };
};

const verifyCodeAndProvisionUser = async (email: string, code: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new Error("D1 binding SPARKPOST_DB is not configured.");
  }

  const authConfig = getAuthConfig(env);
  const now = new Date();
  const codeHash = await hashVerificationCode(email, code, env);
  const verificationCode = await env.SPARKPOST_DB.prepare(
    `SELECT id, email, code_hash AS codeHash, attempt_count AS attemptCount, expires_at AS expiresAt,
            locked_until AS lockedUntil, used_at AS usedAt, created_at AS createdAt
     FROM email_verification_codes WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(email).first<VerificationCodeRow>();

  if (!verificationCode) return { ok: false as const, reason: "invalid" };
  if (verificationCode.usedAt) return { ok: false as const, reason: "used" };
  if (new Date(verificationCode.expiresAt) <= now) return { ok: false as const, reason: "expired" };
  if (verificationCode.lockedUntil && new Date(verificationCode.lockedUntil) > now) {
    return {
      ok: false as const,
      reason: "locked",
      retryAfterSeconds: Math.max(1, Math.ceil((new Date(verificationCode.lockedUntil).getTime() - now.getTime()) / 1000)),
    };
  }

  if (verificationCode.codeHash !== codeHash) {
    const nextAttemptCount = verificationCode.attemptCount + 1;
    const shouldLockCode = nextAttemptCount >= authConfig.verifyCodeMaxAttempts;
    const lockedUntil = shouldLockCode ? new Date(now.getTime() + authConfig.verifyCodeLockoutSeconds * 1000).toISOString() : null;

    await env.SPARKPOST_DB.prepare(
      `UPDATE email_verification_codes SET attempt_count = ?, locked_until = ?, updated_at = ? WHERE id = ?`,
    ).bind(nextAttemptCount, lockedUntil, now.toISOString(), verificationCode.id).run();

    if (shouldLockCode) {
      return { ok: false as const, reason: "locked", retryAfterSeconds: authConfig.verifyCodeLockoutSeconds };
    }

    return { ok: false as const, reason: "invalid" };
  }

  const markUsed = await env.SPARKPOST_DB.prepare(
    `UPDATE email_verification_codes SET used_at = ?, updated_at = ? WHERE id = ?
     AND used_at IS NULL AND (locked_until IS NULL OR locked_until <= ?)`,
  ).bind(now.toISOString(), now.toISOString(), verificationCode.id, now.toISOString()).run();

  if ((markUsed.meta?.changes ?? 0) !== 1) {
    return { ok: false as const, reason: "invalid" };
  }

  let user = await env.SPARKPOST_DB.prepare(
    `SELECT id, email, created_at AS createdAt, email_verified_at AS emailVerifiedAt, last_login_at AS lastLoginAt
     FROM users WHERE email = ? LIMIT 1`,
  ).bind(email).first<UserRow>();

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const userId = crypto.randomUUID();
    await env.SPARKPOST_DB.prepare(
      `INSERT INTO users (id, email, email_verified_at, last_login_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(userId, email, now.toISOString(), now.toISOString(), now.toISOString(), now.toISOString()).run();
    user = { id: userId, email, createdAt: now.toISOString(), emailVerifiedAt: now.toISOString(), lastLoginAt: now.toISOString() };
  } else {
    const nextVerifiedAt = user.emailVerifiedAt ?? now.toISOString();
    await env.SPARKPOST_DB.prepare(
      `UPDATE users SET email_verified_at = ?, last_login_at = ?, updated_at = ? WHERE id = ?`,
    ).bind(nextVerifiedAt, now.toISOString(), now.toISOString(), user.id).run();
    user = { ...user, emailVerifiedAt: nextVerifiedAt, lastLoginAt: now.toISOString() };
  }

  const existingCreditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(user.id).first<{ balance: number }>();

  if (!existingCreditAccount) {
    await env.SPARKPOST_DB.prepare(
      `INSERT INTO credit_accounts (id, user_id, balance, currency, created_at, updated_at)
       VALUES (?, ?, ?, 'credits', ?, ?)`,
    ).bind(crypto.randomUUID(), user.id, 0, now.toISOString(), now.toISOString()).run();

    if (isNewUser && authConfig.signupBonusCredits > 0) {
      await awardCreditsToUser(user.id, env, {
        amount: authConfig.signupBonusCredits,
        type: "signup_bonus",
        sourceType: "signup",
        remark: "Signup bonus",
        now,
      });
    }
  }

  await reconcileExpiredCreditsForUser(user.id, env, now);
  const creditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(user.id).first<{ balance: number }>();

  await env.SPARKPOST_DB.prepare(
    `UPDATE email_verification_codes SET used_by_user_id = ?, updated_at = ? WHERE id = ?`,
  ).bind(user.id, now.toISOString(), verificationCode.id).run();

  return {
    ok: true as const,
    isNewUser,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      creditBalance: creditAccount?.balance ?? 0,
    },
  };
};

const getImageGenerationEndpoint = (imageConfig: ReturnType<typeof getImageConfig>) => {
  if (imageConfig.baseUrl.endsWith("/images/generations")) {
    return imageConfig.baseUrl;
  }
  return `${imageConfig.baseUrl}/images/generations`;
};

const getImageEditEndpoint = (imageConfig: ReturnType<typeof getImageConfig>) => {
  if (imageConfig.baseUrl.endsWith("/images/edits")) {
    return imageConfig.baseUrl;
  }
  return `${imageConfig.baseUrl}/images/edits`;
};

const decodeBase64Image = (value: string) => new Uint8Array(Buffer.from(value, "base64"));

const getMimeTypeFromDataUrl = (value: string) => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  return match?.[1] ?? "image/png";
};

const getBase64PayloadFromDataUrl = (value: string) => {
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match?.[1]) {
    throw new ImageGenerationProviderError("Reference image payload is invalid.");
  }

  return match[1];
};

const fetchRemoteImageBytes = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ImageGenerationProviderError("Image provider returned an unreadable image URL.");
  }
  const mimeType = response.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, mimeType };
};

const validateFavoriteGenerationInput = (input: unknown) => {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const taskId = typeof input.taskId === "string" ? input.taskId.trim() : "";
  if (!taskId) {
    return { ok: false as const, error: "Task ID is required." };
  }

  return {
    ok: true as const,
    taskId,
    isFavorite: input.isFavorite === true,
  };
};

const validatePublishGalleryInput = (input: unknown) => {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const taskId = typeof input.taskId === "string" ? input.taskId.trim() : "";
  if (!taskId) return { ok: false as const, error: "Task ID is required." };

  const title = typeof input.title === "string" ? clampText(input.title, 80) : "";
  const description = typeof input.description === "string" ? clampText(input.description, 500) : "";
  const visibility = input.visibility === "private" ? "private" : "public";

  return {
    ok: true as const,
    taskId,
    title: title || null,
    description: description || null,
    visibility,
  };
};

const validateGalleryTaskInput = (input: unknown) => {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const taskId = typeof input.taskId === "string" ? input.taskId.trim() : "";
  if (!taskId) return { ok: false as const, error: "Task ID is required." };
  return { ok: true as const, taskId };
};

const validateGalleryLikeInput = (input: unknown) => {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const galleryItemId = typeof input.galleryItemId === "string" ? input.galleryItemId.trim() : "";
  if (!galleryItemId) return { ok: false as const, error: "Gallery item ID is required." };
  if (typeof input.liked !== "boolean") return { ok: false as const, error: "liked must be a boolean." };

  return { ok: true as const, galleryItemId, liked: input.liked };
};

const sanitizeProviderMessage = (value: string) =>
  value
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, "sk-***")
    .replace(/Bearer\s+[A-Za-z0-9._-]{12,}/gi, "Bearer ***")
    .slice(0, 500);

const getProviderErrorMessage = (status: number, body: unknown) => {
  let upstreamMessage = "";
  if (isRecord(body)) {
    const error = body.error;
    if (isRecord(error) && typeof error.message === "string") upstreamMessage = error.message;
    else if (typeof body.message === "string") upstreamMessage = body.message;
    else if (typeof body.error === "string") upstreamMessage = body.error;
  }

  const detail = upstreamMessage ? ` ${sanitizeProviderMessage(upstreamMessage)}` : "";
  return `Image generation provider request failed. Upstream status ${status}.${detail}`;
};

const callOfficialImageProvider = async (
  prompt: string,
  imageConfig: ResolvedImageConfig,
  size: ImageSize,
): Promise<ProviderResult> => {
  if (imageConfig.status !== "available") {
    throw new ImageGenerationConfigError("Image generation provider is not configured.");
  }

  const response = await fetch(getImageGenerationEndpoint(imageConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${imageConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: imageConfig.model,
      prompt,
      size,
      ...(imageConfig.defaultQuality ? { quality: imageConfig.defaultQuality } : {}),
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; data?: Array<{ b64_json?: string; url?: string }> }
    | null;

  if (!response.ok) {
    console.error("Image provider request failed.", { status: response.status, body });
    throw new ImageGenerationProviderError(getProviderErrorMessage(response.status, body));
  }

  const imageData = body?.data?.[0];
  if (imageData?.b64_json) {
    return {
      bytes: decodeBase64Image(imageData.b64_json),
      mimeType: "image/png",
      model: imageConfig.model,
    };
  }

  if (imageData?.url) {
    const remoteImage = await fetchRemoteImageBytes(imageData.url);
    return { bytes: remoteImage.bytes, mimeType: remoteImage.mimeType, model: imageConfig.model };
  }

  throw new ImageGenerationProviderError("Image provider returned no image data.");
};

const callOfficialImageEditProvider = async (
  prompt: string,
  referenceImages: string[],
  imageConfig: ResolvedImageConfig,
  size: ImageSize,
): Promise<ProviderResult> => {
  if (imageConfig.status !== "available") {
    throw new ImageGenerationConfigError("Image generation provider is not configured.");
  }

  const endpoint = getImageEditEndpoint(imageConfig);
  const buildMultipartPayload = (fieldName: "image" | "image[]") => {
    const formData = new FormData();
    formData.set("model", imageConfig.model);
    formData.set("prompt", prompt);
    formData.set("size", size);

    referenceImages.forEach((imageUrl, index) => {
      const mimeType = getMimeTypeFromDataUrl(imageUrl);
      const extension = getFileExtensionFromMimeType(mimeType);
      const bytes = decodeBase64Image(getBase64PayloadFromDataUrl(imageUrl));
      const file = new File([bytes], `reference-${index + 1}.${extension}`, {
        type: mimeType,
      });
      formData.append(fieldName, file);
    });

    return formData;
  };

  const executeRequest = async (payload: FormData) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageConfig.apiKey}`,
      },
      body: payload,
    });

    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string }; data?: Array<{ b64_json?: string; url?: string }> }
      | null;

    return { response, body };
  };

  let { response, body } = await executeRequest(buildMultipartPayload("image"));
  if (!response.ok && referenceImages.length > 1) {
    const fallbackResult = await executeRequest(buildMultipartPayload("image[]"));
    response = fallbackResult.response;
    body = fallbackResult.body;
  }

  if (!response.ok) {
    console.error("Image edit provider request failed.", { status: response.status, body });
    throw new ImageGenerationProviderError(getProviderErrorMessage(response.status, body));
  }

  const imageData = body?.data?.[0];
  if (imageData?.b64_json) {
    return {
      bytes: decodeBase64Image(imageData.b64_json),
      mimeType: "image/png",
      model: imageConfig.model,
    };
  }

  if (imageData?.url) {
    const remoteImage = await fetchRemoteImageBytes(imageData.url);
    return { bytes: remoteImage.bytes, mimeType: remoteImage.mimeType, model: imageConfig.model };
  }

  throw new ImageGenerationProviderError("Image provider returned no image data.");
};

const generateProviderImage = async (
  prompt: string,
  env: Env,
  options?: { mode?: ImageMode; modelId?: string; referenceImages?: string[]; size?: ImageSize },
) => {
  const imageConfig = getImageConfig(env, options?.modelId);
  const size = options?.size ?? imageConfig.defaultSize;
  if (!imageConfig.supportedSizes.includes(size)) {
    throw new ImageGenerationConfigError(`Selected image model does not support size ${size}.`);
  }
  if (!imageConfig.supports[options?.mode ?? "t2i"]) {
    throw new ImageGenerationConfigError(`Selected image model does not support ${options?.mode ?? "t2i"}.`);
  }
  if (["official", "relay"].includes(imageConfig.backend)) {
    if (options?.mode === "i2i") {
      return callOfficialImageEditProvider(prompt, options.referenceImages ?? [], imageConfig, size);
    }
    return callOfficialImageProvider(prompt, imageConfig, size);
  }
  throw new ImageGenerationConfigError(`Unsupported IMAGE_BACKEND: ${imageConfig.backend}`);
};

const getFileExtensionFromMimeType = (mimeType: string) => {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType === "image/jpeg") return "jpg";
  if (normalizedMimeType === "image/webp") return "webp";
  if (normalizedMimeType === "image/gif") return "gif";
  return "png";
};

const createAssetResponseUrl = (request: Request, key: string) => {
  const origin = new URL(request.url).origin;
  return `${origin}/api/assets/${key}`;
};

const createRelativeAssetResponseUrl = (key: string) => `/api/assets/${key}`;

const readUint32BigEndian = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] ?? 0) << 24) |
  ((bytes[offset + 1] ?? 0) << 16) |
  ((bytes[offset + 2] ?? 0) << 8) |
  (bytes[offset + 3] ?? 0);

const readUint16BigEndian = (bytes: Uint8Array, offset: number) =>
  ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);

const readUint16LittleEndian = (bytes: Uint8Array, offset: number) =>
  (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);

const parsePngDimensions = (bytes: Uint8Array) => {
  const hasPngSignature =
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (!hasPngSignature) return null;

  const width = readUint32BigEndian(bytes, 16);
  const height = readUint32BigEndian(bytes, 20);
  return width > 0 && height > 0 ? { width, height } : null;
};

const parseJpegDimensions = (bytes: Uint8Array) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 2 > bytes.length) break;

    const segmentLength = readUint16BigEndian(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && segmentLength >= 7) {
      const height = readUint16BigEndian(bytes, offset + 3);
      const width = readUint16BigEndian(bytes, offset + 5);
      return width > 0 && height > 0 ? { width, height } : null;
    }

    offset += segmentLength;
  }

  return null;
};

const parseWebpDimensions = (bytes: Uint8Array) => {
  const textDecoder = new TextDecoder("ascii");
  if (bytes.length < 30 || textDecoder.decode(bytes.slice(0, 4)) !== "RIFF" || textDecoder.decode(bytes.slice(8, 12)) !== "WEBP") {
    return null;
  }

  const chunkType = textDecoder.decode(bytes.slice(12, 16));
  if (chunkType === "VP8X" && bytes.length >= 30) {
    const width = 1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16);
    const height = 1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (chunkType === "VP8 " && bytes.length >= 30) {
    const width = readUint16LittleEndian(bytes, 26) & 0x3fff;
    const height = readUint16LittleEndian(bytes, 28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (chunkType === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21] ?? 0;
    const b1 = bytes[22] ?? 0;
    const b2 = bytes[23] ?? 0;
    const b3 = bytes[24] ?? 0;
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return width > 0 && height > 0 ? { width, height } : null;
  }

  return null;
};

const getImageDimensions = (bytes: Uint8Array, mimeType: string) => {
  const normalizedMimeType = mimeType.toLowerCase();
  if (normalizedMimeType.includes("png")) return parsePngDimensions(bytes);
  if (normalizedMimeType.includes("jpeg") || normalizedMimeType.includes("jpg")) return parseJpegDimensions(bytes);
  if (normalizedMimeType.includes("webp")) return parseWebpDimensions(bytes);
  return parsePngDimensions(bytes) ?? parseJpegDimensions(bytes) ?? parseWebpDimensions(bytes);
};

const persistGeneratedAsset = async (
  request: Request,
  env: Env,
  userId: string,
  taskId: string,
  providerResult: ProviderResult,
  options?: { useRelativeUrl?: boolean },
): Promise<StoredAsset> => {
  if (!env.SPARKPOST_R2) {
    throw new ImageGenerationConfigError("R2 binding SPARKPOST_R2 is not configured.");
  }

  const assetId = crypto.randomUUID();
  const fileExtension = getFileExtensionFromMimeType(providerResult.mimeType);
  const key = `${GENERATED_ASSET_PREFIX}/${userId}/${taskId}/${assetId}.${fileExtension}`;
  const dimensions = getImageDimensions(providerResult.bytes, providerResult.mimeType);

  await env.SPARKPOST_R2.put(key, providerResult.bytes, {
    httpMetadata: {
      contentType: providerResult.mimeType,
    },
  });

  return {
    assetId,
    fileUrl: options?.useRelativeUrl ? createRelativeAssetResponseUrl(key) : createAssetResponseUrl(request, key),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  };
};

const persistReferenceImages = async (
  env: Env,
  userId: string,
  taskId: string,
  referenceImages: string[],
) => {
  if (!env.SPARKPOST_R2) {
    throw new ImageGenerationConfigError("R2 binding SPARKPOST_R2 is not configured.");
  }

  const keys: string[] = [];
  for (const [index, imageUrl] of referenceImages.entries()) {
    const mimeType = getMimeTypeFromDataUrl(imageUrl);
    const extension = getFileExtensionFromMimeType(mimeType);
    const bytes = decodeBase64Image(getBase64PayloadFromDataUrl(imageUrl));
    const key = `${GENERATED_ASSET_PREFIX}/${userId}/${taskId}/references/reference-${index + 1}.${extension}`;
    await env.SPARKPOST_R2.put(key, bytes, {
      httpMetadata: {
        contentType: mimeType,
      },
    });
    keys.push(key);
  }
  return keys;
};

const loadReferenceImages = async (env: Env, referenceKeys: string[]) => {
  if (!env.SPARKPOST_R2) {
    throw new ImageGenerationConfigError("R2 binding SPARKPOST_R2 is not configured.");
  }

  const referenceImages: string[] = [];
  for (const key of referenceKeys) {
    const object = await env.SPARKPOST_R2.get(key);
    if (!object?.body) {
      throw new ImageGenerationProviderError("A reference image for this task is no longer available.");
    }
    const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
    const mimeType = object.httpMetadata?.contentType || "image/png";
    referenceImages.push(`data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`);
  }
  return referenceImages;
};

const getGeneratedAssetResponse = async (_request: Request, env: Env, url: URL) => {
  if (!env.SPARKPOST_R2) {
    return json({ error: "Object storage is not configured." }, { status: 503 });
  }

  const encodedKey = url.pathname.slice("/api/assets/".length);
  const assetKey = decodeURIComponent(encodedKey);

  if (!assetKey || !assetKey.startsWith(`${GENERATED_ASSET_PREFIX}/`)) {
    return json({ error: "Asset not found." }, { status: 404 });
  }

  const object = await env.SPARKPOST_R2.get(assetKey);
  if (!object || !object.body) {
    return json({ error: "Asset not found." }, { status: 404 });
  }

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") {
    object.writeHttpMetadata(headers);
  }
  headers.set("content-type", object.httpMetadata?.contentType || headers.get("content-type") || "image/png");
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { status: 200, headers });
};

const generateTextToImageForUser = async (
  request: Request,
  userId: string,
  prompt: string,
  env: Env,
  modelId?: string,
  size?: ImageSize,
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const imageConfig = getImageConfig(env, modelId);
  const requestedSize = size ?? imageConfig.defaultSize;
  const now = new Date();
  const compiledPrompt = prompt;
  await reconcileExpiredCreditsForUser(userId, env, now);
  const creditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!creditAccount) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  if (creditAccount.balance < imageConfig.textToImageCost) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const taskId = crypto.randomUUID();
  await env.SPARKPOST_DB.prepare(
    `INSERT INTO generation_tasks (
       id, user_id, task_type, status, prompt, compiled_prompt, requested_size, model, cost_credits, created_at
     ) VALUES (?, ?, 'text_to_image', 'running', ?, ?, ?, ?, ?, ?)`,
  ).bind(
    taskId,
    userId,
    prompt,
    compiledPrompt,
    requestedSize,
    imageConfig.model,
    imageConfig.textToImageCost,
    now.toISOString(),
  ).run();

  try {
    const providerResult = await generateProviderImage(compiledPrompt, env, { mode: "t2i", modelId, size: requestedSize });
    const storedAsset = await persistGeneratedAsset(request, env, userId, taskId, providerResult);
    const completedAt = new Date();
    const remainingCredits = await spendCreditsForUser(userId, env, {
      amount: imageConfig.textToImageCost,
      type: "text_to_image",
      relatedTaskId: taskId,
      remark: prompt.slice(0, 120),
      now: completedAt,
    });

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO generated_assets (
         id, task_id, asset_type, file_url, width, height, created_at
       ) VALUES (?, ?, 'image', ?, ?, ?, ?)`,
    ).bind(storedAsset.assetId, taskId, storedAsset.fileUrl, storedAsset.width, storedAsset.height, completedAt.toISOString()).run();

    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'succeeded', model = ?, completed_at = ? WHERE id = ?`,
    ).bind(providerResult.model, completedAt.toISOString(), taskId).run();

      const task = await env.SPARKPOST_DB.prepare(
       `SELECT id, status, prompt, compiled_prompt AS compiledPrompt, requested_size AS requestedSize, created_at AS createdAt, completed_at AS completedAt, model, cost_credits AS costCredits
        FROM generation_tasks WHERE id = ? LIMIT 1`,
      ).bind(taskId).first<GenerationTaskRow>();

    return {
      id: task?.id ?? taskId,
      status: task?.status ?? "succeeded",
      prompt: task?.prompt ?? prompt,
      requestedSize: task?.requestedSize ?? requestedSize,
      createdAt: task?.createdAt ?? now.toISOString(),
      completedAt: task?.completedAt ?? completedAt.toISOString(),
      model: task?.model ?? providerResult.model,
      costCredits: task?.costCredits ?? imageConfig.textToImageCost,
      remainingCredits,
      assets: [
        {
          id: storedAsset.assetId,
          fileUrl: storedAsset.fileUrl,
          width: storedAsset.width,
          height: storedAsset.height,
        },
      ],
    };
  } catch (error) {
    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
    ).bind(error instanceof Error ? error.message : "Image generation failed.", new Date().toISOString(), taskId).run();
    throw error;
  }
};

const generateImageToImageForUser = async (
  request: Request,
  userId: string,
  prompt: string,
  referenceImages: string[],
  env: Env,
  modelId?: string,
  size?: ImageSize,
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const imageConfig = getImageConfig(env, modelId);
  const requestedSize = size ?? imageConfig.defaultSize;
  const now = new Date();
  const compiledPrompt = compileImageToImagePrompt(prompt, referenceImages.length);
  await reconcileExpiredCreditsForUser(userId, env, now);
  const creditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!creditAccount) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  if (creditAccount.balance < imageConfig.imageToImageCost) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const taskId = crypto.randomUUID();
  await env.SPARKPOST_DB.prepare(
    `INSERT INTO generation_tasks (
       id, user_id, task_type, status, prompt, compiled_prompt, requested_size, model, cost_credits, input_image_url, created_at
     ) VALUES (?, ?, 'image_to_image', 'running', ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      taskId,
      userId,
      prompt,
      compiledPrompt,
      requestedSize,
      imageConfig.model,
      imageConfig.imageToImageCost,
      `inline:${getMimeTypeFromDataUrl(referenceImages[0])}`,
      now.toISOString(),
    ).run();

  try {
    const providerResult = await generateProviderImage(compiledPrompt, env, {
      mode: "i2i",
      modelId,
      size: requestedSize,
      referenceImages,
    });
    const storedAsset = await persistGeneratedAsset(request, env, userId, taskId, providerResult);
    const completedAt = new Date();
    const remainingCredits = await spendCreditsForUser(userId, env, {
      amount: imageConfig.imageToImageCost,
      type: "image_to_image",
      relatedTaskId: taskId,
      remark: prompt.slice(0, 120),
      now: completedAt,
    });

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO generated_assets (
         id, task_id, asset_type, file_url, width, height, created_at
       ) VALUES (?, ?, 'image', ?, ?, ?, ?)`,
    ).bind(storedAsset.assetId, taskId, storedAsset.fileUrl, storedAsset.width, storedAsset.height, completedAt.toISOString()).run();

    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'succeeded', model = ?, completed_at = ? WHERE id = ?`,
    ).bind(providerResult.model, completedAt.toISOString(), taskId).run();

      const task = await env.SPARKPOST_DB.prepare(
       `SELECT id, status, prompt, compiled_prompt AS compiledPrompt, requested_size AS requestedSize, created_at AS createdAt, completed_at AS completedAt, model, cost_credits AS costCredits
        FROM generation_tasks WHERE id = ? LIMIT 1`,
      ).bind(taskId).first<GenerationTaskRow>();

    return {
      id: task?.id ?? taskId,
      status: task?.status ?? "succeeded",
      prompt: task?.prompt ?? prompt,
      requestedSize: task?.requestedSize ?? requestedSize,
      createdAt: task?.createdAt ?? now.toISOString(),
      completedAt: task?.completedAt ?? completedAt.toISOString(),
      model: task?.model ?? providerResult.model,
      costCredits: task?.costCredits ?? imageConfig.imageToImageCost,
      remainingCredits,
      assets: [
        {
          id: storedAsset.assetId,
          fileUrl: storedAsset.fileUrl,
          width: storedAsset.width,
          height: storedAsset.height,
        },
      ],
    };
  } catch (error) {
    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
    ).bind(error instanceof Error ? error.message : "Image generation failed.", new Date().toISOString(), taskId).run();
    throw error;
  }
};

const mapGenerationTaskResponse = (
  task: GenerationTaskDetailRow | GenerationTaskRow,
  assets: Array<{ id: string; fileUrl: string; width: number | null; height: number | null }>,
  remainingCredits: number,
) => ({
  id: task.id,
  status: task.status,
  prompt: task.prompt,
  requestedSize: task.requestedSize ?? null,
  createdAt: task.createdAt,
  completedAt: task.completedAt ?? null,
  model: task.model ?? null,
  costCredits: task.costCredits,
  errorMessage: "errorMessage" in task ? task.errorMessage ?? null : null,
  isFavorite: Boolean("isFavorite" in task ? task.isFavorite : false),
  remainingCredits,
  assets,
});

const getTaskAssets = async (env: Env, taskId: string) => {
  if (!env.SPARKPOST_DB) return [];
  const result = await env.SPARKPOST_DB.prepare(
    `SELECT id, file_url AS fileUrl, width, height
     FROM generated_assets
     WHERE task_id = ?
     ORDER BY created_at ASC`,
  ).bind(taskId).all<{ id: string; fileUrl: string; width: number | null; height: number | null }>();
  return result.results ?? [];
};

const getGenerationTaskDetail = async (env: Env, taskId: string) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }
  await ensureGenerationFavoriteColumn(env);

  return env.SPARKPOST_DB.prepare(
    `SELECT
       id,
       user_id AS userId,
       task_type AS taskType,
       status,
       prompt,
       compiled_prompt AS compiledPrompt,
       input_image_url AS inputImageUrl,
       input_reference_keys AS inputReferenceKeys,
       requested_size AS requestedSize,
       created_at AS createdAt,
       completed_at AS completedAt,
       model,
       cost_credits AS costCredits,
       error_message AS errorMessage,
       COALESCE(is_favorite, 0) AS isFavorite
     FROM generation_tasks
     WHERE id = ?
     LIMIT 1`,
  ).bind(taskId).first<GenerationTaskDetailRow>();
};

const getCreditBalanceForUser = async (userId: string, env: Env) => {
  if (!env.SPARKPOST_DB) return 0;
  const account = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();
  return account?.balance ?? 0;
};

const getReferenceKeysFromTask = (task: GenerationTaskDetailRow) => {
  if (!task.inputReferenceKeys) return [];
  try {
    const parsed = JSON.parse(task.inputReferenceKeys);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const resolveModelIdFromTask = (task: GenerationTaskDetailRow) => {
  const normalizedModel = task.model?.trim().toLowerCase();
  if (!normalizedModel) return undefined;
  return IMAGE_MODEL_ALIAS_MAP[normalizedModel] ?? (IMAGE_MODEL_REGISTRY[normalizedModel] ? normalizedModel : undefined);
};

const createQueuedImageGenerationTask = async (
  userId: string,
  input: Extract<ReturnType<typeof validateGenerateImageInput>, { ok: true }>,
  env: Env,
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }
  if (!env.IMAGE_GENERATION_QUEUE) {
    throw new ImageGenerationConfigError("Queue binding IMAGE_GENERATION_QUEUE is not configured.");
  }

  const imageConfig = getImageConfig(env, input.modelId);
  const requestedSize = input.size ?? imageConfig.defaultSize;
  const now = new Date();
  const taskId = crypto.randomUUID();
  const isImageToImage = input.mode === "i2i";
  const costCredits = isImageToImage ? imageConfig.imageToImageCost : imageConfig.textToImageCost;
  const compiledPrompt = isImageToImage
    ? compileImageToImagePrompt(input.prompt, input.referenceImages.length)
    : input.prompt;

  await reconcileExpiredCreditsForUser(userId, env, now);
  const creditAccount = await env.SPARKPOST_DB.prepare(
    `SELECT balance FROM credit_accounts WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<{ balance: number }>();

  if (!creditAccount) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }
  if (creditAccount.balance < costCredits) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const referenceKeys = isImageToImage
    ? await persistReferenceImages(env, userId, taskId, input.referenceImages)
    : [];

  await env.SPARKPOST_DB.prepare(
    `INSERT INTO generation_tasks (
       id, user_id, task_type, status, prompt, compiled_prompt, requested_size, model, cost_credits, input_image_url, input_reference_keys, created_at
     ) VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    taskId,
    userId,
    isImageToImage ? "image_to_image" : "text_to_image",
    input.prompt,
    compiledPrompt,
    requestedSize,
    imageConfig.model,
    costCredits,
    isImageToImage && input.referenceImages[0] ? `inline:${getMimeTypeFromDataUrl(input.referenceImages[0])}` : null,
    referenceKeys.length > 0 ? JSON.stringify(referenceKeys) : null,
    now.toISOString(),
  ).run();

  await env.IMAGE_GENERATION_QUEUE.send({ taskId, userId });

  return mapGenerationTaskResponse(
    {
      id: taskId,
      userId,
      taskType: isImageToImage ? "image_to_image" : "text_to_image",
      status: "queued",
      prompt: input.prompt,
      compiledPrompt,
      inputImageUrl: null,
      inputReferenceKeys: referenceKeys.length > 0 ? JSON.stringify(referenceKeys) : null,
      requestedSize,
      createdAt: now.toISOString(),
      completedAt: null,
      model: imageConfig.model,
      costCredits,
      errorMessage: null,
      isFavorite: false,
    },
    [],
    creditAccount.balance,
  );
};

const processQueuedImageGenerationTask = async (taskId: string, userId: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const task = await getGenerationTaskDetail(env, taskId);
  if (!task || task.userId !== userId) return;
  if (task.status === "succeeded" || task.status === "failed") return;

  await env.SPARKPOST_DB.prepare(
    `UPDATE generation_tasks SET status = 'running' WHERE id = ? AND status IN ('queued', 'running')`,
  ).bind(taskId).run();

  try {
    const mode: ImageMode = task.taskType === "image_to_image" ? "i2i" : "t2i";
    const modelId = resolveModelIdFromTask(task);
    const requestedSize = task.requestedSize ? (task.requestedSize as ImageSize) : undefined;
    const referenceImages = mode === "i2i" ? await loadReferenceImages(env, getReferenceKeysFromTask(task)) : [];
    const providerResult = await generateProviderImage(task.compiledPrompt ?? task.prompt, env, {
      mode,
      modelId,
      size: requestedSize,
      referenceImages,
    });
    const storedAsset = await persistGeneratedAsset(new Request("https://sparkpost.local"), env, userId, taskId, providerResult, {
      useRelativeUrl: true,
    });
    const completedAt = new Date();
    const remainingCredits = await spendCreditsForUser(userId, env, {
      amount: task.costCredits,
      type: task.taskType,
      relatedTaskId: taskId,
      remark: task.prompt.slice(0, 120),
      now: completedAt,
    });

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO generated_assets (
         id, task_id, asset_type, file_url, width, height, created_at
       ) VALUES (?, ?, 'image', ?, ?, ?, ?)`,
    ).bind(storedAsset.assetId, taskId, storedAsset.fileUrl, storedAsset.width, storedAsset.height, completedAt.toISOString()).run();

    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'succeeded', model = ?, completed_at = ? WHERE id = ?`,
    ).bind(providerResult.model, completedAt.toISOString(), taskId).run();

    return remainingCredits;
  } catch (error) {
    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?`,
    ).bind(error instanceof Error ? error.message : "Image generation failed.", new Date().toISOString(), taskId).run();
    throw error;
  }
};

const buildSessionCookie = async (userId: string, email: string, env: Env) => {
  const authConfig = getAuthConfig(env);
  const token = await createSessionToken(userId, email, env);
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    `Path=${SESSION_COOKIE_PATH}`,
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${authConfig.sessionTtlDays * 24 * 60 * 60}`,
  ].join("; ");
};

const buildLogoutCookie = () => [
  `${SESSION_COOKIE_NAME}=`,
  `Path=${SESSION_COOKIE_PATH}`,
  "HttpOnly",
  "Secure",
  "SameSite=None",
  "Max-Age=0",
].join("; ");

const getImageStatusPayload = (env: Env) => {
  const imageConfig = getImageConfig(env);
  return {
    status: imageConfig.status,
    model: imageConfig.model,
    modelId: imageConfig.modelId,
    label: imageConfig.label,
  };
};

const getImageModelsPayload = (env: Env) => {
  const defaultModelId = getDefaultImageModelId(env);
  return {
    ok: true,
    defaultModelId,
    items: Object.values(IMAGE_MODEL_REGISTRY).map((item) => {
      const itemConfig = getImageConfig(env, item.id);
      return {
        id: item.id,
        label: item.label,
        provider: item.provider,
        model: itemConfig.model,
        supports: item.supports,
        isDefault: item.id === defaultModelId,
        supportedSizes: item.supportedSizes,
        defaultSize: item.defaultSize,
        status: itemConfig.status,
        code: itemConfig.statusCode ?? null,
        message: itemConfig.statusMessage ?? null,
        costCredits: {
          t2i: item.supports.t2i ? itemConfig.textToImageCost : null,
          i2i: item.supports.i2i ? itemConfig.imageToImageCost : null,
        },
      };
    }),
  };
};

const mapGalleryItem = (row: GalleryItemRow): GalleryItem => ({
  id: row.id,
  taskId: row.taskId,
  title: row.title,
  description: row.description,
  visibility: row.visibility,
  likeCount: row.likeCount,
  remixCount: row.remixCount,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  task: {
    taskType: row.taskType,
    prompt: row.prompt,
    requestedSize: row.requestedSize,
    model: row.model,
    completedAt: row.completedAt,
  },
  author: {
    id: row.userId,
    displayName: getPublicAuthorName(row.authorName, row.authorEmail),
  },
  asset:
    row.assetId && row.fileUrl
      ? {
          id: row.assetId,
          fileUrl: row.fileUrl,
          width: row.width,
          height: row.height,
        }
      : null,
  likedByMe: Boolean(row.likedByMe),
});

const getGalleryItemByTaskId = async (env: Env, taskId: string, viewerId: string | null) => {
  if (!env.SPARKPOST_DB) return null;
  await ensureGalleryTables(env);
  const row = await env.SPARKPOST_DB.prepare(
    `SELECT
       gi.id,
       gi.task_id AS taskId,
       gi.user_id AS userId,
       gi.title,
       gi.description,
       gi.visibility,
       gi.like_count AS likeCount,
       gi.remix_count AS remixCount,
       gi.created_at AS createdAt,
       gi.updated_at AS updatedAt,
       gt.task_type AS taskType,
       gt.prompt,
       gt.requested_size AS requestedSize,
       gt.model,
       gt.completed_at AS completedAt,
       users.name AS authorName,
       users.email AS authorEmail,
       ga.id AS assetId,
       ga.file_url AS fileUrl,
       ga.width,
       ga.height,
       CASE WHEN gl.user_id IS NULL THEN 0 ELSE 1 END AS likedByMe
     FROM gallery_items gi
     INNER JOIN generation_tasks gt ON gt.id = gi.task_id
     INNER JOIN users ON users.id = gi.user_id
     LEFT JOIN generated_assets ga ON ga.id = (
       SELECT id FROM generated_assets WHERE task_id = gi.task_id ORDER BY created_at ASC LIMIT 1
     )
     LEFT JOIN gallery_likes gl ON gl.gallery_item_id = gi.id AND gl.user_id = ?
     WHERE gi.task_id = ?
     LIMIT 1`,
  ).bind(viewerId ?? "", taskId).first<GalleryItemRow>();

  return row ? mapGalleryItem(row) : null;
};

const getGalleryItems = async (
  env: Env,
  options: { limit: number; offset: number; sort: GallerySort; scope: "public" | "mine"; viewerId: string | null },
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }
  await ensureGalleryTables(env);

  const clauses = options.scope === "mine" ? ["gi.user_id = ?"] : ["gi.visibility = 'public'"];
  const values: Array<string | number> = [];
  if (options.scope === "mine") values.push(options.viewerId ?? "");

  const orderBy =
    options.sort === "popular"
      ? "gi.like_count DESC, gi.created_at DESC"
      : "gi.created_at DESC";
  values.push(options.viewerId ?? "", options.limit + 1, options.offset);

  const result = await env.SPARKPOST_DB.prepare(
    `SELECT
       gi.id,
       gi.task_id AS taskId,
       gi.user_id AS userId,
       gi.title,
       gi.description,
       gi.visibility,
       gi.like_count AS likeCount,
       gi.remix_count AS remixCount,
       gi.created_at AS createdAt,
       gi.updated_at AS updatedAt,
       gt.task_type AS taskType,
       gt.prompt,
       gt.requested_size AS requestedSize,
       gt.model,
       gt.completed_at AS completedAt,
       users.name AS authorName,
       users.email AS authorEmail,
       ga.id AS assetId,
       ga.file_url AS fileUrl,
       ga.width,
       ga.height,
       CASE WHEN gl.user_id IS NULL THEN 0 ELSE 1 END AS likedByMe
     FROM gallery_items gi
     INNER JOIN generation_tasks gt ON gt.id = gi.task_id
     INNER JOIN users ON users.id = gi.user_id
     LEFT JOIN generated_assets ga ON ga.id = (
       SELECT id FROM generated_assets WHERE task_id = gi.task_id ORDER BY created_at ASC LIMIT 1
     )
     LEFT JOIN gallery_likes gl ON gl.gallery_item_id = gi.id AND gl.user_id = ?
     WHERE ${clauses.join(" AND ")}
     ORDER BY ${orderBy}
     LIMIT ?
     OFFSET ?`,
  ).bind(...values).all<GalleryItemRow>();

  const rows = result.results ?? [];
  const items = rows.slice(0, options.limit).map(mapGalleryItem);
  return {
    items,
    hasMore: rows.length > options.limit,
    nextOffset: options.offset + items.length,
  };
};

const getGenerationTaskStatusResponse = async (request: Request, env: Env, url: URL) => {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });

  const taskId = decodeURIComponent(url.pathname.slice("/api/generate/tasks/".length));
  if (!taskId) return json({ error: "Task ID is required." }, { status: 400 });

  const task = await getGenerationTaskDetail(env, taskId);
  if (!task || task.userId !== authenticatedUser.user.id) {
    return json({ error: "Task not found." }, { status: 404 });
  }

  const [assets, remainingCredits] = await Promise.all([
    getTaskAssets(env, taskId),
    getCreditBalanceForUser(authenticatedUser.user.id, env),
  ]);

  return json({ ok: true, task: mapGenerationTaskResponse(task, assets, remainingCredits) });
};

const updateGenerationFavoriteResponse = async (request: Request, env: Env) => {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });
  if (!env.SPARKPOST_DB) return json({ error: "Generation history is temporarily unavailable." }, { status: 503 });

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
  const input = validateFavoriteGenerationInput(bodyResult.body);
  if (!input.ok) return json({ error: input.error }, { status: 400 });

  const task = await getGenerationTaskDetail(env, input.taskId);
  if (!task || task.userId !== authenticatedUser.user.id) {
    return json({ error: "Task not found." }, { status: 404 });
  }

  await env.SPARKPOST_DB.prepare(
    `UPDATE generation_tasks SET is_favorite = ? WHERE id = ? AND user_id = ?`,
  ).bind(input.isFavorite ? 1 : 0, input.taskId, authenticatedUser.user.id).run();

  return json({ ok: true, taskId: input.taskId, isFavorite: input.isFavorite });
};

const getGalleryResponse = async (request: Request, env: Env, url: URL, scope: "public" | "mine") => {
  if (!env.SPARKPOST_DB) return json({ error: "Gallery is temporarily unavailable." }, { status: 503 });

  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (scope === "mine" && !authenticatedUser.user) {
    return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });
  }

  const limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10);
  const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
  const sort = url.searchParams.get("sort") === "popular" ? "popular" : "latest";
  const page = await getGalleryItems(env, {
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 60) : 24,
    offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
    sort,
    scope,
    viewerId: authenticatedUser.user?.id ?? null,
  });

  return json({ ok: true, ...page });
};

const publishGalleryItemResponse = async (request: Request, env: Env) => {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });
  if (!env.SPARKPOST_DB) return json({ error: "Gallery is temporarily unavailable." }, { status: 503 });

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
  const input = validatePublishGalleryInput(bodyResult.body);
  if (!input.ok) return json({ error: input.error }, { status: 400 });

  const task = await getGenerationTaskDetail(env, input.taskId);
  if (!task || task.userId !== authenticatedUser.user.id) {
    return json({ error: "Task not found." }, { status: 404 });
  }
  if (task.status !== "succeeded") {
    return json({ error: "Only completed generations can be published." }, { status: 400 });
  }

  const assets = await getTaskAssets(env, task.id);
  if (assets.length === 0) {
    return json({ error: "Generation has no image asset to publish." }, { status: 400 });
  }

  await ensureGalleryTables(env);
  const now = new Date().toISOString();
  await env.SPARKPOST_DB.prepare(
    `INSERT INTO gallery_items (
       id, task_id, user_id, title, description, visibility, like_count, remix_count, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
     ON CONFLICT(task_id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       visibility = excluded.visibility,
       updated_at = excluded.updated_at`,
  ).bind(
    crypto.randomUUID(),
    input.taskId,
    authenticatedUser.user.id,
    input.title,
    input.description,
    input.visibility,
    now,
    now,
  ).run();

  const item = await getGalleryItemByTaskId(env, input.taskId, authenticatedUser.user.id);
  return json({ ok: true, item: item ?? null });
};

const unpublishGalleryItemResponse = async (request: Request, env: Env) => {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });
  if (!env.SPARKPOST_DB) return json({ error: "Gallery is temporarily unavailable." }, { status: 503 });

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
  const input = validateGalleryTaskInput(bodyResult.body);
  if (!input.ok) return json({ error: input.error }, { status: 400 });

  await ensureGalleryTables(env);
  const result = await env.SPARKPOST_DB.prepare(
    `DELETE FROM gallery_items WHERE task_id = ? AND user_id = ?`,
  ).bind(input.taskId, authenticatedUser.user.id).run();

  return json({ ok: true, taskId: input.taskId, unpublished: (result.meta?.changes ?? 0) > 0 });
};

const updateGalleryLikeResponse = async (request: Request, env: Env) => {
  const authenticatedUser = await getAuthenticatedUser(request, env);
  if (!authenticatedUser.ok) return authenticatedUser.response;
  if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });
  if (!env.SPARKPOST_DB) return json({ error: "Gallery is temporarily unavailable." }, { status: 503 });

  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
  const input = validateGalleryLikeInput(bodyResult.body);
  if (!input.ok) return json({ error: input.error }, { status: 400 });

  await ensureGalleryTables(env);
  const item = await env.SPARKPOST_DB.prepare(
    `SELECT id FROM gallery_items WHERE id = ? AND visibility = 'public' LIMIT 1`,
  ).bind(input.galleryItemId).first<{ id: string }>();
  if (!item) return json({ error: "Gallery item not found." }, { status: 404 });

  if (input.liked) {
    await env.SPARKPOST_DB.prepare(
      `INSERT OR IGNORE INTO gallery_likes (gallery_item_id, user_id, created_at) VALUES (?, ?, ?)`,
    ).bind(input.galleryItemId, authenticatedUser.user.id, new Date().toISOString()).run();
  } else {
    await env.SPARKPOST_DB.prepare(
      `DELETE FROM gallery_likes WHERE gallery_item_id = ? AND user_id = ?`,
    ).bind(input.galleryItemId, authenticatedUser.user.id).run();
  }

  await env.SPARKPOST_DB.prepare(
    `UPDATE gallery_items
     SET like_count = (SELECT COUNT(*) FROM gallery_likes WHERE gallery_item_id = ?),
         updated_at = ?
     WHERE id = ?`,
  ).bind(input.galleryItemId, new Date().toISOString(), input.galleryItemId).run();

  const count = await env.SPARKPOST_DB.prepare(
    `SELECT like_count AS likeCount FROM gallery_items WHERE id = ? LIMIT 1`,
  ).bind(input.galleryItemId).first<{ likeCount: number }>();

  return json({
    ok: true,
    galleryItemId: input.galleryItemId,
    liked: input.liked,
    likeCount: count?.likeCount ?? 0,
  });
};

const routes: Array<{ method: string; pathname: string; handler: RouteHandler }> = [
  {
    method: "GET",
    pathname: "/api/health",
    handler: async (_request, env) => {
      const databaseState = env.SPARKPOST_DB ? "configured" : "missing";
      const assetState = env.SPARKPOST_R2 ? "configured" : "missing";
      return json({ ok: true, service: "sparkpost-workers-api", database: databaseState, objectStorage: assetState });
    },
  },
  {
    method: "GET",
    pathname: "/api/bootstrap",
    handler: async (request, env, url) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;

      const locale = url.searchParams.get("locale") === "en" ? "en" : "zh";
      const user = authenticatedUser.user;
      const creditSummary = user ? await getCreditSummaryForUser(user.id, env) : null;
      const recentCreditHistory = user
        ? await getCreditTransactionsForUser(user.id, env, { filter: "all", limit: 5, locale })
        : [];

      return json({
        ok: true,
        user,
        imageStatus: getImageStatusPayload(env),
        imageModels: getImageModelsPayload(env),
        creditSummary,
        recentCreditHistory,
      });
    },
  },
  {
    method: "GET",
    pathname: "/api/me",
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      return json({ user: authenticatedUser.user });
    },
  },
  {
    method: "GET",
    pathname: "/api/credits/summary",
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      const summary = await getCreditSummaryForUser(authenticatedUser.user.id, env);
      return json({ ok: true, ...summary });
    },
  },
  {
    method: "GET",
    pathname: "/api/credits/transactions",
    handler: async (request, env, url) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      const filter = url.searchParams.get("filter");
      const limit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
      const locale = url.searchParams.get("locale") === "en" ? "en" : "zh";
      const normalizedFilter =
        filter === "earned" || filter === "consumed" || filter === "all" ? filter : "all";
      const transactions = await getCreditTransactionsForUser(authenticatedUser.user.id, env, {
        filter: normalizedFilter,
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
        locale,
      });

      return json({ ok: true, items: transactions });
    },
  },
  {
    method: "GET",
    pathname: "/api/generations/history",
    handler: async (request, env, url) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      const limit = Number.parseInt(url.searchParams.get("limit") ?? "24", 10);
      const offset = Number.parseInt(url.searchParams.get("offset") ?? "0", 10);
      const filter = url.searchParams.get("filter");
      const normalizedFilter: GenerationHistoryFilter =
        filter === "succeeded" ||
        filter === "failed" ||
        filter === "favorites" ||
        filter === "t2i" ||
        filter === "i2i"
          ? filter
          : "all";
      const page = await getGenerationHistoryForUser(authenticatedUser.user.id, env, {
        limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 24,
        offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
        filter: normalizedFilter,
      });

      return json({ ok: true, ...page });
    },
  },
  {
    method: "POST",
    pathname: "/api/generations/favorite",
    handler: async (request, env) => updateGenerationFavoriteResponse(request, env),
  },
  {
    method: "GET",
    pathname: "/api/gallery",
    handler: async (request, env, url) => getGalleryResponse(request, env, url, "public"),
  },
  {
    method: "GET",
    pathname: "/api/gallery/mine",
    handler: async (request, env, url) => getGalleryResponse(request, env, url, "mine"),
  },
  {
    method: "POST",
    pathname: "/api/gallery/publish",
    handler: async (request, env) => publishGalleryItemResponse(request, env),
  },
  {
    method: "POST",
    pathname: "/api/gallery/unpublish",
    handler: async (request, env) => unpublishGalleryItemResponse(request, env),
  },
  {
    method: "POST",
    pathname: "/api/gallery/like",
    handler: async (request, env) => updateGalleryLikeResponse(request, env),
  },
  {
    method: "POST",
    pathname: "/api/credits/check-in",
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      const result = await performDailyCheckInForUser(authenticatedUser.user.id, env);
      return json({ ok: true, awardedCredits: result.awardedCredits, ...result.summary });
    },
  },
  {
    method: "POST",
    pathname: "/api/credits/topup/checkout",
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
      const input = validateCreateCheckoutInput(bodyResult.body);
      if (!input.ok) return json({ error: input.error }, { status: 400 });

      return json({
        ok: true,
        status: "pending_provider_integration",
        message: "Checkout provider is not connected yet.",
        package: input.creditPackage,
        checkoutRequest: {
          packageCode: input.packageCode,
          paymentProvider: input.paymentProvider,
          userId: authenticatedUser.user.id,
        },
      });
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/dev-login",
    handler: async (request, env) => {
      if (!shouldExposeDebugCode(env)) {
        return json({ error: "Not found." }, { status: 404 });
      }

      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
      const input = validateSendCodeInput(bodyResult.body);
      if (!input.ok) return json({ error: input.error }, { status: 400 });

      if (!env.SPARKPOST_DB) {
        return json({ error: "Authentication service is temporarily unavailable." }, { status: 503 });
      }

      const user = await env.SPARKPOST_DB.prepare(
        `SELECT
           users.id,
           users.email,
           users.created_at AS createdAt,
           users.email_verified_at AS emailVerifiedAt,
           users.last_login_at AS lastLoginAt,
           COALESCE(credit_accounts.balance, 0) AS creditBalance
         FROM users
         LEFT JOIN credit_accounts ON credit_accounts.user_id = users.id
         WHERE users.email = ?
         LIMIT 1`,
      ).bind(input.email).first<AuthenticatedUserRow>();

      if (!user) {
        return json(
          { error: "Developer login account does not exist. Create it in the database first." },
          { status: 404 },
        );
      }

      const timestamp = new Date().toISOString();
      const emailVerifiedAt = user.emailVerifiedAt ?? timestamp;

      await env.SPARKPOST_DB.prepare(
        `UPDATE users
         SET email_verified_at = ?, last_login_at = ?, updated_at = ?
         WHERE id = ?`,
      ).bind(emailVerifiedAt, timestamp, timestamp, user.id).run();

      const response = json({
        ok: true,
        isNewUser: false,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          emailVerifiedAt,
          lastLoginAt: timestamp,
          creditBalance: user.creditBalance ?? 0,
        },
      });
      response.headers.set("Set-Cookie", await buildSessionCookie(user.id, user.email, env));
      return response;
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/send-code",
    handler: async (request, env) => {
      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
      const input = validateSendCodeInput(bodyResult.body);
      if (!input.ok) return json({ error: input.error }, { status: 400 });
      try {
        const result = await issueVerificationCode(input.email, env);
        if (!result.ok) {
          return json({ error: "Please wait before requesting another verification code.", retryAfterSeconds: result.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
        }
        return json({ ok: true, email: input.email, expiresAt: result.expiresAt.toISOString(), ...(result.debugCode ? { debugCode: result.debugCode } : {}) });
      } catch (error) {
        if (error instanceof EmailDeliveryConfigError || error instanceof EmailDeliveryProviderError) {
          console.error("Verification email delivery failed.", error);
          return json({ error: "Verification email service is temporarily unavailable." }, { status: 503 });
        }
        throw error;
      }
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/verify-code",
    handler: async (request, env) => {
      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
      const input = validateVerifyCodeInput(bodyResult.body, env);
      if (!input.ok) return json({ error: input.error }, { status: 400 });
      const result = await verifyCodeAndProvisionUser(input.email, input.code, env);
      if (!result.ok) {
        if (result.reason === "locked") {
          return json({ error: "Too many verification attempts. Please wait before trying again.", retryAfterSeconds: result.retryAfterSeconds }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
        }
        const errorMessage = result.reason === "expired" ? "Verification code has expired." : result.reason === "used" ? "Verification code has already been used." : "Invalid verification code.";
        return json({ error: errorMessage }, { status: 400 });
      }
      const response = json({ ok: true, isNewUser: result.isNewUser, user: result.user });
      response.headers.set("Set-Cookie", await buildSessionCookie(result.user.id, result.user.email, env));
      return response;
    },
  },
  {
    method: "POST",
    pathname: "/api/auth/logout",
    handler: async () => {
      const response = json({ ok: true });
      response.headers.set("Set-Cookie", buildLogoutCookie());
      return response;
    },
  },
    {
      method: "POST",
      pathname: "/api/generate/image",
    handler: async (request, env) => {
      const bodyResult = await parseJsonBody(request);
      if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
      const input = validateGenerateImageInput(bodyResult.body);
      if (!input.ok) return json({ error: input.error }, { status: 400 });

      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) {
        return json(withErrorCode("AUTH_SERVICE_UNAVAILABLE", "Generation service is temporarily unavailable."), { status: 503 });
      }
      if (!authenticatedUser.user) return json(withErrorCode("AUTH_REQUIRED", "Authentication required."), { status: 401 });

      try {
        const task = await createQueuedImageGenerationTask(authenticatedUser.user.id, input, env);
        return json({ ok: true, task });
      } catch (error) {
        if (error instanceof ImageGenerationCreditsError) {
          return json(withErrorCode("INSUFFICIENT_CREDITS", error.message), { status: 402 });
        }
        if (error instanceof ImageGenerationAuthError) {
          return json(withErrorCode("IMAGE_PROVIDER_AUTH_FAILED", error.message), { status: 403 });
        }
        if (error instanceof ImageGenerationConfigError) {
          console.error("Image generation failed.", error);
          return json(withErrorCode("IMAGE_PROVIDER_CONFIG_ERROR", error.message), { status: 503 });
        }
        if (error instanceof ImageGenerationProviderError) {
          console.error("Image generation failed.", error);
          return json(withErrorCode("IMAGE_PROVIDER_REQUEST_FAILED", error.message), { status: 503 });
        }
        throw error;
      }
      },
    },
    {
      method: "POST",
      pathname: "/api/prompt/inspire",
      handler: async (request, env) => {
        const bodyResult = await parseJsonBody(request);
        if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
        const input = validatePromptAssistInput(bodyResult.body);
        if (!input.ok) return json({ error: input.error }, { status: 400 });

        try {
          const result = await callPromptAssistProvider("inspire", input.prompt, input.mode, env);
          return json({ ok: true, prompt: result.prompt, provider: result.provider, model: result.model });
        } catch (error) {
          if (error instanceof PromptAssistConfigError || error instanceof PromptAssistProviderError) {
            console.error("Prompt inspire failed.", error);
            return json({ error: "Prompt inspiration service is temporarily unavailable." }, { status: 503 });
          }
          throw error;
        }
      },
    },
    {
      method: "POST",
      pathname: "/api/prompt/enhance",
      handler: async (request, env) => {
        const bodyResult = await parseJsonBody(request);
        if (!bodyResult.ok) return json({ error: bodyResult.error }, { status: 400 });
        const input = validatePromptAssistInput(bodyResult.body);
        if (!input.ok) return json({ error: input.error }, { status: 400 });

        try {
          const result = await callPromptAssistProvider("enhance", input.prompt, input.mode, env);
          return json({ ok: true, prompt: result.prompt, provider: result.provider, model: result.model });
        } catch (error) {
          if (error instanceof PromptAssistConfigError || error instanceof PromptAssistProviderError) {
            console.error("Prompt enhance failed.", error);
            return json({ error: "Prompt enhancement service is temporarily unavailable." }, { status: 503 });
          }
          throw error;
        }
      },
    },
    {
      method: "GET",
      pathname: "/api/generate/status",
      handler: async (_request, env) => {
        return json(getImageStatusPayload(env));
      },
    },
    {
      method: "GET",
      pathname: "/api/models/image",
      handler: async (_request, env) => {
        return json(getImageModelsPayload(env));
      },
    },
  ];

export default {
  async fetch(request: Request, env: Env, ctx?: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (!isRequestFromAllowedOrigin(request, env, url)) {
        return withCors(request, json({ error: "Forbidden origin." }, { status: 403 }), env);
      }

      return withCors(request, new Response(null, { status: 204 }), env);
    }

    try {
      if (!isRequestFromAllowedOrigin(request, env, url)) {
        return withCors(request, json({ error: "Forbidden origin." }, { status: 403 }), env);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/assets/")) {
        return withCors(request, await getGeneratedAssetResponse(request, env, url), env);
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/generate/tasks/")) {
        return withCors(request, await getGenerationTaskStatusResponse(request, env, url), env);
      }

      const match = routes.find((route) => route.method === request.method && route.pathname === url.pathname);
      if (match) {
        return withCors(request, await match.handler(request, env, url, ctx), env);
      }
      return withCors(request, json({ ok: false, error: "Route not found." }, { status: 404 }), env);
    } catch (error) {
      console.error("Workers API route failed.", error);
      return withCors(request, json({ error: "Unexpected server error." }, { status: 500 }), env);
    }
  },
  async queue(batch: { messages: Array<{ body: ImageGenerationQueueMessage; ack: () => void; retry: () => void }> }, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processQueuedImageGenerationTask(message.body.taskId, message.body.userId, env);
        message.ack();
      } catch (error) {
        console.error("Image generation queue task failed.", error);
        message.ack();
      }
    }
  },
};
