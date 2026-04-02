"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

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
type MeResponse = { user: AuthUser | null };
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
type GenerateImageResponse = { ok: true; task: ImageTaskResult } | { error: string };

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
    heroBadge: "SparkPost AI 已上线",
    heroTitle: "将想象力转化为\n惊艳的视觉资产。",
    heroBody: "一个建立在顶级多模态模型之上的专业工作台。探索、构建并渲染高保真数字视觉内容，同时保留克制、顺滑而清晰的交互。",
    heroPrimary: "开始体验",
    heroSecondary: "查看功能",
    feature1Title: "Gemini Intelligence",
    feature1Body: "结合 Gemini 风格的提示词组织方式，让普通描述更快进入专业输出语境。",
    feature2Title: "Seamless Workflow",
    feature2Body: "从落地页到工作台保持连续操作路径，不让登录打断思路。",
    feature3Title: "Real-time Sync",
    feature3Body: "认证、生成、错误和积分变化都会在同一套界面里清晰反馈。",
    playgroundTitle: "体验工作台",
    playgroundBody: "先输入灵感，再在真正点击生成时触发登录。登录后会尽量保留你刚才的 Prompt 并继续动作。",
    promptLabel: "PROMPT",
    promptPlaceholder: "例如：一张电影感未来产品场景，发光边缘、玻璃材质、戏剧化布光、深色背景。",
    renderNow: "立即生成",
    rendering: "生成中...",
    promptHint: "当前优先接入真实的单图生成链路。Prompt 会在登录前后保留。",
    t2iMode: "文生图",
    i2iMode: "图生图",
    uploadReference: "参考图",
    uploadHint: "点击或拖拽上传参考图",
    inspire: "给我灵感",
    enhance: "增强 Prompt",
    comingSoon: "即将支持",
    authTitle: "验证身份后继续刚才的生成",
    authBody: "通过邮箱验证码进入完整工作台。当前 Prompt 不会丢失，登录完成后会自动继续你刚刚触发的动作。",
    authHint: "开发环境下如果后端返回 debug code，会自动填入验证码输入框。",
    sendCode: "发送验证码",
    sendingCode: "发送中...",
    verify: "验证并进入工作台",
    verifying: "验证中...",
    email: "邮箱",
    code: "验证码",
    signIn: "登录",
    signOut: "退出登录",
    close: "关闭",
    account: "账户",
    credits: "积分",
    provider: "服务",
    status: "状态",
    providerAvailable: "服务可用",
    providerUnavailable: "服务不可用",
    providerUnknown: "待确认",
    ready: "已就绪",
    checking: "检查中",
    authRequired: "需要登录",
    signedIn: "已登录",
    signedOut: "未登录",
    resultEmpty: "暂无结果",
    resultSuccess: "生成成功",
    resultError: "生成失败",
    workspaceEyebrow: "GENERATION STUDIO",
    workspaceTitle: "进入真正的生成工作台。",
    workspaceBody: "登录后主界面会聚焦 Prompt、生成动作、结果画布和任务信息，不再把登录区长期放在主体位置。",
    canvasTitle: "结果画布",
    canvasEmptyTitle: "等待指令",
    canvasEmptyBody: "提交 Prompt 后，生成结果会显示在这里，同时更新任务状态、模型和积分消耗。",
    propertiesTitle: "任务属性",
    taskId: "任务 ID",
    model: "模型",
    cost: "消耗",
    createdAt: "创建时间",
    completedAt: "完成时间",
    runtimeTitle: "运行状态",
    continueHint: "未登录时点击生成会弹出登录模块，登录成功后会尽量继续原动作。",
    sessionLoadFailed: "无法加载当前会话状态。",
    sessionRefreshFailed: "无法刷新当前会话状态。",
    enterEmail: "请先输入邮箱。",
    enterPrompt: "请先输入 Prompt。",
    enterSameEmail: "请输入接收验证码的同一个邮箱。",
    enterCode: "请输入验证码。",
    sentCode: "验证码已发送到 {email}。{expires}{debug}",
    requestTooFast: "请求过快，请在 {time} 后重试。",
    verifyTooFast: "验证请求受限，请在 {time} 后重试。",
    signedInNewNotice: "账户已创建，欢迎进入 SparkPost 工作台。",
    signedInExistingNotice: "登录成功，欢迎回到 SparkPost。",
    signedOutNotice: "你已退出 SparkPost。",
    loginToContinue: "请先登录。我们会保留你刚才输入的 Prompt。",
    generateSuccess: "生成完成，已创建 {count} 个资源。",
    unexpectedPayload: "接口返回了未预期的数据结构。",
    imagePreviewUnavailable: "资源已生成，但当前页面无法直接预览返回路径。",
    sendCodeFailed: "验证码发送失败。",
    verifyCodeFailed: "验证码校验失败。",
    logoutFailed: "退出登录失败。",
    generateFailed: "图片生成失败。",
    i2iNotice: "图生图界面已保留，但当前首条后端链路只接入文生图。",
    inspireNotice: "灵感增强按钮暂时保留视觉位置，后续会接入真实能力。",
    enhanceNotice: "Prompt 增强按钮暂时保留视觉位置，后续会接入真实能力。",
  },
  en: {
    brand: "SparkPost",
    heroBadge: "SparkPost AI is now live",
    heroTitle: "Turn imagination into\nphenomenal visual assets.",
    heroBody: "A professional workspace built on top-tier multimodal AI. Explore, construct, and render high-fidelity digital art with industrial-grade control and restrained interaction.",
    heroPrimary: "Start Free Trial",
    heroSecondary: "Explore Features",
    feature1Title: "Gemini Intelligence",
    feature1Body: "A Gemini-style prompt layer helps simple ideas become production-ready visual direction faster.",
    feature2Title: "Seamless Workflow",
    feature2Body: "Move from landing to studio without losing context, prompt state, or intent.",
    feature3Title: "Real-time Sync",
    feature3Body: "Auth, generation, provider status, and credit changes stay readable inside one flow.",
    playgroundTitle: "Experience the Studio",
    playgroundBody: "Enter your idea first. The app asks for sign-in only when generation really begins, then continues with the same prompt.",
    promptLabel: "PROMPT",
    promptPlaceholder: "e.g. A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.",
    renderNow: "Render Now",
    rendering: "Rendering...",
    promptHint: "The first backend path is wired for real text-to-image generation. Your prompt stays intact across sign-in.",
    t2iMode: "Text to Image",
    i2iMode: "Image to Image",
    uploadReference: "Reference Image",
    uploadHint: "Click or drag to upload",
    inspire: "Inspire Me",
    enhance: "Enhance",
    comingSoon: "Coming soon",
    authTitle: "Verify identity, then continue the generation you already started",
    authBody: "Use email verification to enter the full workspace. The current prompt is preserved so the action can continue right after sign-in.",
    authHint: "In development, the debug code is autofilled here when the backend returns it.",
    sendCode: "Get Code",
    sendingCode: "Sending...",
    verify: "Verify & Enter Studio",
    verifying: "Verifying...",
    email: "Work Email",
    code: "Verification Code",
    signIn: "Sign In",
    signOut: "Log Out",
    close: "Close",
    account: "Account",
    credits: "Credits",
    provider: "Provider",
    status: "Status",
    providerAvailable: "Provider available",
    providerUnavailable: "Provider unavailable",
    providerUnknown: "Provider unknown",
    ready: "Ready",
    checking: "Checking",
    authRequired: "Auth required",
    signedIn: "Authenticated",
    signedOut: "Signed out",
    resultEmpty: "No result yet",
    resultSuccess: "Success",
    resultError: "Error",
    workspaceEyebrow: "GENERATION STUDIO",
    workspaceTitle: "Land directly inside the real generation workspace.",
    workspaceBody: "Once signed in, the interface prioritizes prompt composition, generation, the output canvas, and task details instead of a permanent auth panel.",
    canvasTitle: "Canvas",
    canvasEmptyTitle: "Awaiting Instructions",
    canvasEmptyBody: "Submit a prompt and the latest result appears here with updated task state, model info, and credit usage.",
    propertiesTitle: "Properties",
    taskId: "Task ID",
    model: "Base Model",
    cost: "Compute Cost",
    createdAt: "Created",
    completedAt: "Completed",
    runtimeTitle: "Runtime status",
    continueHint: "When signed out, the render CTA opens the auth module and continues after verification.",
    sessionLoadFailed: "Unable to load the current session.",
    sessionRefreshFailed: "Unable to refresh the current session.",
    enterEmail: "Provide an email address first.",
    enterPrompt: "Enter a prompt first.",
    enterSameEmail: "Use the same email address that received the code.",
    enterCode: "Enter the verification code.",
    sentCode: "Verification code sent to {email}.{expires}{debug}",
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
    i2iNotice: "The image-to-image panel is preserved visually, but the first backend slice currently supports text-to-image only.",
    inspireNotice: "This inspiration control keeps its visual position for now and will be wired later.",
    enhanceNotice: "This enhancement control keeps its visual position for now and will be wired later.",
  },
};

