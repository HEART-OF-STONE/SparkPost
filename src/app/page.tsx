"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";

import { fetchApi, resolveApiAssetUrl } from "@/lib/api/client";

type Locale = "zh" | "en";
type Notice = { type: "success" | "error" | "info"; text: string };
type AuthStatus = "checking" | "signedOut" | "signedIn";
type SystemStatus = "unknown" | "available" | "unavailable";
type InteractionStatus = "checking" | "ready" | "authRequired" | "generating";
type ResultStatus = "empty" | "success" | "error";
type Mode = "t2i" | "i2i";
type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  creditBalance: number;
};
type ImageStatusResponse = { status?: SystemStatus; model?: string; modelId?: string; label?: string };
type ImageTaskResult = {
  id: string;
  status: string;
  prompt: string;
  createdAt: string;
  completedAt: string | null;
  model: string | null;
  costCredits: number;
  remainingCredits: number;
  assets: Array<{
    id: string;
    fileUrl: string;
    width: number | null;
    height: number | null;
  }>;
};
type GenerationHistoryAsset = {
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
  createdAt: string;
  completedAt: string | null;
  assets: GenerationHistoryAsset[];
};
type GenerateImageResponse = { ok: true; task: ImageTaskResult } | { code?: string; error: string };
type GenerationHistoryResponse = { ok: true; items: GenerationHistoryItem[] } | { error: string };
type PromptAssistResponse = { ok: true; prompt: string; provider: string; model: string } | { error: string };
type ImageModelItem = {
  id: string;
  label: string;
  supports: Record<Mode, boolean>;
  isDefault: boolean;
  supportedSizes?: string[];
  defaultSize?: string;
  costCredits: Record<Mode, number | null>;
  status?: "available" | "unavailable";
  code?: string | null;
  message?: string | null;
};
type ImageModelsResponse =
  | {
      ok: true;
      defaultModelId: string;
      items: ImageModelItem[];
    }
  | { error: string };
type SuccessfulImageModelsResponse = Extract<ImageModelsResponse, { ok: true }>;
type TransactionItem = {
  id: number | string;
  type: "earned" | "consumed";
  title: string;
  amount: number;
  date: string;
};
type CreditSummaryResponse =
  | {
      ok: true;
      creditBalance: number;
      hasCheckedInToday: boolean;
      dailyCheckInCredits: number;
      currentPlan: "free";
      usageLast7Days: number[];
    }
  | { error: string };
type CreditTransactionsResponse = { ok: true; items: TransactionItem[] } | { error: string };
type BootstrapResponse =
  | {
      ok: true;
      user: AuthUser | null;
      imageStatus: ImageStatusResponse;
      imageModels: SuccessfulImageModelsResponse;
      creditSummary: Extract<CreditSummaryResponse, { ok: true }> | null;
      recentCreditHistory: TransactionItem[];
    }
  | { error: string };
type CreditCheckInResponse =
  | {
      ok: true;
      awardedCredits: number;
      creditBalance: number;
      hasCheckedInToday: boolean;
      dailyCheckInCredits: number;
      currentPlan: "free";
      usageLast7Days: number[];
    }
  | { error: string };

type Copy = {
  brand: string;
  heroBadge: string;
  heroTitle: string;
  heroBody: string;
  heroPrimary: string;
  heroSecondary: string;
  feature1Title: string;
  feature1Body: string;
  feature2Title: string;
  feature2Body: string;
  feature3Title: string;
  feature3Body: string;
  playgroundTitle: string;
  playgroundBody: string;
  promptLabel: string;
  promptPlaceholder: string;
  renderNow: string;
  refresh: string;
  rendering: string;
  promptHint: string;
  t2iMode: string;
  i2iMode: string;
  uploadReference: string;
  uploadHint: string;
  inspire: string;
  enhance: string;
  comingSoon: string;
  authTitle: string;
  authBody: string;
  authHint: string;
  sendCode: string;
  sendingCode: string;
  verify: string;
  verifying: string;
  email: string;
  code: string;
  signIn: string;
  signOut: string;
  close: string;
  account: string;
  credits: string;
  provider: string;
  status: string;
  advancedSettings: string;
  advancedSummary: string;
  imageSize: string;
  generationCount: string;
  referenceStrength: string;
  comingLater: string;
  providerAvailable: string;
  providerUnavailable: string;
  providerUnknown: string;
  ready: string;
  checking: string;
  authRequired: string;
  signedIn: string;
  signedOut: string;
  resultEmpty: string;
  resultSuccess: string;
  resultError: string;
  workspaceEyebrow: string;
  workspaceTitle: string;
  workspaceBody: string;
  workspaceNotesTitle: string;
  workspaceNote1: string;
  workspaceNote2: string;
  canvasTitle: string;
  canvasEmptyTitle: string;
  canvasEmptyBody: string;
  propertiesTitle: string;
  taskId: string;
  model: string;
  cost: string;
  createdAt: string;
  completedAt: string;
  runtimeTitle: string;
  continueHint: string;
  sessionLoadFailed: string;
  sessionRefreshFailed: string;
  enterEmail: string;
  enterPrompt: string;
  enterSameEmail: string;
  enterCode: string;
  sentCode: string;
  requestTooFast: string;
  verifyTooFast: string;
  signedInNewNotice: string;
  signedInExistingNotice: string;
  signedOutNotice: string;
  loginToContinue: string;
  generateSuccess: string;
  unexpectedPayload: string;
  imagePreviewUnavailable: string;
  sendCodeFailed: string;
  verifyCodeFailed: string;
  logoutFailed: string;
  generateFailed: string;
  i2iNotice: string;
  inspireNotice: string;
  enhanceNotice: string;
};

