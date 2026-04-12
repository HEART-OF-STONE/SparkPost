export interface Env {
  SPARKPOST_DB?: {
    prepare: (sql: string) => {
      bind: (...values: unknown[]) => {
        first: <T = unknown>() => Promise<T | null>;
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
  SESSION_SECRET?: string;
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  EMAIL_SUBJECT_PREFIX?: string;
  RESEND_API_KEY?: string;
    IMAGE_BACKEND?: string;
    IMAGE_API_KEY?: string;
    IMAGE_MODEL?: string;
    IMAGE_BASE_URL?: string;
    OPENAI_IMAGE_API_KEY?: string;
    RELAY_IMAGE_API_KEY?: string;
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
}

type JsonRecord = Record<string, unknown>;
type RouteHandler = (request: Request, env: Env, url: URL) => Promise<Response> | Response;

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
};

type GenerationTaskRow = {
  id: string;
  status: string;
  prompt: string;
  compiledPrompt: string | null;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
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
const SESSION_COOKIE_NAME = "sparkpost_session";
const SESSION_COOKIE_PATH = "/";
const GENERATED_ASSET_PREFIX = "generated";

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
});

const getImageConfig = (env: Env) => {
  const backend = env.IMAGE_BACKEND ?? DEFAULT_IMAGE_BACKEND;
  const model = env.IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL;
  const textToImageCost = getNumberEnv(env.TEXT_TO_IMAGE_COST, DEFAULT_TEXT_TO_IMAGE_COST);
  const imageToImageCost = getNumberEnv(env.IMAGE_TO_IMAGE_COST, DEFAULT_IMAGE_TO_IMAGE_COST);
  const openAiApiKey = env.OPENAI_IMAGE_API_KEY?.trim() || env.IMAGE_API_KEY?.trim() || "";
  const relayApiKey = env.RELAY_IMAGE_API_KEY?.trim() || env.IMAGE_API_KEY?.trim() || "";
  const relayBaseUrl = (env.RELAY_IMAGE_BASE_URL?.trim() || env.IMAGE_BASE_URL?.trim() || "").replace(/\/$/, "");

  const providerConfig =
    backend === "relay"
      ? {
          apiKey: relayApiKey,
          baseUrl: relayBaseUrl,
        }
      : {
          apiKey: openAiApiKey,
          baseUrl: DEFAULT_OPENAI_IMAGE_BASE_URL,
        };

  return {
    backend,
    apiKey: providerConfig.apiKey,
    model,
    baseUrl: providerConfig.baseUrl,
    textToImageCost,
    imageToImageCost,
    status:
      (
        (backend === "official" && providerConfig.apiKey.length > 0) ||
        (backend === "relay" && providerConfig.apiKey.length > 0 && providerConfig.baseUrl.length > 0)
      )
        ? "available"
        : "unavailable",
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

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");

  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-credentials": origin ? "true" : "false",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
    vary: "Origin",
  };
};

const withCors = (request: Request, response: Response) => {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(getCorsHeaders(request))) {
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

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      creditBalance: user.creditBalance ?? 0,
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

const validateGenerateImageInput = (input: unknown) => {
  const prompt = isRecord(input) && "prompt" in input ? input.prompt : undefined;
  const mode = isRecord(input) && "mode" in input ? input.mode : undefined;
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

  if (normalizedMode === "t2i") {
    return { ok: true as const, mode: normalizedMode, prompt: normalizedPrompt, referenceImages: [] as string[] };
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
    prompt: normalizedPrompt,
    referenceImages,
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
    ).bind(crypto.randomUUID(), user.id, isNewUser ? authConfig.signupBonusCredits : 0, now.toISOString(), now.toISOString()).run();
  }

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

const callOfficialImageProvider = async (prompt: string, env: Env): Promise<ProviderResult> => {
  const imageConfig = getImageConfig(env);
  if (imageConfig.status !== "available") {
    throw new ImageGenerationConfigError("Image generation provider is not configured.");
  }

  const response = await fetch(getImageGenerationEndpoint(imageConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${imageConfig.apiKey}`,
    },
    body: JSON.stringify({ model: imageConfig.model, prompt }),
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; data?: Array<{ b64_json?: string; url?: string }> }
    | null;

  if (!response.ok) {
    console.error("Image provider request failed.", { status: response.status, body });
    throw new ImageGenerationProviderError("Image generation provider request failed.");
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
  env: Env,
): Promise<ProviderResult> => {
  const imageConfig = getImageConfig(env);
  if (imageConfig.status !== "available") {
    throw new ImageGenerationConfigError("Image generation provider is not configured.");
  }

  const endpoint = getImageEditEndpoint(imageConfig);
  const buildMultipartPayload = (fieldName: "image" | "image[]") => {
    const formData = new FormData();
    formData.set("model", imageConfig.model);
    formData.set("prompt", prompt);

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
    throw new ImageGenerationProviderError("Image generation provider request failed.");
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
  options?: { mode?: "t2i" | "i2i"; referenceImages?: string[] },
) => {
  const imageConfig = getImageConfig(env);
  if (["official", "relay"].includes(imageConfig.backend)) {
    if (options?.mode === "i2i") {
      return callOfficialImageEditProvider(prompt, options.referenceImages ?? [], env);
    }
    return callOfficialImageProvider(prompt, env);
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

const persistGeneratedAsset = async (
  request: Request,
  env: Env,
  userId: string,
  taskId: string,
  providerResult: ProviderResult,
): Promise<StoredAsset> => {
  if (!env.SPARKPOST_R2) {
    throw new ImageGenerationConfigError("R2 binding SPARKPOST_R2 is not configured.");
  }

  const assetId = crypto.randomUUID();
  const fileExtension = getFileExtensionFromMimeType(providerResult.mimeType);
  const key = `${GENERATED_ASSET_PREFIX}/${userId}/${taskId}/${assetId}.${fileExtension}`;

  await env.SPARKPOST_R2.put(key, providerResult.bytes, {
    httpMetadata: {
      contentType: providerResult.mimeType,
    },
  });

  return {
    assetId,
    fileUrl: createAssetResponseUrl(request, key),
  };
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

const generateTextToImageForUser = async (request: Request, userId: string, prompt: string, env: Env) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const imageConfig = getImageConfig(env);
  const now = new Date();
  const compiledPrompt = prompt;
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
       id, user_id, task_type, status, prompt, compiled_prompt, model, cost_credits, created_at
     ) VALUES (?, ?, 'text_to_image', 'running', ?, ?, ?, ?, ?)`,
  ).bind(
    taskId,
    userId,
    prompt,
    compiledPrompt,
    imageConfig.model,
    imageConfig.textToImageCost,
    now.toISOString(),
  ).run();

  try {
    const providerResult = await generateProviderImage(compiledPrompt, env);
    const storedAsset = await persistGeneratedAsset(request, env, userId, taskId, providerResult);
    const completedAt = new Date();
    const remainingCredits = creditAccount.balance - imageConfig.textToImageCost;

    await env.SPARKPOST_DB.prepare(
      `UPDATE credit_accounts SET balance = ?, updated_at = ? WHERE user_id = ?`,
    ).bind(remainingCredits, completedAt.toISOString(), userId).run();

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO credit_transactions (
         id, user_id, type, amount, balance_after, related_task_id, remark, created_at
       ) VALUES (?, ?, 'text_to_image', ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      userId,
      -imageConfig.textToImageCost,
      remainingCredits,
      taskId,
      prompt.slice(0, 120),
      completedAt.toISOString(),
    ).run();

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO generated_assets (
         id, task_id, asset_type, file_url, width, height, created_at
       ) VALUES (?, ?, 'image', ?, NULL, NULL, ?)`,
    ).bind(storedAsset.assetId, taskId, storedAsset.fileUrl, completedAt.toISOString()).run();

    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'succeeded', model = ?, completed_at = ? WHERE id = ?`,
    ).bind(providerResult.model, completedAt.toISOString(), taskId).run();

      const task = await env.SPARKPOST_DB.prepare(
       `SELECT id, status, prompt, compiled_prompt AS compiledPrompt, created_at AS createdAt, completed_at AS completedAt, model, cost_credits AS costCredits
        FROM generation_tasks WHERE id = ? LIMIT 1`,
      ).bind(taskId).first<GenerationTaskRow>();

    return {
      id: task?.id ?? taskId,
      status: task?.status ?? "succeeded",
      prompt: task?.prompt ?? prompt,
      createdAt: task?.createdAt ?? now.toISOString(),
      completedAt: task?.completedAt ?? completedAt.toISOString(),
      model: task?.model ?? providerResult.model,
      costCredits: task?.costCredits ?? imageConfig.textToImageCost,
      remainingCredits,
      assets: [
        {
          id: storedAsset.assetId,
          fileUrl: storedAsset.fileUrl,
          width: null,
          height: null,
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
) => {
  if (!env.SPARKPOST_DB) {
    throw new ImageGenerationConfigError("D1 binding SPARKPOST_DB is not configured.");
  }

  const imageConfig = getImageConfig(env);
  const now = new Date();
  const compiledPrompt = compileImageToImagePrompt(prompt, referenceImages.length);
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
       id, user_id, task_type, status, prompt, compiled_prompt, model, cost_credits, input_image_url, created_at
     ) VALUES (?, ?, 'image_to_image', 'running', ?, ?, ?, ?, ?, ?)`,
    ).bind(
      taskId,
      userId,
      prompt,
      compiledPrompt,
      imageConfig.model,
      imageConfig.imageToImageCost,
      `inline:${getMimeTypeFromDataUrl(referenceImages[0])}`,
      now.toISOString(),
    ).run();

  try {
    const providerResult = await generateProviderImage(compiledPrompt, env, {
      mode: "i2i",
      referenceImages,
    });
    const storedAsset = await persistGeneratedAsset(request, env, userId, taskId, providerResult);
    const completedAt = new Date();
    const remainingCredits = creditAccount.balance - imageConfig.imageToImageCost;

    await env.SPARKPOST_DB.prepare(
      `UPDATE credit_accounts SET balance = ?, updated_at = ? WHERE user_id = ?`,
    ).bind(remainingCredits, completedAt.toISOString(), userId).run();

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO credit_transactions (
         id, user_id, type, amount, balance_after, related_task_id, remark, created_at
       ) VALUES (?, ?, 'image_to_image', ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      userId,
      -imageConfig.imageToImageCost,
      remainingCredits,
      taskId,
      prompt.slice(0, 120),
      completedAt.toISOString(),
    ).run();

    await env.SPARKPOST_DB.prepare(
      `INSERT INTO generated_assets (
         id, task_id, asset_type, file_url, width, height, created_at
       ) VALUES (?, ?, 'image', ?, NULL, NULL, ?)`,
    ).bind(storedAsset.assetId, taskId, storedAsset.fileUrl, completedAt.toISOString()).run();

    await env.SPARKPOST_DB.prepare(
      `UPDATE generation_tasks SET status = 'succeeded', model = ?, completed_at = ? WHERE id = ?`,
    ).bind(providerResult.model, completedAt.toISOString(), taskId).run();

      const task = await env.SPARKPOST_DB.prepare(
       `SELECT id, status, prompt, compiled_prompt AS compiledPrompt, created_at AS createdAt, completed_at AS completedAt, model, cost_credits AS costCredits
        FROM generation_tasks WHERE id = ? LIMIT 1`,
      ).bind(taskId).first<GenerationTaskRow>();

    return {
      id: task?.id ?? taskId,
      status: task?.status ?? "succeeded",
      prompt: task?.prompt ?? prompt,
      createdAt: task?.createdAt ?? now.toISOString(),
      completedAt: task?.completedAt ?? completedAt.toISOString(),
      model: task?.model ?? providerResult.model,
      costCredits: task?.costCredits ?? imageConfig.imageToImageCost,
      remainingCredits,
      assets: [
        {
          id: storedAsset.assetId,
          fileUrl: storedAsset.fileUrl,
          width: null,
          height: null,
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
    pathname: "/api/me",
    handler: async (request, env) => {
      const authenticatedUser = await getAuthenticatedUser(request, env);
      if (!authenticatedUser.ok) return authenticatedUser.response;
      return json({ user: authenticatedUser.user });
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
      if (!authenticatedUser.ok) return json({ error: "Generation service is temporarily unavailable." }, { status: 503 });
      if (!authenticatedUser.user) return json({ error: "Authentication required." }, { status: 401 });

      try {
        const task =
          input.mode === "i2i"
            ? await generateImageToImageForUser(
                request,
                authenticatedUser.user.id,
                input.prompt,
                input.referenceImages,
                env,
              )
            : await generateTextToImageForUser(request, authenticatedUser.user.id, input.prompt, env);
        return json({ ok: true, task });
      } catch (error) {
        if (error instanceof ImageGenerationCreditsError) {
          return json({ error: error.message }, { status: 402 });
        }
        if (error instanceof ImageGenerationAuthError) {
          return json({ error: error.message }, { status: 403 });
        }
        if (error instanceof ImageGenerationConfigError || error instanceof ImageGenerationProviderError) {
          console.error("Image generation failed.", error);
          return json({ error: "Image generation service is temporarily unavailable." }, { status: 503 });
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
        const imageConfig = getImageConfig(env);
      return json({ status: imageConfig.status, model: imageConfig.model });
    },
  },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return withCors(request, new Response(null, { status: 204 }));
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname.startsWith("/api/assets/")) {
        return withCors(request, await getGeneratedAssetResponse(request, env, url));
      }

      const match = routes.find((route) => route.method === request.method && route.pathname === url.pathname);
      if (match) {
        return withCors(request, await match.handler(request, env, url));
      }
      return withCors(request, json({ ok: false, error: "Route not found." }, { status: 404 }));
    } catch (error) {
      console.error("Workers API route failed.", error);
      return withCors(request, json({ error: "Unexpected server error." }, { status: 500 }));
    }
  },
};