const timeLeftText = (seconds: number) =>
  seconds <= 0 ? "0s" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60 || ""}`.trim();
const formatDate = (value: string | null, locale: Locale) =>
  value ? new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { hour12: false }) : "-";
const formatTemplate = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const primaryImageUrl = (task: ImageTaskResult | null) => task?.assets[0]?.fileUrl ?? null;
const noticeClasses = (type: Notice["type"]) =>
  type === "error"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
    : type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : "border-white/15 bg-white/5 text-slate-200";

const BrainIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4 4.5 4.5 0 0 1 3-4 4.5 4.5 0 0 1 3-4Z" /></svg>;
const ShieldIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
const SparklesIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>;
const ImageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>;
const UploadIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const PlayIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>;
const SunIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>;
const MoonIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>;

function NoticeBanner({ notice }: { notice: Notice }) {
  return <div className={`rounded-xl border px-3 py-2.5 text-sm leading-6 ${noticeClasses(notice.type)}`}>{notice.text}</div>;
}

function VisualHero({ isDark }: { isDark: boolean }) {
  return (
    <div className={`mt-16 w-full max-w-6xl mx-auto relative rounded-3xl overflow-hidden border shadow-2xl h-[400px] md:h-[600px] group ${isDark ? "border-white/5 bg-black" : "border-gray-200 bg-white"}`}>
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
  const [mode, setMode] = useState<Mode>("t2i");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prompt, setPrompt] = useState("A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.");
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [pendingGenerateAfterLogin, setPendingGenerateAfterLogin] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [authNotice, setAuthNotice] = useState<Notice | null>(null);
  const [generationNotice, setGenerationNotice] = useState<Notice | null>(null);
  const [generationTask, setGenerationTask] = useState<ImageTaskResult | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("unknown");

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const playgroundRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = copy[locale];
  const authStatus: AuthStatus = isLoadingSession ? "checking" : user ? "signedIn" : "signedOut";
  const interactionStatus: InteractionStatus = isLoadingSession ? "checking" : isGeneratingImage ? "generating" : authStatus === "signedOut" && showLoginPanel ? "authRequired" : "ready";
  const resultStatus: ResultStatus = generationTask ? "success" : generationNotice?.type === "error" ? "error" : "empty";
  const cooldownActive = useMemo(() => cooldownEndsAt !== null && timeLeft > 0, [cooldownEndsAt, timeLeft]);
  const accountInitials = user?.email.slice(0, 2).toUpperCase() ?? "SP";
  const currentCost = 10;
  const canRender = !!prompt.trim() && !isGeneratingImage;
  const hasReference = mode === "i2i" && !!referenceImageName;

  useEffect(() => {
    const saved = window.localStorage.getItem("sparkpost-locale");
    if (saved === "zh" || saved === "en") setLocale(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sparkpost-locale", locale);
  }, [locale]);

  useEffect(() => {
    if (authStatus === "signedOut" && showLoginPanel && pendingGenerateAfterLogin) {
      setAuthNotice({ type: "info", text: t.loginToContinue });
    }
  }, [authStatus, pendingGenerateAfterLogin, showLoginPanel, t.loginToContinue]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(t.sessionLoadFailed);
        const data = (await response.json()) as MeResponse;
        setUser(data.user);
        if (data.user) setEmail(data.user.email);
      } catch (error) {
        if (!controller.signal.aborted) setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.sessionLoadFailed });
      } finally {
        if (!controller.signal.aborted) setIsLoadingSession(false);
      }
    }
    void loadSession();
    return () => controller.abort();
  }, [t.sessionLoadFailed]);

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
    if (authStatus === "signedIn" && !pendingGenerateAfterLogin) promptRef.current?.focus();
  }, [authStatus, pendingGenerateAfterLogin]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error(t.sessionRefreshFailed);
    const data = (await response.json()) as MeResponse;
    setUser(data.user);
    if (data.user) setEmail(data.user.email);
  }, [t.sessionRefreshFailed]);

  const generateImage = useCallback(async () => {
    setGenerationNotice(null);
    if (!prompt.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }
    if (mode === "i2i") {
      setGenerationNotice({ type: "info", text: t.i2iNotice });
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setGenerationTask(null);
    setPreviewLoadFailed(false);
    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });
      const data = (await response.json().catch(() => null)) as GenerateImageResponse | null;
      if (!response.ok) {
        const errorText = data && "error" in data && typeof data.error === "string" ? data.error : t.generateFailed;
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
      setUser((current) => current ? { ...current, creditBalance: data.task.remainingCredits } : current);
      if (!primaryImageUrl(data.task)) setGenerationNotice({ type: "info", text: t.imagePreviewUnavailable });
    } catch (error) {
      setGenerationNotice({ type: "error", text: error instanceof Error ? error.message : t.generateFailed });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [mode, prompt, t.enterPrompt, t.generateFailed, t.generateSuccess, t.i2iNotice, t.imagePreviewUnavailable, t.unexpectedPayload]);

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
      const response = await fetch("/api/auth/send-code", {
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
          debug: debugCode ? ` Debug code: ${debugCode}.` : "",
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
      const response = await fetch("/api/auth/verify-code", {
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
      } else {
        await refreshSession();
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
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(t.logoutFailed);
      setUser(null);
      setCode("");
      setShowAccountMenu(false);
      setShowLoginPanel(false);
      setPendingGenerateAfterLogin(false);
      setGenerationTask(null);
      setGeneratedImageUrl(null);
      setPreviewLoadFailed(false);
      setAuthNotice({ type: "info", text: t.signedOutNotice });
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.logoutFailed });
    }
  }

  function startRenderIntent() {
    if (!prompt.trim()) {
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

  function handleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setReferenceImageName(file?.name ?? null);
  }

  function handleSoon(action: "inspire" | "enhance") {
    setGenerationNotice({ type: "info", text: action === "inspire" ? t.inspireNotice : t.enhanceNotice });
  }

  const statusCards = [
    { label: t.provider, value: systemStatus === "available" ? t.providerAvailable : systemStatus === "unavailable" ? t.providerUnavailable : t.providerUnknown },
    { label: t.status, value: isGeneratingImage ? t.rendering : interactionStatus === "authRequired" ? t.authRequired : interactionStatus === "checking" ? t.checking : t.ready },
    { label: t.account, value: authStatus === "signedIn" ? t.signedIn : authStatus === "signedOut" ? t.signedOut : t.checking },
    { label: t.canvasTitle, value: resultStatus === "success" ? t.resultSuccess : resultStatus === "error" ? t.resultError : t.resultEmpty },
  ];

  const featureCards = [
    { title: t.feature1Title, body: t.feature1Body, icon: <BrainIcon />, tint: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { title: t.feature2Title, body: t.feature2Body, icon: <SparklesIcon />, tint: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
    { title: t.feature3Title, body: t.feature3Body, icon: <ShieldIcon />, tint: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ];

  const renderSurface = generatedImageUrl && !previewLoadFailed ? (
    <div className={`relative h-full min-h-[320px] w-full overflow-hidden rounded-[1.5rem] border ${isDark ? "border-white/10 bg-black/50 shadow-[0_20px_80px_rgba(0,0,0,0.35)]" : "border-gray-200 bg-white shadow-[0_20px_80px_rgba(148,163,184,0.22)]"}`}>
      <Image src={generatedImageUrl} alt="Generated preview" fill unoptimized className="object-contain" onError={() => setPreviewLoadFailed(true)} />
    </div>
  ) : (
    <div className={`flex h-full min-h-[320px] w-full flex-col items-center justify-center rounded-[1.5rem] border px-6 text-center ${isDark ? "border-white/10 bg-[#0b0f16]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" : "border-gray-200 bg-white/80 shadow-xl backdrop-blur-md"}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full border ${isDark ? "border-white/10 bg-white/[0.04]" : "border-gray-200 bg-gray-50"}`}><div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isDark ? "bg-white/20" : "bg-gray-400"}`} /></div>
      <div className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.canvasEmptyTitle}</div>
      <p className={`mt-3 max-w-sm text-xs leading-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{previewLoadFailed ? t.imagePreviewUnavailable : t.canvasEmptyBody}</p>
    </div>
  );

  return (
    <div>
      <main className={`min-h-screen selection:bg-cyan-500/30 ${isDark ? "bg-[#000] text-[#EDEDED]" : "bg-gray-50 text-gray-900"}`}>
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,rgba(11,94,104,0.10),transparent_22%),radial-gradient(circle_at_78%_16%,rgba(102,44,138,0.08),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_48%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_14%_18%,rgba(11,94,104,0.18),transparent_22%),radial-gradient(circle_at_78%_16%,rgba(102,44,138,0.14),transparent_18%),linear-gradient(180deg,#020304_0%,#03060a_48%,#020304_100%)]" />

        <header className={`sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b px-6 backdrop-blur-md transition-colors duration-300 ${isDark ? "border-white/10 bg-black/50" : "border-gray-200 bg-white/70"}`}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden">
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
            <span className={`text-[15px] font-bold tracking-wide transition-colors ${isDark ? "text-white group-hover:text-cyan-400" : "text-gray-900 group-hover:text-cyan-600"}`}>{t.brand}</span>
            <div className={`mx-2 h-4 w-px ${isDark ? "bg-white/20" : "bg-gray-300"}`} />
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
                <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium">
                  <div className="text-cyan-600 dark:text-cyan-400"><SparklesIcon /></div>
                  <span className="text-gray-900 dark:text-white">{user.creditBalance} {t.credits}</span>
                </div>
                <div className="relative" ref={menuRef}>
                  <button type="button" onClick={() => setShowAccountMenu((current) => !current)} className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-[#111] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors hover:bg-gray-300 dark:hover:bg-[#222] shadow-sm">
                    {accountInitials}
                  </button>
                  {showAccountMenu ? (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-white/10">
                        <div className="text-xs text-gray-500 dark:text-[#888] truncate">{user.email}</div>
                        <div className="text-sm font-semibold mt-1 text-gray-900 dark:text-white">{user.creditBalance} {t.credits}</div>
                      </div>
                      <div className="p-1.5">
                        <button type="button" onClick={() => void handleLogout()} className="w-full text-left rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-[#CCC] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
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
            <section className="px-5 pt-20 sm:px-8 lg:pt-24">
              <div className="mx-auto flex max-w-[1440px] flex-col items-center text-center">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${isDark ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-300" : "border-cyan-500/20 bg-cyan-50 text-cyan-600"}`}><span className={`h-2 w-2 rounded-full animate-pulse ${isDark ? "bg-cyan-400" : "bg-cyan-500"}`} />{t.heroBadge}</div>
                <h1 className={`mt-10 max-w-5xl whitespace-pre-line bg-gradient-to-b bg-clip-text text-5xl font-semibold leading-[0.96] tracking-tight text-transparent sm:text-6xl lg:text-8xl ${isDark ? "from-white to-white/60" : "from-gray-900 to-gray-500"}`}>{t.heroTitle}</h1>
                <p className={`mt-8 max-w-3xl text-base leading-8 sm:text-xl ${isDark ? "text-slate-300" : "text-gray-600"}`}>{t.heroBody}</p>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
                  <button type="button" onClick={() => playgroundRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}>{t.heroPrimary}<PlayIcon /></button>
                  <button type="button" onClick={() => document.getElementById("feature-strip")?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`rounded-full border px-6 py-3.5 text-sm font-medium transition ${isDark ? "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white" : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"}`}>{t.heroSecondary}</button>
                </div>
                <div className="w-full max-w-[1320px]"><VisualHero isDark={isDark} /></div>
              </div>
            </section>

            <section id="feature-strip" className={`mx-auto mt-12 max-w-[1320px] border-t px-5 pt-12 sm:px-8 ${isDark ? "border-white/5" : "border-gray-200"}`}><div className="grid gap-6 md:grid-cols-3">
              {featureCards.map((card) => (
                <article key={card.title} className={`rounded-[1.5rem] border p-7 transition-colors ${isDark ? "border-white/6 bg-[#0a0a0a] shadow-[0_16px_40px_rgba(0,0,0,0.28)]" : "border-gray-200 bg-white shadow-sm"}`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${card.tint}`}>{card.icon}</div>
                  <h2 className={`mt-6 text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{card.title}</h2>
                  <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-400" : "text-gray-600"}`}>{card.body}</p>
                </article>
              ))}
              </div>
            </section>

            <section ref={playgroundRef} className="mx-auto mt-24 max-w-[1320px] px-5 sm:px-8">
              <div className="text-center">
                <h2 className={`text-3xl font-semibold tracking-tight sm:text-4xl ${isDark ? "text-white" : "text-gray-900"}`}>{t.playgroundTitle}</h2>
                <p className={`mx-auto mt-4 max-w-2xl text-sm leading-7 ${isDark ? "text-slate-400" : "text-gray-600"}`}>{t.playgroundBody}</p>
              </div>

              <div className={`mt-12 overflow-hidden rounded-[2rem] border md:grid md:grid-cols-[380px_1fr] ${isDark ? "border-white/10 bg-[#060709] shadow-[0_24px_90px_rgba(0,0,0,0.42)]" : "border-gray-200 bg-white shadow-xl"}`}>
                <div className={`border-b p-6 md:border-b-0 md:border-r ${isDark ? "border-white/10 bg-[#090909]" : "border-gray-200 bg-gray-50"}`}>
                  <div className={`flex rounded-xl border p-1 ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white shadow-sm"}`}>
                    <button type="button" onClick={() => setMode("t2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "t2i" ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-[#1f1f1f] dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white"}`}><SparklesIcon />{t.t2iMode}</button>
                    <button type="button" onClick={() => setMode("i2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "i2i" ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-[#1f1f1f] dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white"}`}><ImageIcon />{t.i2iMode}</button>
                  </div>

                  {mode === "i2i" ? (
                    <div className="mt-5">
                      <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{t.uploadReference}</div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${isDark ? "border-white/10 bg-white/[0.02] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300" : "border-gray-300 bg-gray-50 text-gray-400 hover:border-cyan-400/40 hover:text-cyan-600"}`}>
                        <UploadIcon />
                        <span className="mt-2 text-xs">{referenceImageName ?? t.uploadHint}</span>
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-end justify-between gap-3">
                    <label htmlFor="landing-prompt" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{t.promptLabel}</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleSoon("inspire")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{t.inspire}</button>
                      <button type="button" onClick={() => handleSoon("enhance")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{t.enhance}</button>
                    </div>
                  </div>

                  <textarea id="landing-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className={`mt-3 min-h-[160px] w-full resize-none rounded-xl border p-4 text-sm leading-7 outline-none transition ${isDark ? "border-white/5 bg-black/40 text-white placeholder:text-slate-500 focus:border-white/15" : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400"}` placeholder={t.promptPlaceholder} />

                  <div className={`mt-5 space-y-4 border-t pt-5 ${isDark ? "border-white/5" : "border-gray-200"}`}>
                    {generationNotice ? <NoticeBanner notice={generationNotice} /> : null}
                    {authNotice && showLoginPanel ? <NoticeBanner notice={authNotice} /> : null}
                    <button type="button" onClick={startRenderIntent} disabled={!canRender} className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? "bg-white text-black hover:bg-slate-200" : "bg-gray-900 text-white hover:bg-black"}`}>{isGeneratingImage ? t.rendering : t.renderNow}</button>
                    <p className={`text-[11px] leading-6 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{t.promptHint}</p>
                    {(mode === "i2i" || hasReference) ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-6 text-amber-100">{t.i2iNotice}</div> : null}
                  </div>
                </div>

                <div className={`bg-[background-size:24px_24px] p-6 md:p-8 ${isDark ? "bg-[#000] bg-[radial-gradient(#1f2328_1px,transparent_1px)]" : "bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)]"}`}>
                  {renderSurface}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-5 py-8 sm:px-8 lg:flex-row lg:gap-6 lg:py-10">
            <aside className="w-full shrink-0 rounded-[2rem] border border-white/10 bg-[#08090c] lg:w-[380px]">
              <div className="flex h-full flex-col gap-6 p-6">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">{t.workspaceEyebrow}</div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{t.workspaceTitle}</h1>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{t.workspaceBody}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {statusCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3.5">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{card.label}</div>
                      <div className="mt-2 text-sm font-medium text-white">{card.value}</div>
                    </div>
                  ))}
                </div>

                <div className={`flex rounded-xl border p-1 ${isDark ? "border-white/5 bg-[#111]" : "border-gray-200 bg-white shadow-sm"}`}>
                  <button type="button" onClick={() => setMode("t2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "t2i" ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-[#1f1f1f] dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white"}`}><SparklesIcon />{t.t2iMode}</button>
                  <button type="button" onClick={() => setMode("i2i")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${mode === "i2i" ? "bg-gray-100 text-gray-900 shadow-sm dark:bg-[#1f1f1f] dark:text-white" : "text-gray-500 hover:text-gray-900 dark:text-slate-500 dark:hover:text-white"}`}><ImageIcon />{t.i2iMode}</button>
                </div>

                {mode === "i2i" ? (
                  <div>
                    <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{t.uploadReference}</div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleReferenceUpload} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`flex h-28 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${isDark ? "border-white/10 bg-white/[0.02] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300" : "border-gray-300 bg-gray-50 text-gray-400 hover:border-cyan-400/40 hover:text-cyan-600"}`}>
                      <UploadIcon />
                      <span className="mt-2 text-xs">{referenceImageName ?? t.uploadHint}</span>
                    </button>
                  </div>
                ) : null}

                <div className="flex items-end justify-between gap-3">
                  <label htmlFor="workspace-prompt" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{t.promptLabel}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => handleSoon("inspire")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{t.inspire}</button>
                    <button type="button" onClick={() => handleSoon("enhance")} className={`rounded-md border px-2.5 py-1.5 text-[10px] transition ${isDark ? "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{t.enhance}</button>
                  </div>
                </div>

                <textarea ref={promptRef} id="workspace-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-[190px] w-full resize-none rounded-xl border border-white/5 bg-black/40 p-4 text-sm leading-7 text-white outline-none transition focus:border-white/15 placeholder:text-slate-500" placeholder={t.promptPlaceholder} />

                {authNotice ? <NoticeBanner notice={authNotice} /> : null}
                {generationNotice ? <NoticeBanner notice={generationNotice} /> : null}
                {mode === "i2i" ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-6 text-amber-100">{t.i2iNotice}</div> : null}

                <div className="mt-auto space-y-4 border-t border-white/8 pt-5">
                  <button type="button" onClick={() => void generateImage()} disabled={!canRender} className="w-full rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-slate-200">{isGeneratingImage ? t.rendering : t.renderNow}</button>
                  <p className="text-[11px] leading-6 text-gray-500 dark:text-slate-500">{t.continueHint}</p>
                </div>
              </div>
            </aside>

            <section className="mt-6 flex-1 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_52%_16%,rgba(255,247,214,0.12),transparent_16%),radial-gradient(circle_at_50%_28%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(155deg,rgba(9,10,12,0.96),rgba(6,8,12,0.98)_52%,rgba(7,16,24,0.98))] shadow-[0_28px_110px_rgba(0,0,0,0.48)] lg:mt-0">
              <div className="border-b border-white/10 px-6 py-4 text-[11px] uppercase tracking-[0.28em] text-slate-500">{t.canvasTitle}</div>
              <div className="grid gap-6 p-6 xl:grid-cols-[1.25fr_0.75fr] xl:p-8">
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t.promptLabel}</div>
                      <div className="mt-4 text-sm leading-7 text-slate-200">{prompt}</div>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t.runtimeTitle}</div>
                      <div className="mt-4 space-y-3 text-sm text-slate-300">
                        <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.provider}</span><span className="text-right text-white">{systemStatus === "available" ? t.providerAvailable : systemStatus === "unavailable" ? t.providerUnavailable : t.providerUnknown}</span></div>
                        <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.status}</span><span className="text-right text-white">{isGeneratingImage ? t.rendering : t.ready}</span></div>
                        <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.credits}</span><span className="text-right text-white">{user?.creditBalance ?? "-"}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="h-[460px]">{renderSurface}</div>
                </div>

                <aside className="rounded-[1.5rem] border border-white/10 bg-[#0a0f16]/82 p-5 shadow-[0_16px_70px_rgba(0,0,0,0.36)]">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{t.propertiesTitle}</div>
                  <div className="mt-5 space-y-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.taskId}</span><span className="max-w-[12rem] truncate text-right text-white">{generationTask?.id ?? "-"}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.model}</span><span className="text-right text-white">{generationTask?.model ?? "-"}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.cost}</span><span className="text-right text-white">{generationTask ? generationTask.costCredits : currentCost}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.createdAt}</span><span className="text-right text-white">{formatDate(generationTask?.createdAt ?? null, locale)}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{t.completedAt}</span><span className="text-right text-white">{formatDate(generationTask?.completedAt ?? null, locale)}</span></div>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        )}

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
      </main>
    </div>
  );
}