const copy: Record<Locale, Copy> = {
  zh: {
    brand: "SparkPost",
    heroBadge: "SparkPost AI 现已上线",
    heroTitle: "将想象力转化为\n现象级视觉资产。",
    heroBody: "构建于顶级多模态大模型之上的专业工作台。利用极简交互语言，以工业级控制力探索、构建并渲染高保真数字艺术。",
    heroPrimary: "开始免费体验",
    heroSecondary: "了解功能特性",
    feature1Title: "Gemini 智能引擎",
    feature1Body: "内置 Gemini 驱动的提示词扩写与灵感生成能力，让简单短语更快进入专业级创作流程。",
    feature2Title: "实时无缝工作流",
    feature2Body: "告别冗长跳转。使用纯净、键盘友好的界面在任意状态下切换操作，维持持续创作节奏。",
    feature3Title: "毫秒级状态同步",
    feature3Body: "所见即所得的积分提示与状态同步，帮助你在生成前清楚掌握当前可用性。",
    playgroundTitle: "即刻体验工作台",
    playgroundBody: "在下方直接输入你的灵感，无需登录即可预览生图工作台的交互结构。",
    promptLabel: "PROMPT（提示词）",
    promptPlaceholder: "例如：一张电影级的高科技产品特写，半透明玻璃材质，深灰背景，青蓝色环境光，8K，Octane Render。",
    renderNow: "立即生成",
    refresh: "刷新",
    rendering: "生成中...",
    promptHint: "当前优先接入真实文生图链路。登录前后会保留你的提示词。",
    t2iMode: "文生图",
    i2iMode: "图生图",
    uploadReference: "参考图",
    uploadHint: "点击或拖拽上传",
    inspire: "✨ 给我灵感",
    enhance: "✨ 智能扩写",
    comingSoon: "即将支持",
    authTitle: "验证后继续渲染",
    authBody: "你的灵感已暂存。完成一次快速邮箱验证后，系统会继续当前操作。",
    authHint: "验证码将发送至你的邮箱，请查收后继续完成验证。",
    sendCode: "获取安全码",
    sendingCode: "发送中...",
    verify: "验证并进入",
    verifying: "验证中...",
    email: "邮箱",
    code: "6 位验证码",
    signIn: "登录",
    signOut: "退出登录",
    close: "关闭",
    account: "账户",
    credits: "积分",
    provider: "模型服务",
    status: "状态",
    advancedSettings: "高级参数",
    advancedSummary: "{size} · 1 张",
    imageSize: "输出尺寸",
    generationCount: "生成数量",
    referenceStrength: "参考强度",
    comingLater: "后续接入",
    providerAvailable: "Nano Banana 2",
    providerUnavailable: "不可用",
    providerUnknown: "Nano Banana 2",
    ready: "可用",
    checking: "检查中",
    authRequired: "需要登录",
    signedIn: "已登录",
    signedOut: "未登录",
    resultEmpty: "暂无结果",
    resultSuccess: "生成成功",
    resultError: "生成失败",
    workspaceEyebrow: "SparkPost Studio",
    workspaceTitle: "工作台",
    workspaceBody: "主界面聚焦 Prompt、生成、结果预览与任务信息。",
    workspaceNotesTitle: "说明",
    workspaceNote1: "专注效率，减少无关视觉干扰。",
    workspaceNote2: "若模型服务异常，系统会在这里明确暴露错误详情。",
    canvasTitle: "画布",
    canvasEmptyTitle: "等待引擎指令",
    canvasEmptyBody: "提交 Prompt 后，生成结果将在此画布中呈现。",
    propertiesTitle: "任务属性",
    taskId: "Task ID",
    model: "底层模型",
    cost: "算力消耗",
    createdAt: "创建时间",
    completedAt: "完成时间",
    runtimeTitle: "系统状态",
    continueHint: "未登录时点击渲染会弹出登录模块，验证成功后继续当前动作。",
    sessionLoadFailed: "无法加载当前会话状态。",
    sessionRefreshFailed: "无法刷新当前会话状态。",
    enterEmail: "请先输入邮箱。",
    enterPrompt: "请先输入 Prompt。",
    enterSameEmail: "请输入接收验证码的同一邮箱。",
    enterCode: "请输入验证码。",
    sentCode: "验证码已发送到 {email}.{expires}",
    requestTooFast: "请求过快，请在 {time} 后重试。",
    verifyTooFast: "验证受限，请在 {time} 后重试。",
    signedInNewNotice: "账户已创建，欢迎进入 SparkPost。",
    signedInExistingNotice: "登录成功，欢迎回到 SparkPost。",
    signedOutNotice: "你已退出 SparkPost。",
    loginToContinue: "请先登录。系统会保留你刚才输入的 Prompt。",
    generateSuccess: "生成完成，已创建 {count} 个资源。",
    unexpectedPayload: "接口返回了未预期的数据结构。",
    imagePreviewUnavailable: "资源已生成，但当前页面无法直接预览返回路径。",
    sendCodeFailed: "发送验证码失败。",
    verifyCodeFailed: "校验验证码失败。",
    logoutFailed: "退出登录失败。",
    generateFailed: "图片生成失败。",
    i2iNotice: "图生图已接入参考图链路，可通过 @R1、@R2 引用已上传的参考图。",
    inspireNotice: "灵感按钮暂时保留视觉入口，后续再接入真实能力。",
    enhanceNotice: "扩写按钮暂时保留视觉入口，后续再接入真实能力。",
  },
  en: {
    brand: "SparkPost",
    heroBadge: "SparkPost AI is now live",
    heroTitle: "Turn imagination into\nphenomenal visual assets.",
    heroBody: "A professional workspace built on top-tier multimodal AI. Explore, construct, and render high-fidelity digital art with industrial-grade control and minimalist interaction.",
    heroPrimary: "Start Free Trial",
    heroSecondary: "Explore Features",
    feature1Title: "Gemini Intelligence",
    feature1Body: "Powered by Gemini for prompt enhancement and inspiration. Turn simple phrases into production-ready creative input.",
    feature2Title: "Seamless Workflow",
    feature2Body: "A pure, keyboard-friendly interface that supports context switching in any state without breaking flow.",
    feature3Title: "Real-time Sync",
    feature3Body: "WYSIWYG credits and runtime status help you understand whether the generation path is currently usable.",
    playgroundTitle: "Experience the Studio",
    playgroundBody: "Enter your inspiration below to preview the generation workspace without signing in.",
    promptLabel: "PROMPT",
    promptPlaceholder: "e.g., A cinematic close-up of a high-tech product, translucent glass, dark gray background, soft cyan ambient light, 8k, Octane render.",
    renderNow: "Render Now",
    refresh: "Refresh",
    rendering: "Rendering...",
    promptHint: "The current vertical slice is real text-to-image. Your prompt stays intact across sign-in.",
    t2iMode: "Text to Image",
    i2iMode: "Image to Image",
    uploadReference: "Reference Image",
    uploadHint: "Click or drag to upload",
    inspire: "✨ Inspire Me",
    enhance: "✨ Enhance",
    comingSoon: "Coming soon",
    authTitle: "Verify to continue",
    authBody: "Your prompt is preserved. After a quick email verification, the pending action continues automatically.",
    authHint: "We will send the verification code to your email so you can continue securely.",
    sendCode: "Get Code",
    sendingCode: "Sending...",
    verify: "Verify & Continue",
    verifying: "Verifying...",
    email: "Email",
    code: "6-digit Code",
    signIn: "Sign In",
    signOut: "Log Out",
    close: "Close",
    account: "Account",
    credits: "Credits",
    provider: "Model Service",
    status: "Status",
    advancedSettings: "Advanced",
    advancedSummary: "{size} · 1 image",
    imageSize: "Output Size",
    generationCount: "Image Count",
    referenceStrength: "Reference Strength",
    comingLater: "Coming later",
    providerAvailable: "Nano Banana 2",
    providerUnavailable: "Unavailable",
    providerUnknown: "Nano Banana 2",
    ready: "Available",
    checking: "Checking",
    authRequired: "Auth required",
    signedIn: "Signed in",
    signedOut: "Signed out",
    resultEmpty: "Empty",
    resultSuccess: "Success",
    resultError: "Error",
    workspaceEyebrow: "SparkPost Studio",
    workspaceTitle: "Workspace",
    workspaceBody: "The interface stays focused on prompt input, generation, preview, and task data.",
    workspaceNotesTitle: "Notes",
    workspaceNote1: "Optimized for efficiency with minimal visual noise.",
    workspaceNote2: "Provider issues are surfaced here clearly.",
    canvasTitle: "Canvas",
    canvasEmptyTitle: "Awaiting Instructions",
    canvasEmptyBody: "Submit a prompt and the generated result will render on this canvas.",
    propertiesTitle: "Properties",
    taskId: "Task ID",
    model: "Base Model",
    cost: "Compute Cost",
    createdAt: "Created",
    completedAt: "Completed",
    runtimeTitle: "System Status",
    continueHint: "When signed out, the render CTA opens the auth module and continues after verification.",
    sessionLoadFailed: "Unable to load the current session.",
    sessionRefreshFailed: "Unable to refresh the current session.",
    enterEmail: "Provide an email address first.",
    enterPrompt: "Enter a prompt first.",
    enterSameEmail: "Use the same email address that received the code.",
    enterCode: "Enter the verification code.",
    sentCode: "Verification code sent to {email}.{expires}",
    requestTooFast: "Request too fast. Please wait {time}.",
    verifyTooFast: "Verification limited. Please wait {time}.",
    signedInNewNotice: "Account created. Welcome to SparkPost.",
    signedInExistingNotice: "Signed in successfully.",
    signedOutNotice: "Signed out from SparkPost.",
    loginToContinue: "Sign in to continue. Your current prompt has been preserved.",
    generateSuccess: "Render complete. {count} asset(s) created.",
    unexpectedPayload: "Unexpected API response.",
    imagePreviewUnavailable: "The asset was created, but the returned file path could not be previewed here.",
    sendCodeFailed: "Unable to send verification code.",
    verifyCodeFailed: "Unable to verify the code.",
    logoutFailed: "Unable to log out.",
    generateFailed: "Unable to generate image.",
    i2iNotice: "Image-to-image is now wired to the reference pipeline. Use @R1, @R2, and more to refer to uploaded images.",
    inspireNotice: "This inspiration control keeps its visual position for now and will be wired later.",
    enhanceNotice: "This enhancement control keeps its visual position for now and will be wired later.",
  },
};
const timeLeftText = (seconds: number) =>
  seconds <= 0 ? "0s" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60 || ""}`.trim();
const formatDate = (value: string | null, locale: Locale) =>
  value ? new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { hour12: false }) : "-";
const formatTemplate = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const primaryImageUrl = (task: ImageTaskResult | null) => resolveApiAssetUrl(task?.assets[0]?.fileUrl ?? null);
const primaryHistoryImageUrl = (item: GenerationHistoryItem) => resolveApiAssetUrl(item.assets[0]?.fileUrl ?? null);
const DEFAULT_IMAGE_MODEL_ID = "nano-banana-2";
const DEFAULT_IMAGE_MODEL_COST: Record<Mode, number> = {
  t2i: 10,
  i2i: 15,
};
const DEFAULT_IMAGE_SIZE = "auto";
const ENABLE_IMAGE_SIZE_SELECTOR = process.env.NEXT_PUBLIC_ENABLE_IMAGE_SIZE_SELECTOR !== "false";
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "nano-banana-2": "Nano Banana 2",
  "gemini-3.1-flash-image-openai": "Nano Banana 2",
  "gemini-3.1-image-openai": "Nano Banana 2",
  "gemini-3.1-image": "Nano Banana 2",
  "gpt-image-2": "GPT-Image 2 (micu)",
  "gpt-image-2-duojie": "GPT-Image 2 (duojie)",
  "gpt-image2": "GPT-Image 2 (duojie)",
  "gpt-image-1": "GPT-Image 2",
  "dall-e-3": "DALL-E 3",
  dalle3: "DALL-E 3",
};

const FALLBACK_IMAGE_MODELS: ImageModelItem[] = [
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    isDefault: true,
    supports: { t2i: true, i2i: true },
    supportedSizes: ["auto", "1024x1024", "1536x1024", "1024x1536", "2048x2048", "2048x1152", "3840x2160", "2160x3840"],
    defaultSize: DEFAULT_IMAGE_SIZE,
    costCredits: { t2i: 10, i2i: 15 },
  },
  {
    id: "gpt-image-2",
    label: "GPT-Image 2 (micu)",
    isDefault: false,
    supports: { t2i: true, i2i: true },
    supportedSizes: ["auto", "1024x1024", "1536x1024", "1024x1536", "2048x2048", "2048x1152", "3840x2160", "2160x3840"],
    defaultSize: DEFAULT_IMAGE_SIZE,
    costCredits: { t2i: 10, i2i: 15 },
  },
  {
    id: "gpt-image-2-duojie",
    label: "GPT-Image 2 (duojie)",
    isDefault: false,
    supports: { t2i: true, i2i: true },
    supportedSizes: ["auto", "1024x1024", "1536x1024", "1024x1536", "2048x2048", "2048x1152", "3840x2160", "2160x3840"],
    defaultSize: DEFAULT_IMAGE_SIZE,
    costCredits: { t2i: 10, i2i: 15 },
  },
];

const getImageSizeLabel = (size: string, locale: Locale) => {
  const labels: Record<string, Record<Locale, string>> = {
    auto: { zh: "自动", en: "Auto" },
    "1024x1024": { zh: "1K 方图", en: "1K Square" },
    "1536x1024": { zh: "1K 横图", en: "1K Landscape" },
    "1024x1536": { zh: "1K 竖图", en: "1K Portrait" },
    "2048x2048": { zh: "2K 方图", en: "2K Square" },
    "2048x1152": { zh: "2K 横图", en: "2K Landscape" },
    "3840x2160": { zh: "4K 横图", en: "4K Landscape" },
    "2160x3840": { zh: "4K 竖图", en: "4K Portrait" },
    "1792x1024": { zh: "DALL-E 横图", en: "DALL-E Landscape" },
    "1024x1792": { zh: "DALL-E 竖图", en: "DALL-E Portrait" },
  };

  return labels[size]?.[locale] ?? size;
};

const getDisplayImageModel = (model: string | null | undefined) => {
  const normalized = (model ?? DEFAULT_IMAGE_MODEL_ID).trim().toLowerCase();
  return MODEL_DISPLAY_NAMES[normalized] ?? model ?? MODEL_DISPLAY_NAMES[DEFAULT_IMAGE_MODEL_ID];
};

const createLocalPreviewUser = (): AuthUser => ({
  id: "local-preview-user",
  email: "preview@sparkpost.local",
  createdAt: new Date().toISOString(),
  emailVerifiedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
  creditBalance: 20,
});

const getFallbackImageModelsResponse = (): SuccessfulImageModelsResponse => ({
  ok: true,
  defaultModelId: "nano-banana-2",
  items: FALLBACK_IMAGE_MODELS,
});

const formatApiError = (payload: { code?: string | null; error?: string | null }, fallback: string) => {
  const errorText = typeof payload.error === "string" && payload.error.trim().length > 0 ? payload.error.trim() : fallback;
  const errorCode = typeof payload.code === "string" && payload.code.trim().length > 0 ? payload.code.trim() : "";
  return errorCode ? `${errorCode}: ${errorText}` : errorText;
};

const shouldUseLocalPreview = () => {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const isLocalHost = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  return isLocalHost && url.searchParams.get("preview") === "1";
};

function getTransactionIcon(transaction: TransactionItem) {
  const normalized = transaction.title.toLowerCase();
  if (transaction.type === "earned") {
    return normalized.includes("sign") || normalized.includes("签到") ? <CalendarIcon /> : <CreditCardIcon />;
  }
  return <ImageIcon />;
}

const noticeClasses = (type: Notice["type"]) =>
  type === "error"
    ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
    : type === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-gray-200 bg-gray-100 text-gray-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200";

const BrainIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4 4.5 4.5 0 0 1 3-4 4.5 4.5 0 0 1 3-4Z" /></svg>;
const ShieldIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
const SparklesIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>;
const ImageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
const CloseIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
const PlusIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const UploadIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>;
const SunIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>;
const MoonIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>;
const CalendarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" /></svg>;
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const CreditCardIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>;
const CheckCircleIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
const ArrowLeftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
const FilterIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const ChevronDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;

function NoticeBanner({ notice }: { notice: Notice }) {
  return <div className={`rounded-xl border px-3 py-2.5 text-sm leading-6 ${noticeClasses(notice.type)}`}>{notice.text}</div>;
}

function VisualHero({ isDark }: { isDark: boolean }) {
  return (
    <div className={`mt-16 w-full max-w-[1720px] mx-auto relative rounded-3xl overflow-hidden border shadow-2xl h-[520px] md:h-[760px] group ${isDark ? "border-white/5 bg-black" : "border-gray-200 bg-white"}`}>
      <div className={`absolute inset-0 z-10 ${isDark ? "bg-gradient-to-t from-black via-black/20 to-transparent" : "bg-gradient-to-t from-gray-50 via-gray-50/20 to-transparent"}`} />
      <div className={`absolute inset-0 z-10 ${isDark ? "bg-gradient-to-b from-black via-transparent to-transparent" : "bg-gradient-to-b from-gray-50 via-transparent to-transparent"}`} />
      <div className={`absolute inset-0 z-10 ${isDark ? "bg-gradient-to-r from-black via-transparent to-black" : "bg-gradient-to-r from-gray-50 via-transparent to-gray-50"}`} />
      <Image
        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop"
        alt="SparkPost hero artwork"
        fill
        unoptimized
        className={`object-cover transition-transform duration-1000 ${isDark ? "opacity-80" : "opacity-90"} group-hover:scale-105`}
      />
    </div>
  );
}

export default function Home() {
  const [isDark, setIsDark] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");
  const [isLocaleReady, setIsLocaleReady] = useState(false);
  const [mode, setMode] = useState<Mode>("t2i");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prompts, setPrompts] = useState({
    t2i: "A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.",
    i2i: "",
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionMenuPos, setMentionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isInspiring, setIsInspiring] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showGenerationHistory, setShowGenerationHistory] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [activeBillingTab, setActiveBillingTab] = useState<"topup" | "history">("topup");
  const [historyFilter, setHistoryFilter] = useState<"all" | "consumed" | "earned">("all");
  const [recentCreditHistory, setRecentCreditHistory] = useState<TransactionItem[]>([]);
  const [dashboardCreditHistory, setDashboardCreditHistory] = useState<TransactionItem[]>([]);
  const [usageLast7Days, setUsageLast7Days] = useState<number[]>(Array(7).fill(0));
  const [dailyCheckInCredits, setDailyCheckInCredits] = useState(20);
  const [generationHistoryItems, setGenerationHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [isGenerationHistoryLoading, setIsGenerationHistoryLoading] = useState(false);
  const [generationHistoryNotice, setGenerationHistoryNotice] = useState<string | null>(null);
  const [pendingGenerateAfterLogin, setPendingGenerateAfterLogin] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [authNotice, setAuthNotice] = useState<Notice | null>(null);
  const [generationNotice, setGenerationNotice] = useState<Notice | null>(null);
  const [generationTask, setGenerationTask] = useState<ImageTaskResult | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("unknown");
  const [availableImageModels, setAvailableImageModels] = useState<ImageModelItem[]>([]);
  const [selectedImageModelByMode, setSelectedImageModelByMode] = useState<Record<Mode, string>>({
    t2i: DEFAULT_IMAGE_MODEL_ID,
    i2i: DEFAULT_IMAGE_MODEL_ID,
  });
  const [selectedImageSizeByMode, setSelectedImageSizeByMode] = useState<Record<Mode, string>>({
    t2i: DEFAULT_IMAGE_SIZE,
    i2i: DEFAULT_IMAGE_SIZE,
  });
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSizeSelectorOpen, setIsSizeSelectorOpen] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const landingPromptRef = useRef<HTMLDivElement>(null);
  const workspacePromptRef = useRef<HTMLDivElement>(null);
  const playgroundRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const sizeSelectorRef = useRef<HTMLDivElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeEditorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const isTypingRef = useRef(false);
  const generationHistoryAutoLoadKeyRef = useRef<string | null>(null);

  const rememberPromptEditor = useCallback((surface: "landing" | "workspace", editor: HTMLDivElement) => {
    activeEditorRef.current = editor;
    promptRef.current = editor;
    if (surface === "workspace") {
      workspacePromptRef.current = editor;
    } else {
      landingPromptRef.current = editor;
    }
  }, []);

  const getRenderedPromptEditor = useCallback(() => {
    const preferredEditor = user ? workspacePromptRef.current : landingPromptRef.current;
    if (preferredEditor?.isConnected) return preferredEditor;
    if (activeEditorRef.current?.isConnected) return activeEditorRef.current;
    if (promptRef.current?.isConnected) return promptRef.current;
    return null;
  }, [user]);

  const t = copy[locale];
  const authStatus: AuthStatus = isLoadingSession ? "checking" : user ? "signedIn" : "signedOut";
  const interactionStatus: InteractionStatus = isLoadingSession ? "checking" : isGeneratingImage ? "generating" : authStatus === "signedOut" && showLoginPanel ? "authRequired" : "ready";
  const resultStatus: ResultStatus = generationTask ? "success" : generationNotice?.type === "error" ? "error" : "empty";
  const cooldownActive = useMemo(() => cooldownEndsAt !== null && timeLeft > 0, [cooldownEndsAt, timeLeft]);
  const accountInitials = user?.email.slice(0, 2).toUpperCase() ?? "SP";
  const userId = user?.id ?? null;
  const currentPrompt = prompts[mode];
  const canRender = !!currentPrompt.trim() && !isGeneratingImage;
  const referenceUploadInputId = user ? "workspace-reference-upload" : "landing-reference-upload";
  const supportedImageModels = useMemo(
    () => availableImageModels.filter((item) => item.supports[mode]),
    [availableImageModels, mode],
  );
  const selectedImageModel = useMemo(() => {
    const selectedId = selectedImageModelByMode[mode];
    return (
      supportedImageModels.find((item) => item.id === selectedId) ??
      supportedImageModels.find((item) => item.isDefault) ??
      supportedImageModels[0] ??
      null
    );
  }, [mode, selectedImageModelByMode, supportedImageModels]);
  const selectedImageModelId = selectedImageModel?.id ?? selectedImageModelByMode[mode] ?? DEFAULT_IMAGE_MODEL_ID;
  const supportedImageSizes = useMemo(() => {
    const sizes = selectedImageModel?.supportedSizes?.filter((size) => typeof size === "string" && size.trim().length > 0) ?? [];
    return sizes.length > 0 ? sizes : [selectedImageModel?.defaultSize ?? DEFAULT_IMAGE_SIZE];
  }, [selectedImageModel]);
  const selectedImageSize = supportedImageSizes.includes(selectedImageSizeByMode[mode])
    ? selectedImageSizeByMode[mode]
    : selectedImageModel?.defaultSize && supportedImageSizes.includes(selectedImageModel.defaultSize)
      ? selectedImageModel.defaultSize
      : supportedImageSizes[0] ?? DEFAULT_IMAGE_SIZE;
  const selectedImageSizeLabel = getImageSizeLabel(selectedImageSize, locale);
  const advancedSettingsSummary = formatTemplate(t.advancedSummary, { size: selectedImageSizeLabel });
  const currentCost = selectedImageModel?.costCredits[mode] ?? DEFAULT_IMAGE_MODEL_COST[mode];
  const modelStatusDotClass =
    systemStatus === "available"
      ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.55)]"
      : systemStatus === "unavailable"
        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]"
        : isDark
          ? "bg-slate-500"
          : "bg-gray-400";
  const i2iPromptPlaceholder = locale === "zh"
    ? "输入 @ 引用参考图，例如让 @R2 延续 @R1 的构图。"
    : "Type @ to reference uploaded images, e.g. redraw @R1 in the style of @R2.";
  const billingCopy = useMemo(
    () =>
      locale === "zh"
        ? {
            walletTitle: "钱包与订阅",
            currentCredits: "当前可用积分",
            checkIn: `领取今日奖励 +${dailyCheckInCredits} 积分`,
            checkedIn: `今日已签到 (+${dailyCheckInCredits} 积分)`,
            getCredits: "获取积分",
            history: "流水明细",
            dashboardTitle: "账单与订阅中心",
            backToWorkspace: "返回工作台",
            overview: "数据总览",
            transactionHistory: "积分流水",
            filterAll: "全部记录",
            filterConsumed: "仅看消耗",
            filterEarned: "仅看获得",
            currentPlan: "当前方案",
            freePlan: "免费基础版",
            upgradePlan: "升级至专业版",
            usageLast7Days: "近 7 日消耗趋势",
            insufficientCredits: `积分不足，本次渲染需要 ${currentCost} 积分。`,
            checkInSuccess: `签到成功，获得 ${dailyCheckInCredits} 积分。`,
            noHistory: "暂无相关记录",
            createTab: "创作",
            historyTab: "历史",
            galleryTab: "画廊",
            galleryComingSoon: "画廊即将开放",
            generationHistory: "历史",
            generationHistoryTitle: "我的生成历史",
            generationHistorySubtitle: "查看你最近生成的图片、提示词和参数。",
            generationHistoryLoadFailed: "无法加载生成历史。",
            noGenerationHistory: "暂无生成记录",
            openResult: "查看结果",
            dimensions: "尺寸",
            billingCenter: "账单与订阅中心",
            starterPack: "轻量创作包",
            creatorPack: "进阶灵感包",
            proPack: "专业生产力",
            entriesLabel: "条记录",
          }
        : {
            walletTitle: "Wallet & Subscription",
            currentCredits: "Available Credits",
            checkIn: `Claim Daily +${dailyCheckInCredits} Credits`,
            checkedIn: `Checked in (+${dailyCheckInCredits} Credits)`,
            getCredits: "Get Credits",
            history: "History",
            dashboardTitle: "Billing & Subscription",
            backToWorkspace: "Back to Workspace",
            overview: "Overview",
            transactionHistory: "Transactions",
            filterAll: "All",
            filterConsumed: "Consumed",
            filterEarned: "Earned",
            currentPlan: "Current Plan",
            freePlan: "Free Tier",
            upgradePlan: "Upgrade to Pro",
            usageLast7Days: "Usage (Last 7 Days)",
            insufficientCredits: `Insufficient credits. This render requires ${currentCost} credits.`,
            checkInSuccess: `Check-in successful. +${dailyCheckInCredits} credits.`,
            noHistory: "No transactions yet.",
            createTab: "Create",
            historyTab: "History",
            galleryTab: "Gallery",
            galleryComingSoon: "Gallery is coming soon.",
            generationHistory: "History",
            generationHistoryTitle: "My Generation History",
            generationHistorySubtitle: "Review your recent images, prompts, and render parameters.",
            generationHistoryLoadFailed: "Unable to load generation history.",
            noGenerationHistory: "No generations yet.",
            openResult: "Open result",
            dimensions: "Dimensions",
            billingCenter: "Billing & Subscription",
            starterPack: "Starter Pack",
            creatorPack: "Creator Pack",
            proPack: "Pro Studio",
            entriesLabel: "entries",
          },
    [currentCost, dailyCheckInCredits, locale],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("sparkpost-locale");
    if (saved === "zh" || saved === "en") setLocale(saved);
    setIsLocaleReady(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sparkpost-locale", locale);
  }, [locale]);

  const applyImageModels = useCallback((data: SuccessfulImageModelsResponse) => {
    const normalizedItems = data.items
      .filter((item) => item && typeof item.id === "string" && typeof item.label === "string")
      .map((item) => {
        const supports = {
          t2i: Boolean(item.supports?.t2i),
          i2i: Boolean(item.supports?.i2i),
        };

        return {
          id: item.id,
          label: item.label,
          isDefault: Boolean(item.isDefault),
          supports,
          supportedSizes: Array.isArray(item.supportedSizes) ? item.supportedSizes.filter((size) => typeof size === "string") : undefined,
          defaultSize: typeof item.defaultSize === "string" ? item.defaultSize : undefined,
          costCredits: {
            t2i: typeof item.costCredits?.t2i === "number" ? item.costCredits.t2i : supports.t2i ? DEFAULT_IMAGE_MODEL_COST.t2i : null,
            i2i: typeof item.costCredits?.i2i === "number" ? item.costCredits.i2i : supports.i2i ? DEFAULT_IMAGE_MODEL_COST.i2i : null,
          },
        } satisfies ImageModelItem;
      });

    setAvailableImageModels(normalizedItems);
    setSelectedImageModelByMode((current) => {
      const next = { ...current };
      (["t2i", "i2i"] as const).forEach((targetMode) => {
        const supportedItems = normalizedItems.filter((item) => item.supports[targetMode]);
        const selectedItem = supportedItems.find((item) => item.id === current[targetMode]);
        if (selectedItem) return;
        next[targetMode] =
          supportedItems.find((item) => item.id === data.defaultModelId)?.id ??
          supportedItems.find((item) => item.isDefault)?.id ??
          supportedItems[0]?.id ??
          current[targetMode];
      });
      return next;
    });
  }, []);

  const loadBootstrap = useCallback(async (signal?: AbortSignal) => {
    if (shouldUseLocalPreview()) {
      const previewUser = createLocalPreviewUser();
      setUser(previewUser);
      setEmail(previewUser.email);
      applyImageModels(getFallbackImageModelsResponse());
      setSystemStatus("available");
      setHasCheckedIn(false);
      setDailyCheckInCredits(20);
      setRecentCreditHistory([]);
      setAuthNotice({
        type: "info",
        text:
          locale === "zh"
            ? "本地预览模式已启用，当前工作台使用模拟账户。"
            : "Local preview mode is enabled with a mock workspace account.",
      });
      return;
    }

    const response = await fetchApi(`/api/bootstrap?locale=${locale}`, { cache: "no-store", signal });
    if (!response.ok) throw new Error(t.sessionLoadFailed);
    const data = (await response.json().catch(() => null)) as BootstrapResponse | null;
    if (!data || !("ok" in data) || data.ok !== true) throw new Error(t.sessionLoadFailed);

    if (signal?.aborted) return;
    applyImageModels(data.imageModels);
    if (data.imageStatus?.status === "available" || data.imageStatus?.status === "unavailable" || data.imageStatus?.status === "unknown") {
      setSystemStatus(data.imageStatus.status);
    }
    setUser(data.user);
    if (data.user) setEmail(data.user.email);
    setRecentCreditHistory(Array.isArray(data.recentCreditHistory) ? data.recentCreditHistory : []);
    if (data.creditSummary) {
      setHasCheckedIn(data.creditSummary.hasCheckedInToday);
      setDailyCheckInCredits(data.creditSummary.dailyCheckInCredits);
      setUsageLast7Days(data.creditSummary.usageLast7Days);
    } else {
      setHasCheckedIn(false);
      setUsageLast7Days(Array(7).fill(0));
    }
  }, [applyImageModels, locale, t.sessionLoadFailed]);

  useEffect(() => {
    if (!isLocaleReady) return undefined;
    const controller = new AbortController();
    loadBootstrap(controller.signal)
      .catch((error) => {
        if (controller.signal.aborted) return;
        applyImageModels(getFallbackImageModelsResponse());
        setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.sessionLoadFailed });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingSession(false);
      });
    return () => controller.abort();
  }, [applyImageModels, isLocaleReady, loadBootstrap, t.sessionLoadFailed]);

  useEffect(() => {
    if (authStatus === "signedOut" && showLoginPanel && pendingGenerateAfterLogin) {
      setAuthNotice({ type: "info", text: t.loginToContinue });
    }
  }, [authStatus, pendingGenerateAfterLogin, showLoginPanel, t.loginToContinue]);


  useEffect(() => {
    if (!cooldownEndsAt) {
      setTimeLeft(0);
      return undefined;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setCooldownEndsAt(null);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [cooldownEndsAt]);

  useEffect(() => {
    if (showLoginPanel) window.setTimeout(() => emailRef.current?.focus(), 40);
  }, [showLoginPanel]);

  useEffect(() => {
    if (authStatus === "signedIn" && !pendingGenerateAfterLogin) getRenderedPromptEditor()?.focus();
  }, [authStatus, getRenderedPromptEditor, pendingGenerateAfterLogin]);

  useEffect(() => {
    const editor = getRenderedPromptEditor();
    if (!isTypingRef.current && editor) {
      syncEditorHTML(prompts[mode], editor, uploadedImages, mode);
    }
    isTypingRef.current = false;
  }, [getRenderedPromptEditor, isDark, mode, prompts, uploadedImages]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
      if (modelSelectorRef.current && event.target instanceof Node && !modelSelectorRef.current.contains(event.target)) {
        setIsModelSelectorOpen(false);
      }
      if (sizeSelectorRef.current && event.target instanceof Node && !sizeSelectorRef.current.contains(event.target)) {
        setIsSizeSelectorOpen(false);
      }
      if (mentionMenuRef.current && event.target instanceof Node && !mentionMenuRef.current.contains(event.target)) {
        setShowMentionMenu(false);
        setMentionMenuPos(null);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const loadRecentCreditHistory = useCallback(async () => {
    if (!userId) return;
    const response = await fetchApi(`/api/credits/transactions?filter=all&limit=5&locale=${locale}`, {
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as CreditTransactionsResponse | null;
    if (!response.ok || !data || !("ok" in data) || data.ok !== true) {
      throw new Error(locale === "zh" ? "鏃犳硶鍔犺浇绉垎娴佹按銆?" : "Unable to load transaction history.");
    }
    setRecentCreditHistory(data.items);
  }, [locale, userId]);

  const loadDashboardCreditHistory = useCallback(async () => {
    if (!userId) return;
    const response = await fetchApi(
      `/api/credits/transactions?filter=${historyFilter}&limit=50&locale=${locale}`,
      { cache: "no-store" },
    );
    const data = (await response.json().catch(() => null)) as CreditTransactionsResponse | null;
    if (!response.ok || !data || !("ok" in data) || data.ok !== true) {
      throw new Error(locale === "zh" ? "鏃犳硶鍔犺浇绉垎娴佹按銆?" : "Unable to load transaction history.");
    }
    setDashboardCreditHistory(data.items);
  }, [historyFilter, locale, userId]);

  const generationHistoryLoadFailedText = billingCopy.generationHistoryLoadFailed;

  const loadGenerationHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsGenerationHistoryLoading(true);
    setGenerationHistoryNotice(null);
    try {
      const response = await fetchApi("/api/generations/history?limit=24", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as GenerationHistoryResponse | null;
      if (!response.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(generationHistoryLoadFailedText);
      }
      setGenerationHistoryItems(data.items);
    } catch (error) {
      setGenerationHistoryNotice(error instanceof Error ? error.message : generationHistoryLoadFailedText);
    } finally {
      setIsGenerationHistoryLoading(false);
    }
  }, [generationHistoryLoadFailedText, user?.id]);

  useEffect(() => {
    if (!userId) {
      setHasCheckedIn(false);
      setRecentCreditHistory([]);
      setDashboardCreditHistory([]);
      setUsageLast7Days(Array(7).fill(0));
      setGenerationHistoryItems([]);
      setShowGenerationHistory(false);
      return;
    }
  }, [userId]);

  useEffect(() => {
    if (!showDashboard || !userId) return;
    void loadDashboardCreditHistory().catch(() => {});
  }, [loadDashboardCreditHistory, showDashboard, userId]);

  useEffect(() => {
    if (!showGenerationHistory || !user?.id) {
      generationHistoryAutoLoadKeyRef.current = null;
      return;
    }

    const autoLoadKey = `${user.id}:${locale}`;
    if (generationHistoryAutoLoadKeyRef.current === autoLoadKey) return;
    generationHistoryAutoLoadKeyRef.current = autoLoadKey;
    void loadGenerationHistory();
  }, [loadGenerationHistory, locale, showGenerationHistory, user?.id]);

  const getLivePromptValue = useCallback(() => {
    const editor = getRenderedPromptEditor();
    if (!editor) return currentPrompt;
    return editor.innerText.replace(/\u00A0/g, " ");
  }, [currentPrompt, getRenderedPromptEditor]);

  const releasePromptFocus = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const editor = getRenderedPromptEditor();
    if (!editor || !(event.target instanceof Node) || editor.contains(event.target)) return;
    if (document.activeElement !== editor) return;

    const pageScrollX = window.scrollX;
    const pageScrollY = window.scrollY;
    const scrollContainers = [editor.closest("aside"), event.currentTarget]
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .map((element) => ({ element, scrollTop: element.scrollTop, scrollLeft: element.scrollLeft }));

    editor.blur();
    const selection = window.getSelection();
    if (selection?.anchorNode && editor.contains(selection.anchorNode)) selection.removeAllRanges();

    requestAnimationFrame(() => {
      window.scrollTo(pageScrollX, pageScrollY);
      scrollContainers.forEach(({ element, scrollTop, scrollLeft }) => {
        element.scrollTop = scrollTop;
        element.scrollLeft = scrollLeft;
      });
    });
  }, [getRenderedPromptEditor]);

  const generateImage = useCallback(async () => {
    setGenerationNotice(null);
    const promptForRequest = getLivePromptValue();
    setPrompts((current) => (current[mode] === promptForRequest ? current : { ...current, [mode]: promptForRequest }));
    if (!promptForRequest.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }
    if (mode === "i2i" && uploadedImages.length === 0) {
      setGenerationNotice({ type: "error", text: t.uploadHint });
      return;
    }
    if (user && user.creditBalance < currentCost) {
      setGenerationNotice({ type: "error", text: billingCopy.insufficientCredits });
      setActiveBillingTab("topup");
      setIsDrawerOpen(true);
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setGenerationTask(null);
    setPreviewLoadFailed(false);
      try {
        const response = await fetchApi("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        body: JSON.stringify({
          mode,
          modelId: selectedImageModelId,
          ...(ENABLE_IMAGE_SIZE_SELECTOR ? { size: selectedImageSize } : {}),
          prompt: promptForRequest,
          referenceImages: mode === "i2i" ? uploadedImages : [],
        }),
        });
      const data = (await response.json().catch(() => null)) as GenerateImageResponse | null;
      if (!response.ok) {
        const errorText = data && "error" in data ? formatApiError(data, t.generateFailed) : t.generateFailed;
        setGenerationNotice({ type: "error", text: errorText });
        if (response.status === 503) setSystemStatus("unavailable");
        return;
      }
      if (!data || !("ok" in data) || data.ok !== true) {
        setGenerationNotice({ type: "error", text: t.unexpectedPayload });
        return;
      }
      setSystemStatus("available");
      setGenerationTask(data.task);
      setGeneratedImageUrl(primaryImageUrl(data.task));
      setGenerationNotice({ type: "success", text: formatTemplate(t.generateSuccess, { count: data.task.assets.length }) });
      setUser((current) => {
        if (!current || current.creditBalance === data.task.remainingCredits) return current;
        return { ...current, creditBalance: data.task.remainingCredits };
      });
      if (!primaryImageUrl(data.task)) setGenerationNotice({ type: "info", text: t.imagePreviewUnavailable });
    } catch (error) {
      setGenerationNotice({ type: "error", text: error instanceof Error ? error.message : t.generateFailed });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [billingCopy.insufficientCredits, currentCost, getLivePromptValue, mode, selectedImageModelId, selectedImageSize, t.enterPrompt, t.generateFailed, t.generateSuccess, t.imagePreviewUnavailable, t.unexpectedPayload, t.uploadHint, uploadedImages, user]);

  useEffect(() => {
    if (user && pendingGenerateAfterLogin && !isGeneratingImage) {
      setPendingGenerateAfterLogin(false);
      void generateImage();
    }
  }, [generateImage, isGeneratingImage, pendingGenerateAfterLogin, user]);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) {
      setAuthNotice({ type: "error", text: t.enterEmail });
      return;
    }
    setIsSendingCode(true);
    try {
      const response = await fetchApi("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        if (response.status === 429) {
          const retry = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retry * 1000);
          setAuthNotice({ type: "error", text: formatTemplate(t.requestTooFast, { time: timeLeftText(retry) }) });
          return;
        }
        throw new Error(typeof data?.error === "string" ? data.error : t.sendCodeFailed);
      }
      const expiresAt = typeof data?.expiresAt === "string" ? data.expiresAt : null;
      const debugCode = typeof data?.debugCode === "string" ? data.debugCode : null;
      setCode(debugCode ?? "");
      setAuthNotice({
        type: "success",
        text: formatTemplate(t.sentCode, {
          email,
          expires: expiresAt ? ` ${new Date(expiresAt).toLocaleTimeString()}.` : "",
        }),
      });
      codeRef.current?.focus();
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.sendCodeFailed });
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) {
      setAuthNotice({ type: "error", text: t.enterSameEmail });
      return;
    }
    if (!code.trim()) {
      setAuthNotice({ type: "error", text: t.enterCode });
      return;
    }
    setIsVerifyingCode(true);
    try {
      const response = await fetchApi("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        if (response.status === 429) {
          const retry = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retry * 1000);
          setAuthNotice({ type: "error", text: formatTemplate(t.verifyTooFast, { time: timeLeftText(retry) }) });
          return;
        }
        throw new Error(typeof data?.error === "string" ? data.error : t.verifyCodeFailed);
      }
      const nextUser = data?.user;
      if (nextUser && typeof nextUser === "object" && "email" in nextUser) {
        const verifiedUser = nextUser as AuthUser;
        setUser(verifiedUser);
        setEmail(verifiedUser.email);
        setCode("");
        setCooldownEndsAt(null);
        setShowLoginPanel(false);
        setAuthNotice({ type: "success", text: data?.isNewUser === true ? t.signedInNewNotice : t.signedInExistingNotice });
        await loadBootstrap();
      } else {
        await loadBootstrap();
        setShowLoginPanel(false);
      }
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.verifyCodeFailed });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function handleLogout() {
    setAuthNotice(null);
    setGenerationNotice(null);
    try {
      const response = await fetchApi("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(t.logoutFailed);
      setUser(null);
      setCode("");
      setShowAccountMenu(false);
      setShowDashboard(false);
      setShowGenerationHistory(false);
      setIsDrawerOpen(false);
      setShowLoginPanel(false);
      setPendingGenerateAfterLogin(false);
      setGenerationTask(null);
      setGeneratedImageUrl(null);
      setPreviewLoadFailed(false);
      setHasCheckedIn(false);
      setRecentCreditHistory([]);
      setDashboardCreditHistory([]);
      setGenerationHistoryItems([]);
      setUsageLast7Days(Array(7).fill(0));
      setAuthNotice({ type: "info", text: t.signedOutNotice });
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.logoutFailed });
    }
  }

  function startRenderIntent() {
    const promptForRequest = getLivePromptValue();
    setPrompts((current) => (current[mode] === promptForRequest ? current : { ...current, [mode]: promptForRequest }));
    if (!promptForRequest.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }
    if (user) {
      void generateImage();
      return;
    }
    setShowLoginPanel(true);
    setPendingGenerateAfterLogin(true);
    setAuthNotice({ type: "info", text: t.loginToContinue });
  }

  async function handleCheckIn() {
    if (!user || hasCheckedIn || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      const response = await fetchApi("/api/credits/check-in", { method: "POST" });
      const data = (await response.json().catch(() => null)) as CreditCheckInResponse | null;
      if (!response.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(locale === "zh" ? "签到失败，请稍后重试。" : "Check-in failed. Please try again.");
      }
      setUser((current) => {
        if (!current || current.creditBalance === data.creditBalance) return current;
        return { ...current, creditBalance: data.creditBalance };
      });
      setHasCheckedIn(data.hasCheckedInToday);
      setDailyCheckInCredits(data.dailyCheckInCredits);
      setUsageLast7Days(data.usageLast7Days);
      setGenerationNotice({ type: "success", text: billingCopy.checkInSuccess });
      await loadRecentCreditHistory();
      if (showDashboard) await loadDashboardCreditHistory();
    } catch (error) {
      setGenerationNotice({
        type: "error",
        text: error instanceof Error ? error.message : locale === "zh" ? "签到失败，请稍后重试。" : "Check-in failed. Please try again.",
      });
    } finally {
      setIsCheckingIn(false);
    }
  }

  function handleModeSwitch(nextMode: Mode) {
    setMode(nextMode);
    setIsModelSelectorOpen(false);
    setIsSizeSelectorOpen(false);
    setIsAdvancedSettingsOpen(false);
    setShowMentionMenu(false);
    setMentionMenuPos(null);
    isTypingRef.current = false;
  }

  function getBadgeHTML(imageUrl: string, index: number) {
    const background = isDark ? "#222" : "#ecfeff";
    const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(6,182,212,0.3)";
    return `<span class="mention-badge" contenteditable="false" data-img="${imageUrl}" style="display:inline-block;vertical-align:middle;user-select:none;"><span style="display:inline-block;height:22px;line-height:20px;padding:0 6px;border-radius:4px;background:${background};border:1px solid ${border};box-sizing:border-box;white-space:nowrap;"><img src="${imageUrl}" style="display:inline-block;width:14px;height:14px;border-radius:2px;object-fit:cover;vertical-align:middle;margin-right:4px;pointer-events:none;" /><span style="display:inline-block;font-size:11px;font-weight:700;color:#06b6d4;vertical-align:middle;pointer-events:none;margin-bottom:1px;">@R${index + 1}</span></span></span>`;
  }

  function syncEditorHTML(value: string, editor: HTMLElement, images: string[], currentMode: Mode) {
    let html = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    if (currentMode === "i2i") {
      images.forEach((imageUrl, index) => {
        html = html.replace(new RegExp(`@R${index + 1}\\b`, "g"), getBadgeHTML(imageUrl, index));
      });
    }
    if (editor.innerHTML !== html) editor.innerHTML = html;
  }

  function handleEditorInput(event: FormEvent<HTMLDivElement>, currentMode: Mode, surface: "landing" | "workspace") {
    const editor = event.currentTarget;
    rememberPromptEditor(surface, editor);
    isTypingRef.current = true;

    const nextValue = editor.innerText.replace(/\u00A0/g, " ");
    setPrompts((current) => ({ ...current, [currentMode]: nextValue }));

    if (currentMode === "i2i" && uploadedImages.length > 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) ?? "";
        const mentionMatch = textBefore.match(/@([^\s@]*)$/);
        const nextQuery = mentionMatch?.[1]?.toLowerCase() ?? "";
        const isReferenceQuery = mentionMatch !== null && (nextQuery === "" || /^r\d*$/.test(nextQuery));

        if (isReferenceQuery) {
          const hasMatches =
            nextQuery === "" || uploadedImages.some((_, index) => `r${index + 1}`.startsWith(nextQuery));

          if (!hasMatches) {
            setMentionQuery("");
            setShowMentionMenu(false);
            setMentionMenuPos(null);
            return;
          }

          savedRangeRef.current = range.cloneRange();
          setMentionQuery(nextQuery);
          let rect = range.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            const probe = document.createElement("span");
            probe.textContent = "\u200b";
            range.insertNode(probe);
            rect = probe.getBoundingClientRect();
            probe.parentNode?.removeChild(probe);
          }
          setMentionMenuPos({ top: rect.bottom + 4, left: Math.max(16, rect.left) });
          setShowMentionMenu(true);
          return;
        }
      }
    }

    setMentionQuery("");
    setShowMentionMenu(false);
    setMentionMenuPos(null);
  }

  function handleEditorPaste(event: ClipboardEvent<HTMLDivElement>, currentMode: Mode, surface: "landing" | "workspace") {
    event.preventDefault();
    const editor = event.currentTarget;
    rememberPromptEditor(surface, editor);

    const plainText = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    if (!plainText) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.focus();
      document.execCommand("insertText", false, plainText);
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const lines = plainText.split("\n");
      const fragment = document.createDocumentFragment();
      lines.forEach((line, index) => {
        if (line.length > 0) fragment.appendChild(document.createTextNode(line));
        if (index < lines.length - 1) fragment.appendChild(document.createElement("br"));
      });

      const lastNode = fragment.lastChild;
      range.insertNode(fragment);

      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    isTypingRef.current = true;
    const nextValue = editor.innerText.replace(/\u00A0/g, " ");
    setPrompts((current) => ({ ...current, [currentMode]: nextValue }));
    setMentionQuery("");
    setShowMentionMenu(false);
    setMentionMenuPos(null);
  }

  function insertMention(index: number) {
    if (!savedRangeRef.current || !activeEditorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);

    const range = savedRangeRef.current;
    const startContainer = range.startContainer;
    const textBefore = startContainer.textContent?.slice(0, range.startOffset) ?? "";
    const match = textBefore.match(/@([^\s@]*)$/);
    if (!match) return;

    range.setStart(startContainer, range.startOffset - match[0].length);
    range.deleteContents();

    const fragment = document.createRange().createContextualFragment(getBadgeHTML(uploadedImages[index], index));
    const badgeNode = fragment.firstChild;
    if (!badgeNode) return;

    range.insertNode(badgeNode);
    range.setStartAfter(badgeNode);
    range.setEndAfter(badgeNode);

    const spacer = document.createTextNode("\u00A0");
    range.insertNode(spacer);
    range.setStartAfter(spacer);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    setMentionQuery("");
    setShowMentionMenu(false);
    setMentionMenuPos(null);
    isTypingRef.current = true;
    setPrompts((current) => ({ ...current, [mode]: activeEditorRef.current!.innerText.replace(/\u00A0/g, " ") }));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = 5 - uploadedImages.length;
    const selectedFiles = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setGenerationNotice({
        type: "info",
        text: locale === "zh" ? "最多只能上传 5 张参考图。" : "You can upload up to 5 reference images.",
      });
    }

    Promise.all(
      selectedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result ?? ""));
            reader.readAsDataURL(file);
          }),
      ),
    ).then((nextImages) => {
      setUploadedImages((current) => [...current, ...nextImages.filter(Boolean)]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function removeImage(indexToRemove: number) {
    setUploadedImages((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function renderReferenceUpload() {
    if (mode !== "i2i") return null;

    return (
      <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="mb-2 flex items-center justify-between">
          <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            {t.uploadReference} <span className="normal-case tracking-normal text-cyan-500">({uploadedImages.length}/5)</span>
          </div>
        </div>

        {uploadedImages.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-3">
            {uploadedImages.map((imageUrl, index) => (
              <div key={`${imageUrl}-${index}`} onClick={() => setPreviewImage(imageUrl)} className={`group relative h-[60px] w-[60px] cursor-pointer overflow-hidden rounded-lg border transition-colors ${isDark ? "border-white/10 hover:border-cyan-400/60" : "border-gray-200 hover:border-cyan-500"}`}>
                <img src={imageUrl} alt={`Reference ${index + 1}`} className="h-full w-full object-cover" />
                <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-md">R{index + 1}</div>
                <button
                  type="button"
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    removeImage(index);
                  }}
                  disabled={isGeneratingImage}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100 disabled:cursor-not-allowed"
                  aria-label={`Remove reference ${index + 1}`}
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
            {uploadedImages.length < 5 ? (
              <div className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isGeneratingImage ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isDark ? "border-white/10 text-slate-400 hover:border-cyan-400/50 hover:bg-white/[0.05] hover:text-cyan-300" : "border-gray-300 text-gray-400 hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600"}`}>
                <PlusIcon />
                <input
                  ref={fileInputRef}
                  id={referenceUploadInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isGeneratingImage}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div
            className={`relative flex h-24 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${isGeneratingImage ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isDark ? "border-white/10 bg-white/[0.02] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300" : "border-gray-300 bg-gray-50 text-gray-400 hover:border-cyan-400/40 hover:text-cyan-600"}`}
          >
            <UploadIcon />
            <span className="mt-2 text-xs">{locale === "zh" ? "点击上传，最多 5 张参考图" : "Click to upload up to 5 reference images"}</span>
            <input
              ref={fileInputRef}
              id={referenceUploadInputId}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={isGeneratingImage}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>
        )}
      </div>
    );
  }

  function renderPromptEditor(surface: "landing" | "workspace") {
    const isWorkspace = surface === "workspace";
    const commonClassName = isWorkspace
      ? isDark
        ? "border-white/5 bg-[#0A0A0A] text-white focus:border-white/15"
        : "border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-400"
      : isDark
        ? "border-white/5 bg-black/40 text-white focus:border-white/20"
        : "border-gray-200 bg-white text-gray-900 focus:border-gray-400";

    return (
      <div className="relative flex min-h-[140px] flex-1 flex-col">
        <div
          key={`${surface}-${mode}`}
          ref={(editor) => {
            if (!editor) return;
            if (surface === "workspace" || !user) rememberPromptEditor(surface, editor);
            if (editor.innerHTML === "") syncEditorHTML(prompts[mode], editor, uploadedImages, mode);
          }}
          contentEditable={!isGeneratingImage}
          suppressContentEditableWarning
          onFocus={(event) => {
            rememberPromptEditor(surface, event.currentTarget);
          }}
          onInput={(event) => handleEditorInput(event, mode, surface)}
          onPaste={(event) => handleEditorPaste(event, mode, surface)}
          className={`prompt-editor w-full flex-1 rounded-xl border p-4 text-sm outline-none transition ${commonClassName} ${mode === "i2i" ? "leading-[26px]" : isWorkspace ? "leading-7" : "leading-relaxed"}`}
          data-placeholder={mode === "i2i" ? i2iPromptPlaceholder : t.promptPlaceholder}
          style={{ minHeight: "140px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        />
      </div>
    );
  }

  const inspireButtonLabel = isInspiring ? (locale === "zh" ? "灵感生成中..." : "Generating ideas...") : t.inspire;
  const enhanceButtonLabel = isEnhancing ? (locale === "zh" ? "扩写中..." : "Enhancing...") : t.enhance;

  const statusCards = [
    { label: t.provider, value: getDisplayImageModel(generationTask?.model) },
    { label: t.status, value: isGeneratingImage ? t.rendering : interactionStatus === "authRequired" ? t.authRequired : interactionStatus === "checking" ? t.checking : t.ready },
    { label: t.account, value: authStatus === "signedIn" ? t.signedIn : authStatus === "signedOut" ? t.signedOut : t.checking },
    { label: t.canvasTitle, value: resultStatus === "success" ? t.resultSuccess : resultStatus === "error" ? t.resultError : t.resultEmpty },
  ];

  const featureCards = [
    { title: t.feature1Title, body: t.feature1Body, icon: <BrainIcon />, tint: isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-100" },
    { title: t.feature2Title, body: t.feature2Body, icon: <SparklesIcon />, tint: isDark ? "text-violet-400 bg-violet-500/10 border-violet-500/20" : "text-violet-600 bg-violet-50 border-violet-100" },
    { title: t.feature3Title, body: t.feature3Body, icon: <ShieldIcon />, tint: isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-600 bg-emerald-50 border-emerald-100" },
  ];

  const filteredMentionOptions = uploadedImages
    .map((imageUrl, index) => ({
      imageUrl,
      index,
      label: `r${index + 1}`,
    }))
    .filter((option) => mentionQuery === "" || option.label.startsWith(mentionQuery));

  function applyPromptValue(nextValue: string, targetMode: Mode) {
    isTypingRef.current = false;
    setPrompts((current) => ({ ...current, [targetMode]: nextValue }));

    if (activeEditorRef.current && targetMode === mode) {
      syncEditorHTML(nextValue, activeEditorRef.current, uploadedImages, targetMode);
    }
  }

  async function handlePromptAssist(action: "inspire" | "enhance") {
    setGenerationNotice(null);
    const promptForRequest = getLivePromptValue();
    setPrompts((current) => (current[mode] === promptForRequest ? current : { ...current, [mode]: promptForRequest }));
    if (!promptForRequest.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }

    const setPendingState = action === "inspire" ? setIsInspiring : setIsEnhancing;
    const fallbackError = action === "inspire" ? t.inspireNotice : t.enhanceNotice;
    const successText =
      locale === "zh"
        ? action === "inspire"
          ? "已生成新的灵感提示词，可继续编辑或直接渲染。"
          : "已完成智能扩写，可继续微调后渲染。"
        : action === "inspire"
          ? "A new inspiration prompt is ready. You can refine it or render directly."
          : "Prompt enhanced successfully. You can fine-tune it before rendering.";

    setPendingState(true);
    try {
      const response = await fetchApi(action === "inspire" ? "/api/prompt/inspire" : "/api/prompt/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptForRequest, mode }),
      });
      const data = (await response.json().catch(() => null)) as PromptAssistResponse | null;

      if (!response.ok) {
        const errorText = data && "error" in data && typeof data.error === "string" ? data.error : fallbackError;
        setGenerationNotice({ type: "error", text: errorText });
        return;
      }

      if (!data || !("ok" in data) || data.ok !== true || typeof data.prompt !== "string") {
        setGenerationNotice({ type: "error", text: t.unexpectedPayload });
        return;
      }

      const normalizedPrompt = data.prompt.trim();
      if (!normalizedPrompt) {
        setGenerationNotice({ type: "error", text: t.unexpectedPayload });
        return;
      }

      applyPromptValue(normalizedPrompt, mode);
      setGenerationNotice({ type: "success", text: successText });
    } catch (error) {
      setGenerationNotice({ type: "error", text: error instanceof Error ? error.message : fallbackError });
    } finally {
      setPendingState(false);
    }
  }

  const renderSurface = generatedImageUrl && !previewLoadFailed ? (
    <div className={`relative h-full min-h-[320px] w-full overflow-hidden rounded-[1.5rem] border ${isDark ? "border-white/10 bg-black/50 shadow-[0_20px_80px_rgba(0,0,0,0.35)]" : "border-gray-200 bg-white shadow-[0_20px_80px_rgba(148,163,184,0.22)]"}`}>
      <Image src={generatedImageUrl} alt="Generated preview" fill unoptimized className="object-contain" onError={() => setPreviewLoadFailed(true)} />
    </div>
  ) : isGeneratingImage ? (
    <div className={`flex h-full min-h-[320px] w-full flex-col items-center justify-center rounded-[1.5rem] border px-6 text-center ${isDark ? "border-white/10 bg-[#0b0f16]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" : "border-gray-200 bg-white/80 shadow-xl backdrop-blur-md"}`}>
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full border ${isDark ? "border-white/10 bg-[#0A0A0A]" : "border-gray-200 bg-white shadow-xl"}`}>
        <div className={`h-6 w-6 rounded-full border-2 animate-spin ${isDark ? "border-cyan-500/30 border-t-cyan-500" : "border-cyan-500/20 border-t-cyan-500"}`} />
      </div>
      <div className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.rendering}</div>
      <p className={`mt-3 max-w-[220px] text-xs leading-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{t.workspaceBody}</p>
    </div>
  ) : (
    <div className={`flex h-full min-h-[320px] w-full flex-col items-center justify-center rounded-[1.5rem] border px-6 text-center ${isDark ? "border-white/10 bg-[#0b0f16]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" : "border-gray-200 bg-white/80 shadow-xl backdrop-blur-md"}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border ${isDark ? "border-white/10 bg-[#111]" : "border-gray-200 bg-gray-50"}`}><div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isDark ? "bg-white/20" : "bg-gray-400"}`} /></div>
      <div className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.canvasEmptyTitle}</div>
      <p className={`mt-2 text-center text-xs leading-relaxed ${isDark ? "text-[#666]" : "text-gray-500"}`}>{previewLoadFailed ? t.imagePreviewUnavailable : t.canvasEmptyBody}</p>
    </div>
  );

  function renderGenerationHistoryView() {
    return (
      <section className={`min-h-[calc(100vh-4rem)] w-full px-6 py-8 ${isDark ? "bg-[#000]" : "bg-gray-50"}`}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{billingCopy.generationHistoryTitle}</h2>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>{billingCopy.generationHistorySubtitle}</p>
            </div>
            <button type="button" onClick={() => void loadGenerationHistory()} disabled={isGenerationHistoryLoading} className={`rounded-xl border px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
              {isGenerationHistoryLoading ? t.checking : t.refresh}
            </button>
          </div>

          {generationHistoryNotice ? (
            <div className="mb-4"><NoticeBanner notice={{ type: "error", text: generationHistoryNotice }} /></div>
          ) : null}

          {isGenerationHistoryLoading && generationHistoryItems.length === 0 ? (
            <div className={`rounded-2xl border p-12 text-center text-sm ${isDark ? "border-white/5 bg-[#111] text-slate-400" : "border-gray-200 bg-white text-gray-500"}`}>{t.checking}</div>
          ) : generationHistoryItems.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {generationHistoryItems.map((item) => {
                const imageUrl = primaryHistoryImageUrl(item);
                const dimensions = item.assets[0]?.width && item.assets[0]?.height ? `${item.assets[0].width}x${item.assets[0].height}` : item.requestedSize ?? "-";

                return (
                  <article key={item.id} className={`overflow-hidden rounded-2xl border shadow-sm ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white"}`}>
                    <div className={`relative flex aspect-[4/3] items-center justify-center border-b ${isDark ? "border-white/5 bg-black" : "border-gray-100 bg-gray-50"}`}>
                      {imageUrl ? (
                        <Image src={imageUrl} alt={item.prompt} fill unoptimized loading="lazy" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-contain" />
                      ) : (
                        <div className={`flex flex-col items-center gap-3 text-sm ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                          <ImageIcon />
                          {item.status}
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.status === "succeeded" ? "bg-emerald-500/10 text-emerald-400" : item.status === "failed" ? "bg-rose-500/10 text-rose-400" : "bg-cyan-500/10 text-cyan-400"}`}>{item.status}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] ${isDark ? "bg-white/5 text-slate-300" : "bg-gray-100 text-gray-600"}`}>{getDisplayImageModel(item.model)}</span>
                        </div>
                        <p className={`line-clamp-3 text-sm leading-6 ${isDark ? "text-slate-200" : "text-gray-800"}`}>{item.prompt}</p>
                      </div>
                      <div className={`grid grid-cols-2 gap-3 text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        <div>
                          <div className="uppercase tracking-wide opacity-60">{billingCopy.dimensions}</div>
                          <div className={`mt-1 font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>{dimensions}</div>
                        </div>
                        <div>
                          <div className="uppercase tracking-wide opacity-60">{t.cost}</div>
                          <div className={`mt-1 font-mono ${isDark ? "text-slate-200" : "text-gray-800"}`}>{item.costCredits} {t.credits}</div>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between border-t pt-3 text-xs ${isDark ? "border-white/5 text-slate-500" : "border-gray-100 text-gray-500"}`}>
                        <span>{formatDate(item.completedAt ?? item.createdAt, locale)}</span>
                        {imageUrl ? (
                          <a href={imageUrl} target="_blank" rel="noreferrer" className={`font-semibold transition-colors ${isDark ? "text-cyan-300 hover:text-cyan-200" : "text-cyan-600 hover:text-cyan-500"}`}>{billingCopy.openResult}</a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={`rounded-2xl border p-12 text-center text-sm ${isDark ? "border-white/5 bg-[#111] text-slate-400" : "border-gray-200 bg-white text-gray-500"}`}>{billingCopy.noGenerationHistory}</div>
          )}
        </div>
      </section>
    );
  }

  const historyItems = dashboardCreditHistory;
  const drawerHistoryItems = recentCreditHistory;
  const usageMax = Math.max(...usageLast7Days, 1);
  const navTabs = [
    { id: "create", label: billingCopy.createTab, active: !showGenerationHistory, disabled: false },
    { id: "history", label: billingCopy.historyTab, active: showGenerationHistory, disabled: false },
    { id: "gallery", label: billingCopy.galleryTab, active: false, disabled: true },
  ] as const;

  return (
    <div className={isDark ? "dark" : ""}>
      <main className={`flex min-h-screen flex-col selection:bg-cyan-500/30 ${isDark ? "bg-[#000] text-[#EDEDED]" : "bg-gray-50 text-gray-900"}`}>

        <header className={`sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b px-6 backdrop-blur-md transition-colors duration-300 ${isDark ? "border-white/10 bg-black/50" : "border-gray-200 bg-white/70"}`}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden ${isDark ? "bg-[#06080d] border-cyan-500/20 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_12px_24px_rgba(0,0,0,0.28)]" : "bg-white border-gray-200"}`}>
              <div className="absolute h-5 w-5 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute h-5 w-5 rounded-full border border-indigo-500/30 animate-ping" style={{ animationDuration: "3s", animationDelay: "1.5s" }} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="relative z-10">
                <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)" stroke="url(#ring-grad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" />
                <circle cx="12" cy="12" r="5" fill="url(#planet-grad)" />
                <circle cx="3" cy="6" r="1.5" fill="#38bdf8"><animate attributeName="opacity" values="0.2; 1; 0.2" dur="2s" repeatCount="indefinite" /></circle>
                <circle cx="20" cy="18" r="1" fill="#818cf8"><animate attributeName="opacity" values="1; 0.2; 1" dur="3s" repeatCount="indefinite" /></circle>
                <defs>
                  <linearGradient id="planet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className={`text-[15px] font-bold tracking-wide transition-colors ${isDark ? "text-cyan-300 group-hover:text-cyan-200" : "text-gray-900 group-hover:text-cyan-600"}`}>{t.brand}</span>
            <div className={`mx-2 h-4 w-px ${isDark ? "bg-white/20" : "bg-gray-300"}`} />
            {user ? (
              <nav className={`hidden items-center rounded-full border p-0.5 md:flex ${isDark ? "border-white/10 bg-[#0A0A0A]" : "border-gray-200 bg-white"}`} aria-label="Workspace">
                {navTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={tab.disabled}
                    title={tab.disabled ? billingCopy.galleryComingSoon : undefined}
                    onClick={() => {
                      if (tab.id === "create") setShowGenerationHistory(false);
                      if (tab.id === "history") setShowGenerationHistory(true);
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45 ${tab.active ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-gray-100 text-gray-900 shadow-sm") : (isDark ? "text-[#888] hover:text-[#CCC]" : "text-gray-500 hover:text-gray-900")}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}
            <button type="button" onClick={(event) => { event.stopPropagation(); setIsDark((current) => !current); }} className={`rounded-full p-1.5 transition-colors ${isDark ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-200"}`}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center rounded-full border p-0.5 ${isDark ? "border-white/10 bg-[#0A0A0A]" : "border-gray-200 bg-white"}`}>
              {(["zh", "en"] as Locale[]).map((value) => (
                <button key={value} type="button" onClick={() => setLocale(value)} className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all duration-300 ${locale === value ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-gray-100 text-gray-900 shadow-sm") : (isDark ? "text-[#888] hover:text-[#CCC]" : "text-gray-500 hover:text-gray-900")}`}>
                  {value === "zh" ? "中文" : "EN"}
                </button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveBillingTab("topup");
                    setIsDrawerOpen(true);
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-100 border-gray-200 hover:bg-gray-200"}`}
                >
                  <div className={isDark ? "text-cyan-400" : "text-cyan-600"}><SparklesIcon /></div>
                  <span className={isDark ? "text-white" : "text-gray-900"}>{user.creditBalance} {t.credits}</span>
                </button>
                <div className="relative" ref={menuRef}>
                  <button type="button" onClick={() => setShowAccountMenu((current) => !current)} className={`flex items-center justify-center h-8 w-8 rounded-full border text-xs font-medium transition-colors shadow-sm ${isDark ? "bg-[#111] border-white/10 text-gray-300 hover:bg-[#222]" : "bg-gray-200 border-gray-300 text-gray-700 hover:bg-gray-300"}`}>
                    {accountInitials}
                  </button>
                  {showAccountMenu ? (
                    <div className={`absolute right-0 top-[calc(100%+12px)] z-50 w-56 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${isDark ? "border-white/10 bg-[#0A0A0A]/95" : "border-gray-200 bg-white/95"}`}>
                      <div className={`p-4 border-b ${isDark ? "border-white/10" : "border-gray-100"}`}>
                        <div className={`text-xs truncate ${isDark ? "text-[#888]" : "text-gray-500"}`}>{user.email}</div>
                        <div className={`text-sm font-semibold mt-1 ${isDark ? "text-white" : "text-gray-900"}`}>{user.creditBalance} {t.credits}</div>
                      </div>
                      <div className="p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAccountMenu(false);
                              setShowDashboard(true);
                            }}
                            className={`mb-1 flex w-full items-center gap-2 text-left rounded-lg px-3 py-2 text-xs transition-colors ${isDark ? "text-[#CCC] hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                          >
                            <CreditCardIcon />
                            {billingCopy.billingCenter}
                          </button>
                        <button type="button" onClick={() => void handleLogout()} className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${isDark ? "text-[#CCC] hover:bg-white/10 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}>
                          {t.signOut}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowLoginPanel(true)} className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${isDark ? "border-white/10 text-white hover:bg-white/10" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}>
                {t.signIn}
              </button>
            )}
          </div>
        </header>

        {!user ? (
          <div className="pb-24">
            <section className="relative min-h-[85vh] justify-center overflow-hidden px-5 pt-24 pb-16 sm:px-8">
              <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] ${isDark ? "bg-cyan-500/20" : "bg-cyan-400/10"}`} />
              <div className="relative z-10 mx-auto flex w-full max-w-[1720px] flex-col items-center text-center">
                <div className="mx-auto flex max-w-[1100px] flex-col items-center text-center">
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${isDark ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300" : "border-cyan-500/20 bg-cyan-50 text-cyan-600"}`}><span className={`h-2 w-2 rounded-full animate-pulse ${isDark ? "bg-cyan-400" : "bg-cyan-500"}`} />{t.heroBadge}</div>
                  <h1 className={`mt-10 max-w-5xl whitespace-pre-line bg-gradient-to-b bg-clip-text text-5xl font-bold leading-[1.1] tracking-tighter text-transparent md:text-7xl ${isDark ? "from-white to-white/60" : "from-gray-900 to-gray-500"}`}>{t.heroTitle}</h1>
                  <p className={`mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl ${isDark ? "text-[#888]" : "text-gray-600"}`}>{t.heroBody}</p>
                  <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
                    <button type="button" onClick={() => playgroundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}>{t.heroPrimary}<PlayIcon /></button>
                    <button type="button" onClick={() => window.scrollTo({ top: 800, behavior: "smooth" })} className={`rounded-full border px-6 py-3.5 text-sm font-medium transition ${isDark ? "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}>{t.heroSecondary}</button>
                  </div>
                </div>
                <div className="w-full max-w-[1720px]"><VisualHero isDark={isDark} /></div>
              </div>
            </section>

            <section id="feature-strip" className={`mx-auto max-w-[1480px] border-t px-6 py-24 ${isDark ? "border-white/5" : "border-gray-200"}`}><div className="grid gap-6 md:grid-cols-3">
              {featureCards.map((card) => (
                <article key={card.title} className={`group min-h-[320px] rounded-[1.5rem] border p-10 transition-colors ${isDark ? "border-white/5 bg-[#0A0A0A] shadow-none hover:border-cyan-500/30" : "border-gray-200 bg-white shadow-sm hover:border-cyan-500/30"}`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${card.tint}`}>{card.icon}</div>
                  <h2 className={`mt-6 text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{card.title}</h2>
                  <p className={`mt-3 text-sm leading-relaxed ${isDark ? "text-[#888]" : "text-gray-600"}`}>{card.body}</p>
                </article>
              ))}
              </div>
            </section>

            <section ref={playgroundRef} className="mx-auto max-w-[1480px] px-6 py-24">
              <div className="mb-12 text-center">
                <h2 className={`text-3xl font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>{t.playgroundTitle}</h2>
                <p className={`mx-auto mt-4 max-w-xl text-sm ${isDark ? "text-[#888]" : "text-gray-600"}`}>{t.playgroundBody}</p>
              </div>

              <div className={`overflow-hidden rounded-[2rem] border shadow-xl md:flex md:min-h-[520px] ${isDark ? "border-white/10 bg-[#0A0A0A]" : "border-gray-200 bg-white"}`}>
                <div className={`w-full border-b p-6 md:w-[380px] md:border-b-0 md:border-r ${isDark ? "border-white/10 bg-[#050505]" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`mb-5 flex rounded-xl border p-1 ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white shadow-sm"}`}>
                    <button type="button" onClick={() => handleModeSwitch("t2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "t2i" ? (isDark ? "bg-[#1f1f1f] text-white shadow-sm" : "bg-gray-100 text-gray-900 shadow-sm") : (isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900")}`}><SparklesIcon />{t.t2iMode}</button>
                    <button type="button" onClick={() => handleModeSwitch("i2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "i2i" ? (isDark ? "bg-[#1f1f1f] text-white shadow-sm" : "bg-gray-100 text-gray-900 shadow-sm") : (isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900")}`}><ImageIcon />{t.i2iMode}</button>
                  </div>

                  {renderReferenceUpload()}

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <label htmlFor="landing-prompt" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{t.promptLabel}</label>
                    <div className="flex gap-2">
                      <button type="button" disabled={isGeneratingImage || isInspiring || isEnhancing} onClick={() => void handlePromptAssist("inspire")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{inspireButtonLabel}</button>
                      <button type="button" disabled={isGeneratingImage || isInspiring || isEnhancing} onClick={() => void handlePromptAssist("enhance")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{enhanceButtonLabel}</button>
                    </div>
                  </div>

                  <div className="mt-3">{renderPromptEditor("landing")}</div>

                  <div className={`mt-5 space-y-4 border-t pt-5 ${isDark ? "border-white/5" : "border-gray-200"}`}>
                    {generationNotice ? <NoticeBanner notice={generationNotice} /> : null}
                    {authNotice && showLoginPanel ? <NoticeBanner notice={authNotice} /> : null}
                    <button type="button" onClick={startRenderIntent} disabled={!canRender} className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}>{isGeneratingImage ? t.rendering : t.renderNow}</button>
                    <p className={`text-center text-[11px] leading-relaxed ${isDark ? "text-[#666]" : "text-gray-500"}`}>{locale === "zh" ? "无需登录即可先输入 Prompt。系统会保留你的进度，并在你执行核心渲染时提示完成验证。" : "Enter your prompt without logging in. We will seamlessly save your progress and prompt you to verify when you execute the core render."}</p>
                    {mode === "i2i" ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-6 text-amber-100">{t.i2iNotice}</div> : null}
                  </div>
                </div>

                <div className={`relative flex flex-1 items-center justify-center bg-[background-size:24px_24px] p-6 transition-colors duration-300 ${isDark ? "bg-[#000] bg-[radial-gradient(#222_1px,transparent_1px)]" : "bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]"}`}>
                  <div className="w-full max-w-sm">{renderSurface}</div>
                </div>
              </div>
            </section>
          </div>
        ) : showGenerationHistory ? (
          renderGenerationHistoryView()
        ) : (
          <div className="flex min-h-[calc(100vh-4rem)] w-full flex-1 overflow-hidden">
            <aside className={`flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-r md:w-[380px] ${isDark ? "border-white/10 bg-[#050505]" : "border-gray-200 bg-white"}`}>
              <div className="p-6 flex flex-col gap-6 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div ref={modelSelectorRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (isGeneratingImage || supportedImageModels.length <= 1) return;
                        setIsSizeSelectorOpen(false);
                        setIsModelSelectorOpen((current) => !current);
                      }}
                      disabled={isGeneratingImage}
                      className={`w-full rounded-xl border p-3 text-left transition ${isDark ? "border-white/5 bg-[#0A0A0A] hover:border-cyan-500/30" : "border-gray-200 bg-gray-50 hover:border-cyan-400/50"} ${isGeneratingImage ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className={`mb-2 text-[10px] uppercase tracking-wider ${isDark ? "text-[#666]" : "text-gray-500"}`}>{t.provider}</div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`flex items-center gap-2 truncate text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            <span className={`h-2 w-2 shrink-0 rounded-full ${modelStatusDotClass}`} />
                            <span className="truncate">
                              {selectedImageModel?.label ?? getDisplayImageModel(selectedImageModelId)}
                            </span>
                          </div>
                          <div className={`mt-1 text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                            {currentCost} {t.credits}
                          </div>
                        </div>
                        <div className={`shrink-0 transition-transform ${isModelSelectorOpen ? "rotate-180" : ""} ${supportedImageModels.length <= 1 ? "opacity-30" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                          <ChevronDownIcon />
                        </div>
                      </div>
                    </button>

                    {isModelSelectorOpen && supportedImageModels.length > 0 ? (
                      <div className={`absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border shadow-2xl ${isDark ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"}`}>
                        {supportedImageModels.map((item) => {
                          const isSelected = item.id === selectedImageModelId;
                          const optionCost = item.costCredits[mode] ?? DEFAULT_IMAGE_MODEL_COST[mode];

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedImageModelByMode((current) => ({ ...current, [mode]: item.id }));
                                setSelectedImageSizeByMode((current) => {
                                  const supportedSizes = item.supportedSizes?.length ? item.supportedSizes : [item.defaultSize ?? DEFAULT_IMAGE_SIZE];
                                  if (supportedSizes.includes(current[mode])) return current;
                                  return { ...current, [mode]: item.defaultSize ?? supportedSizes[0] ?? DEFAULT_IMAGE_SIZE };
                                });
                                setIsModelSelectorOpen(false);
                              }}
                              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} ${isSelected ? (isDark ? "bg-cyan-500/10 text-white" : "bg-cyan-50 text-gray-900") : (isDark ? "text-slate-300" : "text-gray-700")}`}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">{item.label}</div>
                                <div className={`${isDark ? "text-slate-400" : "text-gray-500"}`}>{optionCost} {t.credits}</div>
                              </div>
                              {isSelected ? <CheckCircleIcon /> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "border-white/5 bg-[#0A0A0A]" : "border-gray-200 bg-gray-50"}`}>
                    <div className={`text-[10px] uppercase tracking-wider mb-2 ${isDark ? "text-[#666]" : "text-gray-500"}`}>{t.status}</div>
                    <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      <span className={`w-2 h-2 rounded-full ${isGeneratingImage ? "bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "bg-green-500"}`} />
                      {isGeneratingImage ? t.rendering : t.ready}
                    </div>
                  </div>
                </div>

                <div className={`flex rounded-xl border p-1 mt-2 ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-gray-100 shadow-sm"}`}>
                  <button type="button" onClick={() => handleModeSwitch("t2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "t2i" ? (isDark ? "bg-[#222] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : (isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900")}`}><SparklesIcon />{t.t2iMode}</button>
                  <button type="button" onClick={() => handleModeSwitch("i2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "i2i" ? (isDark ? "bg-[#222] text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : (isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900")}`}><ImageIcon />{t.i2iMode}</button>
                </div>

                {ENABLE_IMAGE_SIZE_SELECTOR ? (
                  <div className={`rounded-xl border ${isDark ? "border-white/5 bg-[#0A0A0A]" : "border-gray-200 bg-gray-50"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelSelectorOpen(false);
                        setIsSizeSelectorOpen(false);
                        setIsAdvancedSettingsOpen((current) => !current);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                    >
                      <div className="min-w-0">
                        <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-[#666]" : "text-gray-500"}`}>{t.advancedSettings}</div>
                        <div className={`mt-1 truncate text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>{advancedSettingsSummary}</div>
                      </div>
                      <div className={`shrink-0 transition-transform ${isAdvancedSettingsOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        <ChevronDownIcon />
                      </div>
                    </button>

                    {isAdvancedSettingsOpen ? (
                      <div className={`space-y-3 border-t px-3 pb-3 pt-3 ${isDark ? "border-white/5" : "border-gray-200"}`}>
                        <div ref={sizeSelectorRef} className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (isGeneratingImage || supportedImageSizes.length <= 1) return;
                              setIsSizeSelectorOpen((current) => !current);
                            }}
                            disabled={isGeneratingImage}
                            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${isDark ? "border-white/5 bg-black/20 hover:border-cyan-500/30" : "border-gray-200 bg-white hover:border-cyan-400/50"} ${isGeneratingImage ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            <div className="min-w-0">
                              <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-[#666]" : "text-gray-500"}`}>{t.imageSize}</div>
                              <div className={`mt-1 truncate text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                {selectedImageSizeLabel}
                                <span className={`ml-2 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>{selectedImageSize}</span>
                              </div>
                            </div>
                            <div className={`shrink-0 transition-transform ${isSizeSelectorOpen ? "rotate-180" : ""} ${supportedImageSizes.length <= 1 ? "opacity-30" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              <ChevronDownIcon />
                            </div>
                          </button>

                          {isSizeSelectorOpen && supportedImageSizes.length > 0 ? (
                            <div className={`absolute left-0 right-0 top-[calc(100%+8px)] z-20 grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-xl border p-1 shadow-2xl ${isDark ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"}`}>
                              {supportedImageSizes.map((size) => {
                                const isSelected = size === selectedImageSize;

                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    onClick={() => {
                                      setSelectedImageSizeByMode((current) => ({ ...current, [mode]: size }));
                                      setIsSizeSelectorOpen(false);
                                    }}
                                    className={`rounded-lg px-2.5 py-2 text-left text-xs transition ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} ${isSelected ? (isDark ? "bg-cyan-500/10 text-white" : "bg-cyan-50 text-gray-900") : (isDark ? "text-slate-300" : "text-gray-700")}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate font-medium">{getImageSizeLabel(size, locale)}</span>
                                      {isSelected ? <CheckCircleIcon /> : null}
                                    </div>
                                    <div className={`${isDark ? "text-slate-500" : "text-gray-500"}`}>{size}</div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-white/5 bg-black/20" : "border-gray-200 bg-white"}`}>
                            <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-[#666]" : "text-gray-500"}`}>{t.generationCount}</div>
                            <div className={`mt-1 text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>1</div>
                          </div>
                          <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-white/5 bg-black/20" : "border-gray-200 bg-white"}`}>
                            <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-[#666]" : "text-gray-500"}`}>{mode === "i2i" ? t.referenceStrength : t.comingLater}</div>
                            <div className={`mt-1 text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>{t.comingLater}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {renderReferenceUpload()}

                <div className="mt-2 flex min-h-[160px] flex-1 flex-col">
                  <div className="flex items-end justify-between gap-3 mb-3">
                  <label htmlFor="workspace-prompt" className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{t.promptLabel}</label>
                  <div className="flex gap-2">
                    <button type="button" disabled={isGeneratingImage || isInspiring || isEnhancing} onClick={() => void handlePromptAssist("inspire")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{inspireButtonLabel}</button>
                    <button type="button" disabled={isGeneratingImage || isInspiring || isEnhancing} onClick={() => void handlePromptAssist("enhance")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{enhanceButtonLabel}</button>
                  </div>
                </div>

                {renderPromptEditor("workspace")}
                </div>

                {authNotice ? <NoticeBanner notice={authNotice} /> : null}
                {generationNotice ? <NoticeBanner notice={generationNotice} /> : null}
                {mode === "i2i" ? <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${isDark ? "border-amber-500/20 bg-amber-500/8 text-amber-100" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{t.i2iNotice}</div> : null}

                <div className="space-y-4">
                  <button type="button" onClick={() => void generateImage()} disabled={!canRender} className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 flex justify-center items-center gap-2 ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}>
                    {isGeneratingImage ? t.rendering : t.renderNow}
                    {!isGeneratingImage ? <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${isDark ? "bg-black/10 border-black/5" : "bg-white/20 border-white/10"}`}><span className={isDark ? "text-cyan-600" : "text-cyan-400"}><SparklesIcon /></span>{currentCost} {t.credits}</span> : null}
                  </button>
                </div>

                {generationTask ? (
                  <div className={`mt-2 pt-6 border-t ${isDark ? "border-white/5" : "border-gray-200"}`}>
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>{t.propertiesTitle}</div>
                    <div className={`space-y-3 text-xs p-4 rounded-xl border ${isDark ? "bg-[#0A0A0A] border-white/5" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex justify-between items-center"><span className={isDark ? "text-[#666]" : "text-gray-500"}>{t.taskId}</span><span className={isDark ? "text-[#CCC] font-mono" : "text-gray-700 font-mono"}>{generationTask.id.substring(0, 8)}...</span></div>
                      <div className="flex justify-between items-center"><span className={isDark ? "text-[#666]" : "text-gray-500"}>{t.model}</span><span className={`px-2 py-0.5 rounded ${isDark ? "text-[#CCC] bg-white/5" : "text-gray-700 bg-black/5"}`}>{getDisplayImageModel(generationTask?.model)}</span></div>
                      <div className="flex justify-between items-center"><span className={isDark ? "text-[#666]" : "text-gray-500"}>{t.cost}</span><span className={`flex items-center gap-1 ${isDark ? "text-[#CCC]" : "text-gray-700"}`}><span className={isDark ? "text-cyan-400" : "text-cyan-600"}><SparklesIcon /></span>{generationTask.costCredits} {t.credits}</span></div>
                      <div className="flex justify-between items-center"><span className={isDark ? "text-[#666]" : "text-gray-500"}>{t.completedAt}</span><span className={isDark ? "text-[#CCC]" : "text-gray-700"}>{formatDate(generationTask.completedAt, locale)}</span></div>
                    </div>
                  </div>
                ) : null}

                <div className={`rounded-[1.5rem] border p-5 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-white"}`}>
                  <div className={`text-[11px] uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{t.workspaceNotesTitle}</div>
                  <ul className={`mt-3 space-y-3 text-sm leading-7 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                    <li>{t.workspaceNote1}</li>
                    <li>{t.workspaceNote2}</li>
                  </ul>
                </div>
              </div>
            </aside>

            <main
              className={`relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 transition-colors duration-300 ${isDark ? "bg-[#000] bg-[radial-gradient(#222_1px,transparent_1px)]" : "bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]"} [background-size:24px_24px]`}
              onPointerDownCapture={releasePromptFocus}
            >
              {generatedImageUrl && !previewLoadFailed && !isGeneratingImage ? (
                <div className="relative w-full h-full max-h-full flex items-center justify-center animate-in fade-in duration-700">
                  <Image src={generatedImageUrl} alt="Generated result" fill unoptimized className="object-contain rounded-md shadow-2xl" onError={() => setPreviewLoadFailed(true)} />
                </div>
              ) : (
                <div className="max-w-sm text-center">
                  <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-6 shadow-xl ${isDark ? "border-white/5 bg-[#0A0A0A]" : "border-gray-200 bg-white"}`}>
                    {isGeneratingImage ? <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /> : <div className={`w-4 h-4 rounded-full ${isDark ? "bg-white/10" : "bg-gray-300"}`} />}
                  </div>
                  <div className={`mb-2 text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{isGeneratingImage ? t.rendering : t.canvasEmptyTitle}</div>
                  <div className={`mx-auto max-w-[200px] text-xs leading-relaxed ${isDark ? "text-[#666]" : "text-gray-500"}`}>{isGeneratingImage ? t.workspaceBody : previewLoadFailed ? t.imagePreviewUnavailable : t.canvasEmptyBody}</div>
                </div>
              )}
            </main>
          </div>
        )}

        <div
          className={`fixed inset-0 z-[105] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setIsDrawerOpen(false)}
        />
        <div className={`fixed top-0 right-0 z-[110] flex h-full w-full transform flex-col border-l shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${isDrawerOpen ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"} ${isDark ? "border-white/10 bg-[#111]" : "border-gray-200 bg-white"}`}>
          <div className={`flex items-center justify-between border-b p-6 ${isDark ? "border-white/5" : "border-gray-100"}`}>
            <h2 className={`flex items-center gap-2 text-lg font-bold tracking-wide ${isDark ? "text-white" : "text-gray-900"}`}>
              <span className={isDark ? "text-cyan-400" : "text-cyan-600"}><SparklesIcon /></span>
              {billingCopy.walletTitle}
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className={`rounded-full p-2 transition-colors ${isDark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
              <CloseIcon />
            </button>
          </div>

          <div className={`border-b p-8 ${isDark ? "border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent" : "border-gray-100 bg-gradient-to-b from-gray-50 to-transparent"}`}>
            <div className={`text-center text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>{billingCopy.currentCredits}</div>
            <div className={`mt-2 text-center text-6xl font-mono font-bold tracking-tighter ${isDark ? "text-white" : "text-gray-900"}`}>{user?.creditBalance ?? 0}</div>
            <div className={`mt-6 overflow-hidden transition-all duration-300 ${hasCheckedIn ? "max-h-12 opacity-85" : "max-h-20 opacity-100"}`}>
                {hasCheckedIn ? (
                  <div className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-medium ${isDark ? "border-green-400/20 bg-green-400/10 text-green-400" : "border-green-200 bg-green-50 text-green-600"}`}>
                    <CheckCircleIcon />
                    {billingCopy.checkedIn}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCheckIn()}
                    disabled={!user || isCheckingIn}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold transition-all ${!user || isCheckingIn ? (isDark ? "cursor-not-allowed border border-white/5 bg-white/5 text-slate-500" : "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400") : "border border-cyan-400/50 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:from-cyan-400 hover:to-blue-500"}`}
                  >
                    <CalendarIcon />
                    {isCheckingIn ? t.checking : billingCopy.checkIn}
                  </button>
                )}
            </div>
          </div>

          <div className={`flex gap-8 border-b px-8 pt-4 ${isDark ? "border-white/5 bg-transparent" : "border-gray-100 bg-white"}`}>
            <button type="button" onClick={() => setActiveBillingTab("topup")} className={`relative pb-4 text-sm font-bold transition-colors ${activeBillingTab === "topup" ? (isDark ? "text-white" : "text-gray-900") : (isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-gray-700")}`}>
              <span className="mr-2 inline-block align-text-bottom"><CreditCardIcon /></span>
              {billingCopy.getCredits}
              {activeBillingTab === "topup" ? <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" /> : null}
            </button>
            <button type="button" onClick={() => setActiveBillingTab("history")} className={`relative pb-4 text-sm font-bold transition-colors ${activeBillingTab === "history" ? (isDark ? "text-white" : "text-gray-900") : (isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-gray-700")}`}>
              <span className="mr-2 inline-block align-text-bottom"><ClockIcon /></span>
              {billingCopy.history}
              {activeBillingTab === "history" ? <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" /> : null}
            </button>
          </div>

          <div className={`flex-1 overflow-y-auto p-6 ${isDark ? "bg-transparent" : "bg-gray-50"}`}>
            {activeBillingTab === "topup" ? (
              <div className="space-y-4 pb-10">
                {[
                  { pts: 500, price: "$4.99", label: billingCopy.starterPack, popular: false },
                  { pts: 1200, price: "$9.99", label: billingCopy.creatorPack, popular: true },
                  { pts: 3000, price: "$19.99", label: billingCopy.proPack, popular: false },
                ].map((plan) => (
                  <div key={plan.price} className={`relative flex items-center justify-between rounded-2xl border p-5 transition-all ${plan.popular ? (isDark ? "border-cyan-500/40 bg-cyan-400/10" : "border-cyan-200 bg-cyan-50") : (isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-200 bg-white")}`}>
                    {plan.popular ? <div className="absolute -top-3 left-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1 text-[10px] font-bold tracking-wider text-white shadow-lg">Popular</div> : null}
                    <div>
                      <div className={`mb-1 flex items-center gap-1.5 text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}><span className={plan.popular ? (isDark ? "text-cyan-400" : "text-cyan-600") : "text-gray-400"}><SparklesIcon /></span>{plan.pts}</div>
                      <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{plan.label}</div>
                    </div>
                    <div className={`font-mono text-xl ${isDark ? "text-white" : "text-gray-900"}`}>{plan.price}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {drawerHistoryItems.length > 0 ? drawerHistoryItems.map((item) => (
                  <div key={item.id} className={`flex items-center justify-between rounded-lg border-b px-2 py-3 transition-colors ${isDark ? "border-white/5 hover:bg-white/[0.03]" : "border-gray-100 hover:bg-gray-100"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${item.type === "earned" ? (isDark ? "border-green-400/20 bg-green-400/10 text-green-400" : "border-green-200 bg-green-50 text-green-600") : (isDark ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-600")}`}>
                        {getTransactionIcon(item)}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{item.title}</div>
                        <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>{formatDate(item.date, locale)}</div>
                      </div>
                    </div>
                    <div className={`font-mono text-base font-bold ${item.type === "earned" ? "text-green-500" : isDark ? "text-white" : "text-gray-900"}`}>{item.amount > 0 ? `+${item.amount}` : item.amount}</div>
                  </div>
                )) : (
                  <div className={`rounded-xl border px-4 py-6 text-center text-sm ${isDark ? "border-white/5 text-slate-400" : "border-gray-200 text-gray-500"}`}>{billingCopy.noHistory}</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`fixed inset-0 z-[200] overflow-y-auto transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${showDashboard ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"} ${isDark ? "bg-[#000]" : "bg-gray-50"}`}>
          <header className={`sticky top-0 z-10 flex h-16 items-center border-b px-6 backdrop-blur-xl ${isDark ? "border-white/10 bg-[#000]/60" : "border-gray-200 bg-white/70"}`}>
            <button type="button" onClick={() => setShowDashboard(false)} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
              <ArrowLeftIcon />
              {billingCopy.backToWorkspace}
            </button>
            <div className={`mx-auto text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{billingCopy.dashboardTitle}</div>
            <div className="w-[120px]" />
          </header>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 p-8 lg:grid-cols-3">
            <div className="flex flex-col gap-6">
              <h3 className={`mb-2 text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{billingCopy.overview}</h3>
              <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white"}`}>
                <div className={`mb-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>{billingCopy.currentCredits}</div>
                <div className={`mb-6 text-5xl font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{user?.creditBalance ?? 0}</div>
                <button type="button" onClick={() => { setShowDashboard(false); setActiveBillingTab("topup"); setIsDrawerOpen(true); }} className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-colors ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}><CreditCardIcon />{billingCopy.getCredits}</button>
              </div>
              <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white"}`}>
                <div className={`mb-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>{billingCopy.currentPlan}</div>
                <div className={`mb-2 text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{billingCopy.freePlan}</div>
                <div className={`mb-6 text-xs leading-relaxed ${isDark ? "text-slate-500" : "text-gray-500"}`}>{locale === "zh" ? "包含基础速度引擎与每日赠送积分，适合轻量创作验证。" : "Includes the base runtime and daily free credits for lightweight creation."}</div>
                <button type="button" className={`w-full rounded-xl border py-3 font-semibold transition-colors ${isDark ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20" : "border-cyan-200 bg-cyan-50 text-cyan-600 hover:bg-cyan-100"}`}>{billingCopy.upgradePlan}</button>
              </div>
              <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white"}`}>
                <div className={`mb-6 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>{billingCopy.usageLast7Days}</div>
                <div className="flex h-24 items-end justify-between gap-2">
                  {usageLast7Days.map((value, index) => {
                    const height = Math.max((value / usageMax) * 100, value > 0 ? 10 : 4);
                    return (
                      <div key={`${value}-${index}`} className={`group relative w-full rounded-t-sm ${isDark ? "bg-cyan-900/30" : "bg-cyan-100"}`} style={{ height: `${height}%` }}>
                        <div className={`absolute inset-0 rounded-t-sm opacity-0 transition-opacity group-hover:opacity-100 ${isDark ? "bg-cyan-400" : "bg-cyan-500"}`} />
                        <div className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 ${isDark ? "bg-white text-black" : "bg-gray-900 text-white"}`}>-{value}</div>
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-2 flex justify-between font-mono text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}><span>{locale === "zh" ? "7天前" : "7 days ago"}</span><span>{locale === "zh" ? "今天" : "Today"}</span></div>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{billingCopy.transactionHistory}</h3>
                <div className={`flex items-center rounded-lg border p-1 ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-gray-100"}`}>
                  <span className={`px-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}><FilterIcon /></span>
                  {(["all", "consumed", "earned"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setHistoryFilter(filter)}
                      className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${historyFilter === filter ? (isDark ? "bg-white/10 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm") : (isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-900")}`}
                    >
                      {filter === "all" ? billingCopy.filterAll : filter === "consumed" ? billingCopy.filterConsumed : billingCopy.filterEarned}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`overflow-hidden rounded-2xl border shadow-sm ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white"}`}>
                {historyItems.length > 0 ? (
                  <>
                    <div className={`divide-y ${isDark ? "divide-white/5" : "divide-gray-100"}`}>
                      {historyItems.map((item) => (
                        <div key={item.id} className={`flex items-center justify-between p-4 sm:px-6 transition-colors ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"}`}>
                          <div>
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{item.title}</div>
                            <div className={`mt-0.5 text-xs font-mono ${isDark ? "text-slate-500" : "text-gray-500"}`}>{formatDate(item.date, locale)}</div>
                          </div>
                          <div className={`font-mono text-base font-bold ${item.type === "earned" ? "text-green-500" : isDark ? "text-white" : "text-gray-900"}`}>{item.amount > 0 ? `+${item.amount}` : item.amount}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center justify-between border-t p-4 text-xs ${isDark ? "border-white/5 text-slate-500" : "border-gray-100 text-gray-500"}`}>
                      <span>{historyItems.length} {billingCopy.entriesLabel}</span>
                    </div>
                  </>
                ) : (
                  <div className={`p-12 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>{billingCopy.noHistory}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {showMentionMenu && mentionMenuPos && filteredMentionOptions.length > 0 ? (
          <div
            ref={mentionMenuRef}
            className={`fixed z-40 w-64 overflow-hidden rounded-2xl border shadow-2xl ${isDark ? "border-white/10 bg-[#0b0f16]" : "border-gray-200 bg-white"}`}
            style={{ top: mentionMenuPos.top, left: mentionMenuPos.left }}
          >
            {filteredMentionOptions.map(({ imageUrl, index }) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => insertMention(index)}
                className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition last:border-b-0 ${isDark ? "border-white/5 hover:bg-white/[0.05]" : "border-gray-100 hover:bg-cyan-50"}`}
              >
                <img src={imageUrl} alt={`Reference ${index + 1}`} className="h-9 w-9 rounded-lg object-cover" />
                <div>
                  <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>@R{index + 1}</div>
                  <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{locale === "zh" ? "插入参考图引用" : "Insert image reference"}</div>
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {previewImage ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
            <div className="relative flex h-full max-h-[90vh] w-full max-w-5xl items-center justify-center p-4">
              <img src={previewImage} alt="Reference preview" className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10" onClick={(event) => event.stopPropagation()} />
              <button type="button" onClick={() => setPreviewImage(null)} className="absolute right-4 top-4 rounded-full bg-black/60 p-2.5 text-white transition hover:bg-black/80">
                <CloseIcon />
              </button>
            </div>
          </div>
        ) : null}

        {showLoginPanel ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#090d14] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.52)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.account}</div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{t.authTitle}</h2>
                </div>
                <button type="button" onClick={() => setShowLoginPanel(false)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white">{t.close}</button>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-400">{t.authBody}</p>
              {authNotice ? <div className="mt-5"><NoticeBanner notice={authNotice} /></div> : null}

              <form className="mt-5 space-y-4" onSubmit={(event) => void handleSendCode(event)}>
                <div>
                  <label htmlFor="auth-email" className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-slate-500">{t.email}</label>
                  <input ref={emailRef} id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.06]" placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={isSendingCode || cooldownActive} className="w-full rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60">{isSendingCode ? t.sendingCode : cooldownActive ? `${t.sendCode} ${timeLeftText(timeLeft)}` : t.sendCode}</button>
              </form>

              <div className="my-5 border-t border-white/10" />

              <form className="space-y-4" onSubmit={(event) => void handleVerifyCode(event)}>
                <div>
                  <label htmlFor="auth-code" className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-slate-500">{t.code}</label>
                  <input ref={codeRef} id="auth-code" type="text" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.06]" placeholder="123456" />
                </div>
                <button type="submit" disabled={isVerifyingCode} className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60">{isVerifyingCode ? t.verifying : t.verify}</button>
              </form>

              <p className="mt-5 text-xs leading-6 text-slate-500">{t.authHint}</p>
            </div>
          </div>
        ) : null}
      <style jsx global>{`
        .prompt-editor:empty::before {
          content: attr(data-placeholder);
          color: ${isDark ? "#64748b" : "#94a3b8"};
          pointer-events: none;
        }
      `}</style>
      </main>
    </div>
  );
}



