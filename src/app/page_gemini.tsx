import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Locale = "zh" | "en";
type Notice = { type: "success" | "error" | "info"; text: string };
type AuthStatus = "checking" | "signedOut" | "signedIn";
type SystemStatus = "unknown" | "available" | "unavailable";
type InteractionStatus = "checking" | "ready" | "authRequired" | "generating";
type ResultStatus = "empty" | "success" | "error";
type AuthUser = { id: string; email: string; createdAt: string; emailVerifiedAt: string | null; lastLoginAt: string | null; creditBalance: number };
type ImageTaskResult = { id: string; status: string; prompt: string; createdAt: string; completedAt: string | null; model: string | null; costCredits: number; remainingCredits: number; assets: Array<{ id: string; fileUrl: string; width: number | null; height: number | null }> };

type Copy = {
  signIn: string; signOut: string; close: string; generate: string; generating: string; credits: string;
  signedOut: string; signedIn: string; checking: string; ready: string; authRequired: string;
  providerAvailable: string; providerUnavailable: string; providerUnknown: string; resultEmpty: string; resultSuccess: string; resultError: string;
  badge: string; tagline: string; heroEyebrow: string; landingTitle: string; landingBody: string; landingHint: string; keepPrompt: string;
  heroCtaPrimary: string; heroCtaSecondary: string;
  t2iMode: string; i2iMode: string; uploadRef: string; uploadHint: string;
  feature1Title: string; feature1Desc: string; feature2Title: string; feature2Desc: string; feature3Title: string; feature3Desc: string;
  playgroundTitle: string; playgroundDesc: string;
  promptLabel: string; landingPromptPlaceholder: string; workspacePromptPlaceholder: string; workspacePromptHint: string; i2iPromptPlaceholder: string;
  previewTitle: string; previewBody: string; previewCards: Array<[string, string, string]>; pathTitle: string; pathItems: string[];
  authTitle: string; authBody: string; email: string; code: string; sendCode: string; sendingCode: string; verify: string; verifying: string; authHint: string; cooldown: string;
  workspaceEyebrow: string; workspaceTitle: string; workspaceBody: string; runtimeTitle: string; runtimeBody: string; notesTitle: string; notesItems: string[];
  resultTitle: string; resultEmptyTitle: string; resultEmptyBody: string; latest: string; taskTitle: string; taskId: string; model: string; cost: string; createdAt: string; completedAt: string; accountTitle: string;
  ctaPrimary: string; ctaSecondary: string;
  sessionLoadFailed: string; sessionRefreshFailed: string; enterEmail: string; enterPrompt: string; enterSameEmail: string; enterCode: string; sentCode: string; requestTooFast: string; verifyTooFast: string; signedInNewNotice: string; signedInExistingNotice: string; signedOutNotice: string; loginToContinue: string; generateSuccess: string; unexpectedPayload: string; imagePreviewUnavailable: string;
  walletTitle: string; currentCredits: string; checkInBtn: string; checkedInBtn: string; getCredits: string; history: string; checkInSuccess: string;
  dashboardTitle: string; backToWorkspace: string; overview: string; transactionHistory: string; filterAll: string; filterConsumed: string; filterEarned: string; currentPlan: string; freePlan: string; upgradePlan: string; usageLast7Days: string;
};

const copy: Record<Locale, Copy> = {
  zh: {
    signIn: "登录账号", signOut: "退出登录", close: "关闭", generate: "生成图像", generating: "生成中...", credits: "积分",
    signedOut: "未登录", signedIn: "已登录", checking: "检查中", ready: "已就绪", authRequired: "需要登录",
    providerAvailable: "集群可用", providerUnavailable: "不可用", providerUnknown: "待确认", resultEmpty: "暂无结果", resultSuccess: "成功", resultError: "失败",
    badge: "SparkPost", tagline: "下一代视觉生成引擎", heroEyebrow: "SparkPost AI 现已上线", 
    landingTitle: "将想象力转化为\n现象级视觉资产。", 
    landingBody: "构建于顶级多模态大模型之上的专业工作台。利用极简的交互语言，以工业级的控制力探索、构建并渲染属于你的高保真数字艺术。", 
    heroCtaPrimary: "开始免费体验", heroCtaSecondary: "了解功能特性",
    t2iMode: "文生图", i2iMode: "图生图", uploadRef: "参考图", uploadHint: "点击或拖拽上传图片",
    feature1Title: "Gemini 智能引擎", feature1Desc: "内置由 Google Gemini 驱动的提示词扩写与灵感生成中枢，让简单的短语瞬间丰满为专业级咒语。",
    feature2Title: "实时无缝工作流", feature2Desc: "告别冗长的跳转。极客级的纯键盘友好界面，支持在任意状态下热切换，保持心流不被打断。",
    feature3Title: "毫秒级状态同步", feature3Desc: "所见即所得的消耗指示器与底座状态监控，企业级的可靠性保障每一次渲染任务都使命必达。",
    playgroundTitle: "即刻体验工作台", playgroundDesc: "在下方直接输入你的灵感，无需登录即可预览生图界面的专业级交互感受。",
    landingHint: "免登录即可输入 Prompt。在执行核心渲染时，我们将无缝保存你的进度并引导完成验证。", keepPrompt: "Prompt 会在登录前后保留。",
    promptLabel: "Prompt (提示词)", landingPromptPlaceholder: "例如：一张电影级的产品特写KV，半透明玻璃材质，深灰色背景，柔和的青色环境光，8k分辨率，辛烷渲染器...", workspacePromptPlaceholder: "描述你想生成的画面，例如：极简风格的工业设计产品、柔和的环境光...", i2iPromptPlaceholder: "输入 @ 可以直接引用已上传的参考图，例如：使用 @R2 的风格来重绘 @R1...", workspacePromptHint: "当前为同步单图路径，支持多状态连贯响应。",
    previewTitle: "预览体验", previewBody: "提交 prompt 后，生成结果将在此画布中渲染。", previewCards: [["探索", "风格定义", "通过 prompt 快速建立视觉方向。"], ["反馈", "实时预览", "错误与消耗状态实时同步。"], ["扩展", "灵活工作流", "为团队协作与资产沉淀提供空间。"]], pathTitle: "技术路径说明", pathItems: ["按需触发 Auth，而非阻断式登录墙。", "Auth Modal 与主界面共享上下文。", "登录后无缝过渡到专业工作台视图。"],
    authTitle: "验证以解锁渲染", authBody: "你的灵感已保存。完成极速邮箱验证后，渲染引擎将立即自动启动。", email: "工作邮箱", code: "6位安全码", sendCode: "获取安全码", sendingCode: "发送中...", verify: "验证并渲染", verifying: "验证中...", authHint: "沙盒环境提示：点击获取验证码后，后台将自动生成 123456 并填充以供测试。", cooldown: "重新发送",
    workspaceEyebrow: "SparkPost Studio", workspaceTitle: "工作台", workspaceBody: "主界面聚焦 prompt、生成动作、结果预览和任务信息。", runtimeTitle: "系统状态", runtimeBody: "实时反馈底层服务与接口可用性。", notesTitle: "说明", notesItems: ["专注于效率，去除冗余视觉干扰。", "若 Provider 异常，系统将在此暴露错误详情。"],
    resultTitle: "画布", resultEmptyTitle: "等待引擎指令", resultEmptyBody: "提交 prompt 后，生成结果将在此画布中渲染。", latest: "输出", taskTitle: "任务属性", taskId: "Task ID", model: "底层模型", cost: "算力消耗", createdAt: "创建时间", completedAt: "完成时间", accountTitle: "账户",
    ctaPrimary: "立即渲染", ctaSecondary: "了解更多",
    sessionLoadFailed: "会话加载失败", sessionRefreshFailed: "会话刷新失败", enterEmail: "请提供邮箱地址", enterPrompt: "请先输入 Prompt", enterSameEmail: "请使用接收验证码的邮箱", enterCode: "请输入验证码", sentCode: "已发送至 {email} {expires}{debug}", requestTooFast: "请求受限，请等待 {time}", verifyTooFast: "验证受限，请等待 {time}", signedInNewNotice: "账户已创建，欢迎加入 SparkPost", signedInExistingNotice: "身份已确认，欢迎回来", signedOutNotice: "已安全退出 SparkPost", loginToContinue: "请验证身份以启动引擎", generateSuccess: "渲染完成，产出 {count} 项资产", unexpectedPayload: "接口响应异常", imagePreviewUnavailable: "资产已生成但无法在此预览",
    walletTitle: "钱包与订阅", currentCredits: "当前可用积分", checkInBtn: "领取今日奖励 +20 积分", checkedInBtn: "今日已签到 (+20 积分)", getCredits: "获取积分", history: "流水明细", checkInSuccess: "签到成功！获得 20 积分。",
    dashboardTitle: "账单与订阅中心", backToWorkspace: "返回工作台", overview: "数据总览", transactionHistory: "积分流水", filterAll: "全部记录", filterConsumed: "仅看消耗", filterEarned: "仅看获得", currentPlan: "当前方案", freePlan: "免费基础版", upgradePlan: "升级至专业版", usageLast7Days: "近 7 日消耗趋势"
  },
  en: {
    signIn: "Sign In", signOut: "Log Out", close: "Close", generate: "Generate Image", generating: "Generating...", credits: "Credits",
    signedOut: "Unauthenticated", signedIn: "Authenticated", checking: "Checking", ready: "Ready", authRequired: "Auth Required",
    providerAvailable: "Cluster Online", providerUnavailable: "Unavailable", providerUnknown: "Unknown", resultEmpty: "Empty", resultSuccess: "Success", resultError: "Error",
    badge: "SparkPost", tagline: "Next-gen Visual Engine", heroEyebrow: "SparkPost AI is now live", 
    landingTitle: "Turn imagination into\nphenomenal visual assets.", 
    landingBody: "A professional workspace built on top-tier multimodal AI. Explore, construct, and render high-fidelity digital art with industrial-grade control and minimalist interaction.", 
    heroCtaPrimary: "Start Free Trial", heroCtaSecondary: "Explore Features",
    t2iMode: "Text to Image", i2iMode: "Image to Image", uploadRef: "Reference Image", uploadHint: "Click or drag to upload",
    feature1Title: "Gemini Intelligence", feature1Desc: "Powered by Google Gemini for prompt enhancement and inspiration. Turn simple phrases into professional-grade incantations instantly.",
    feature2Title: "Seamless Workflow", feature2Desc: "Say goodbye to clunky jumps. A pure, keyboard-friendly interface supporting hot-switching in any state to keep your flow unbroken.",
    feature3Title: "Real-time Sync", feature3Desc: "WYSIWYG credit indicators and cluster status monitoring. Enterprise-grade reliability ensures every render job is delivered.",
    playgroundTitle: "Experience the Studio", playgroundDesc: "Enter your inspiration below to preview the professional interaction of our generation studio without logging in.",
    landingHint: "Enter your prompt without logging in. We will seamlessly save your progress and prompt you to verify when you execute the core render.", keepPrompt: "Prompt preserved across sessions.",
    promptLabel: "Prompt", landingPromptPlaceholder: "e.g., A cinematic close-up of a high-tech product, translucent glass, dark gray background, soft cyan ambient light, 8k, Octane render...", workspacePromptPlaceholder: "Describe your scene, e.g., Minimalist industrial design, soft ambient light...", i2iPromptPlaceholder: "Type @ to reference uploaded images, e.g., Redraw @R1 using the style of @R2...", workspacePromptHint: "Synchronous single-image pipeline.",
    previewTitle: "Preview Experience", previewBody: "Submit a prompt to render the output on this canvas.", previewCards: [["Explore", "Style Definition", "Establish visual direction quickly."], ["Feedback", "Real-time Sync", "Errors and credit changes in real-time."], ["Extend", "Flexible Flow", "Built for team collaboration and storage."]], pathTitle: "Architecture Path", pathItems: ["On-demand auth, no hard login walls.", "Auth Modal shares context with workspace.", "Seamless transition to pro view."],
    authTitle: "Verify to unlock render", authBody: "Your inspiration is saved. The render engine will start automatically after a quick email verification.", email: "Work Email", code: "6-digit Code", sendCode: "Get Code", sendingCode: "Sending...", verify: "Verify & Render", verifying: "Verifying...", authHint: "Sandbox note: Clicking 'Get Code' will auto-fill 123456 for testing purposes.", cooldown: "Resend in",
    workspaceEyebrow: "SparkPost Studio", workspaceTitle: "Studio", workspaceBody: "Focused purely on composition, generation, and task details.", runtimeTitle: "System Status", runtimeBody: "Real-time feedback on underlying services.", notesTitle: "Notes", notesItems: ["Optimized for efficiency, removing visual noise.", "Provider issues will be surfaced here clearly."],
    resultTitle: "Canvas", resultEmptyTitle: "Awaiting Instructions", resultEmptyBody: "Submit a prompt to render the output on this canvas.", latest: "Output", taskTitle: "Properties", taskId: "Task ID", model: "Base Model", cost: "Compute Cost", createdAt: "Created", completedAt: "Completed", accountTitle: "Account",
    ctaPrimary: "Render Now", ctaSecondary: "Learn More",
    sessionLoadFailed: "Failed to load session", sessionRefreshFailed: "Failed to refresh session", enterEmail: "Provide an email address", enterPrompt: "Enter a prompt first", enterSameEmail: "Use the email that received the code", enterCode: "Enter the code", sentCode: "Sent to {email} {expires}{debug}", requestTooFast: "Rate limited, wait {time}", verifyTooFast: "Verification limited, wait {time}", signedInNewNotice: "Account created, welcome to SparkPost", signedInExistingNotice: "Identity confirmed, welcome back", signedOutNotice: "Safely signed out from SparkPost", loginToContinue: "Verify identity to start engine", generateSuccess: "Render complete, generated {count} asset(s)", unexpectedPayload: "Unexpected API response", imagePreviewUnavailable: "Asset created but preview failed",
    walletTitle: "Wallet & Subscription", currentCredits: "Available Credits", checkInBtn: "Claim Daily +20 Credits", checkedInBtn: "Checked in (+20 Credits)", getCredits: "Get Credits", history: "History", checkInSuccess: "Check-in successful! +20 Credits.",
    dashboardTitle: "Billing & Subscription", backToWorkspace: "Back to Workspace", overview: "Overview", transactionHistory: "Transactions", filterAll: "All", filterConsumed: "Consumed", filterEarned: "Earned", currentPlan: "Current Plan", freePlan: "Free Tier", upgradePlan: "Upgrade to Pro", usageLast7Days: "Usage (Last 7 Days)"
  }
};

const timeLeftText = (seconds: number) => seconds <= 0 ? "0s" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60 || ""}`.trim();
const formatDate = (value: string | null, locale: Locale) => value ? new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
const formatTemplate = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const primaryImageUrl = (task: ImageTaskResult | null) => task?.assets[0]?.fileUrl ?? null;

const apiKey = "";

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [locale, setLocale] = useState<Locale>("en");
  
  const [prompts, setPrompts] = useState({
    t2i: "A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.",
    i2i: ""
  });

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
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
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("available");
  
  const [mode, setMode] = useState<'t2i' | 'i2i'>('t2i');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionMenuPos, setMentionMenuPos] = useState<{top: number, left: number} | null>(null);
  const [hoveredBadge, setHoveredBadge] = useState<{img: string, rect: DOMRect} | null>(null);
  const savedRange = useRef<Range | null>(null);
  const activeEditorRef = useRef<HTMLElement | null>(null);
  const isTypingRef = useRef(false);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isInspiring, setIsInspiring] = useState(false);

  // === 积分抽屉与全屏面板相关状态 ===
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'topup'|'history'>('topup');
  const [historyFilter, setHistoryFilter] = useState<'all'|'consumed'|'earned'>('all');

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = copy[locale];
  const authStatus: AuthStatus = isLoadingSession ? "checking" : user ? "signedIn" : "signedOut";
  const cooldownActive = useMemo(() => cooldownEndsAt !== null && timeLeft > 0, [cooldownEndsAt, timeLeft]);

  // 模拟签到
  const handleCheckIn = () => {
    if (!hasCheckedIn && user) {
      setUser({ ...user, creditBalance: user.creditBalance + 20 });
      setHasCheckedIn(true);
      setGenerationNotice({ type: 'success', text: t.checkInSuccess });
    }
  };

  // 模拟积分明细数据
  const mockHistory = useMemo(() => [
    { id: 1, type: 'earned', title: locale === 'zh' ? '每日签到' : 'Daily Check-in', amount: 20, date: '2023-10-27 09:00:00' },
    { id: 2, type: 'consumed', title: locale === 'zh' ? '图生图消耗' : 'I2I Generation', amount: -15, date: '2023-10-26 14:32:11' },
    { id: 3, type: 'consumed', title: locale === 'zh' ? '文生图消耗' : 'T2I Generation', amount: -10, date: '2023-10-26 10:15:00' },
    { id: 4, type: 'earned', title: locale === 'zh' ? '充值套餐' : 'Starter Pack', amount: 500, date: '2023-10-25 18:20:00' },
  ], [locale]);

  const filteredHistory = useMemo(() => mockHistory.filter(item => {
    if (historyFilter === 'all') return true;
    return item.type === historyFilter;
  }), [mockHistory, historyFilter]);

  const handleModeSwitch = (newMode: 't2i' | 'i2i') => {
    setMode(newMode);
    isTypingRef.current = false;
    setShowMentionMenu(false);
    setMentionMenuPos(null);
    setHoveredBadge(null);
  };

  // ---------------- 提取统一的原子级 HTML 渲染 (无 Margin, 无 Flex) ----------------
  const getBadgeHTML = (img: string, idx: number, isDark: boolean) => {
    const bg = isDark ? '#222' : '#ecfeff';
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(6,182,212,0.3)';
    // 【终极重构：保留原生 inline-block，拒绝双光标】
    return `<span class="mention-badge" contenteditable="false" data-img="${img}" style="display: inline-block; vertical-align: middle; user-select: none;"><span style="display: inline-block; height: 22px; line-height: 20px; padding: 0 6px; border-radius: 4px; background: ${bg}; border: 1px solid ${border}; box-sizing: border-box; white-space: nowrap;"><img src="${img}" style="display: inline-block; width: 14px; height: 14px; border-radius: 2px; object-fit: cover; vertical-align: middle; margin-right: 4px; pointer-events: none;" /><span style="display: inline-block; font-size: 11px; font-weight: bold; color: #06b6d4; vertical-align: middle; pointer-events: none; margin-bottom: 1px;">@R${idx + 1}</span></span></span>`;
  };

  const syncEditorHTML = (text: string, editor: HTMLElement, images: string[], currentMode: string) => {
    if (!editor) return;
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    
    if (currentMode === 'i2i') {
      images.forEach((img, idx) => {
        const regex = new RegExp(`@R${idx + 1}\\b`, 'g');
        html = html.replace(regex, getBadgeHTML(img, idx, isDark));
      });
    }
    editor.innerHTML = html;
  };

  useEffect(() => {
    if (!isTypingRef.current && activeEditorRef.current) {
      syncEditorHTML(prompts[mode], activeEditorRef.current, uploadedImages, mode);
    }
    isTypingRef.current = false;
  }, [prompts, mode, uploadedImages, isDark]);

  const handleEditorInput = (e: React.FormEvent<HTMLDivElement>, currentMode: 't2i' | 'i2i') => {
    const el = e.currentTarget;
    activeEditorRef.current = el;
    isTypingRef.current = true;
    
    const newText = el.innerText.replace(/\u00A0/g, ' ');
    setPrompts(prev => ({ ...prev, [currentMode]: newText }));

    if (currentMode === 'i2i' && uploadedImages.length > 0) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textBefore = range.startContainer.textContent?.slice(0, range.startOffset) || "";
        const match = textBefore.match(/@(\w*)$/);
        
        if (match) {
          savedRange.current = range.cloneRange();
          // 【完美定位探针】：使用临时零宽字符，精确捕捉此瞬间光标的绝对屏幕位置
          let rect = range.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            const span = document.createElement('span');
            span.textContent = '\u200b';
            range.insertNode(span);
            rect = span.getBoundingClientRect();
            span.parentNode?.removeChild(span);
          }
          setMentionMenuPos({ top: rect.bottom + 4, left: Math.max(16, rect.left) });
          setShowMentionMenu(true);
        } else {
          setShowMentionMenu(false);
          setMentionMenuPos(null);
        }
      }
    }
  };

  const insertMention = (idx: number) => {
    if (!savedRange.current || !activeEditorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    selection.addRange(savedRange.current);

    const range = savedRange.current;
    const startContainer = range.startContainer;
    const textBeforeCursor = startContainer.textContent?.slice(0, range.startOffset) || "";
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      // 抹掉 @ 字符
      range.setStart(startContainer, range.startOffset - match[0].length);
      range.deleteContents();

      // 使用同款完美原子 DOM 结构插入
      const img = uploadedImages[idx];
      const fragment = document.createRange().createContextualFragment(getBadgeHTML(img, idx, isDark));
      const badgeNode = fragment.firstChild as HTMLElement;
      
      range.insertNode(badgeNode);
      range.setStartAfter(badgeNode);
      range.setEndAfter(badgeNode);
      
      // 【关键隔离】：插入普通空格 \u00A0 强制让光标跟在后面，而不是和无外边距的元素重叠
      const space = document.createTextNode('\u00A0');
      range.insertNode(space);
      range.setStartAfter(space);
      range.collapse(true);

      selection.removeAllRanges();
      selection.addRange(range);
    }

    setShowMentionMenu(false);
    setMentionMenuPos(null);
    isTypingRef.current = true;
    setPrompts(prev => ({ ...prev, [mode]: activeEditorRef.current!.innerText.replace(/\u00A0/g, ' ') }));
  };

  const handleEditorMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const badge = target.closest('.mention-badge') as HTMLElement;
    if (badge) {
      const img = badge.getAttribute('data-img');
      if (img) {
        setHoveredBadge({ img, rect: badge.getBoundingClientRect() });
        return;
      }
    }
    if (hoveredBadge) setHoveredBadge(null);
  };

  const handleEditorMouseLeave = () => {
    setHoveredBadge(null);
  };

  // --- 其他核心逻辑 ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - uploadedImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setGenerationNotice({ type: "info", text: locale === 'zh' ? "最多只能上传 5 张参考图" : "Max 5 reference images allowed" });
    }

    const newImagesPromises = filesToProcess.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImagesPromises).then(newImages => {
      setUploadedImages(prev => [...prev, ...newImages]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  useEffect(() => {
    if (authStatus === "signedOut" && showLoginPanel && pendingGenerateAfterLogin) {
      setAuthNotice({ type: "info", text: t.loginToContinue });
    }
  }, [authStatus, pendingGenerateAfterLogin, showLoginPanel, t.loginToContinue]);

  useEffect(() => {
    if (!cooldownEndsAt) { setTimeLeft(0); return undefined; }
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
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const callGeminiAPI = async (systemInstruction: string, userText: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: userText }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    const delays = [1000, 2000, 4000, 8000, 16000];
    let lastError = null;

    for (let i = 0; i <= delays.length; i++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API Request failed: ${response.status}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (error) {
        lastError = error;
        if (i < delays.length) await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
    throw lastError;
  };

  const handleEnhance = async () => {
    const currentPrompt = prompts[mode];
    if (!currentPrompt.trim()) {
      setGenerationNotice({ type: "error", text: locale === 'zh' ? "⚠️ 请先写下简短的基础概念再点击扩写。" : "⚠️ Please enter a basic concept first." });
      return;
    }
    setGenerationNotice(null);
    setIsEnhancing(true);
    try {
      const systemPrompt = "你是一个精通 Midjourney 和 Stable Diffusion 的专业 AI 绘画提示词专家。请把用户输入的简单短语扩充为极其详细、富有画面感的专业英文提示词。要求包含：明确的主体描述、精细的背景环境、电影级的光影设置、渲染器和相机参数。最后换行附上这段英文的中文翻译。请直接返回结果，不要有任何寒暄。";
      const enhancedText = await callGeminiAPI(systemPrompt, currentPrompt);
      setPrompts(prev => ({ ...prev, [mode]: enhancedText.trim() }));
    } catch (e) {
      setGenerationNotice({ type: "error", text: locale === 'zh' ? "⚠️ 提示词扩写失败，请检查 API 密钥或稍后重试。" : "⚠️ Failed to enhance prompt, check API key or try again." });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleInspire = async () => {
    setGenerationNotice(null);
    setIsInspiring(true);
    try {
      const systemPrompt = "你是一个充满创意的 AI 艺术总监。请随机为一个令人惊艳的画面构思并写出专业的 AI 绘画英文提示词。必须包含：主体、动态细节、环境、色彩倾向、灯光和渲染质量词汇。最后换行附上中文翻译。直接返回结果，绝不允许有任何寒暄。";
      const inspirationText = await callGeminiAPI(systemPrompt, "随机给我一个惊艳的绘画灵感");
      setPrompts(prev => ({ ...prev, [mode]: inspirationText.trim() }));
    } catch (e) {
      setGenerationNotice({ type: "error", text: locale === 'zh' ? "⚠️ 灵感获取失败，请检查 API 密钥或稍后重试。" : "⚠️ Failed to get inspiration, check API key or try again." });
    } finally {
      setIsInspiring(false);
    }
  };

  const generateImage = useCallback(async () => {
    setGenerationNotice(null);
    const currentPrompt = prompts[mode];
    
    if (!currentPrompt.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }

    if (mode === 'i2i' && uploadedImages.length === 0) {
      setGenerationNotice({ type: "error", text: locale === 'zh' ? "图生图模式下至少需要上传 1 张参考图" : "At least 1 reference image required" });
      return;
    }

    const cost = mode === 't2i' ? 10 : 15;
    if (user && user.creditBalance < cost) {
      // 积分不足，拦截并拉起抽屉
      setGenerationNotice({ type: "error", text: locale === 'zh' ? `⚠️ 积分不足，本次渲染需要 ${cost} 积分` : `⚠️ Insufficient credits, requires ${cost} credits` });
      setIsDrawerOpen(true);
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setGenerationTask(null);
    setPreviewLoadFailed(false);
    
    setTimeout(() => {
      const mockTask: ImageTaskResult = {
        id: "tsk_" + Math.random().toString(36).substr(2, 9),
        status: "completed",
        prompt: currentPrompt,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        model: mode === 't2i' ? "SparkPost Visual v2.4" : "SparkPost ImageControl v1.2",
        costCredits: cost,
        remainingCredits: (user?.creditBalance || 50) - cost,
        assets: [{ id: "ast_1", fileUrl: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2400&auto=format&fit=crop&random=${Math.random()}`, width: 1024, height: 1024 }]
      };
      
      setSystemStatus("available");
      setGenerationTask(mockTask);
      setGeneratedImageUrl(primaryImageUrl(mockTask));
      setGenerationNotice({ type: "success", text: formatTemplate(t.generateSuccess, { count: 1 }) });
      if (user) setUser({ ...user, creditBalance: mockTask.remainingCredits });
      setIsGeneratingImage(false);
    }, 3000);
  }, [prompts, t, user, mode, uploadedImages.length, locale]);

  useEffect(() => {
    if (user && pendingGenerateAfterLogin && !isGeneratingImage) {
      setPendingGenerateAfterLogin(false);
      void generateImage();
    }
  }, [generateImage, isGeneratingImage, pendingGenerateAfterLogin, user]);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) { setAuthNotice({ type: "error", text: t.enterEmail }); return; }
    setIsSendingCode(true);
    setTimeout(() => {
      setIsSendingCode(false);
      setCode("123456");
      setAuthNotice({ type: "success", text: formatTemplate(t.sentCode, { email, expires: " 10:00 AM.", debug: " Debug code: 123456." }) });
      codeRef.current?.focus();
    }, 800);
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) { setAuthNotice({ type: "error", text: t.enterSameEmail }); return; }
    if (!code.trim()) { setAuthNotice({ type: "error", text: t.enterCode }); return; }
    setIsVerifyingCode(true);
    setTimeout(() => {
      setIsVerifyingCode(false);
      setUser({
        id: "usr_mock_" + Math.random().toString(36).substr(2, 6),
        email: email,
        createdAt: new Date().toISOString(),
        emailVerifiedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        creditBalance: 50 // 默认送50分
      });
      setCode("");
      setCooldownEndsAt(null);
      setShowLoginPanel(false);
      setAuthNotice({ type: "success", text: t.signedInNewNotice });
    }, 1200);
  }

  async function handleLogout() {
    setUser(null);
    setCode("");
    setShowAccountMenu(false);
    setShowLoginPanel(false);
    setShowDashboard(false);
    setIsDrawerOpen(false);
    setPendingGenerateAfterLogin(false);
    setGenerationTask(null);
    setGeneratedImageUrl(null);
    setPreviewLoadFailed(false);
    setAuthNotice({ type: "info", text: t.signedOutNotice });
  }

  function requireLoginToGenerate() {
    setShowLoginPanel(true);
    setPendingGenerateAfterLogin(true);
    setAuthNotice({ type: "info", text: t.loginToContinue });
  }

  const canGenerate = !!prompts[mode].trim() && !isGeneratingImage;
  const accountInitials = user?.email.slice(0, 2).toUpperCase() ?? "SP";
  const currentCost = mode === 't2i' ? 10 : 15;

  const Icons = {
    Sparkles: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
    Zap: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4z"/></svg>,
    Brain: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4 4.5 4.5 0 0 1 3-4 4.5 4.5 0 0 1 3-4Z"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/></svg>,
    Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>,
    Play: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>,
    Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Image: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
    Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>,
    Moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>,
    Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>,
    Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    CreditCard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>,
    CheckCircle: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    ArrowLeft: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
    Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
  };

  const NoticeBanner = ({ notice }: { notice: Notice }) => {
    const colors = notice.type === "error" 
      ? "border-red-500/50 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" 
      : notice.type === "success" 
        ? "border-green-500/50 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" 
        : "border-gray-200 bg-gray-100 text-gray-700 dark:border-white/20 dark:bg-white/5 dark:text-gray-300";
    return <div className={`px-3 py-2.5 text-sm rounded-lg border ${colors}`}>{notice.text}</div>;
  };

  return (
    <div className={`${isDark ? 'dark' : ''}`}>
      <style dangerouslySetInnerHTML={{__html: `
        .prompt-editor:empty:before {
          content: attr(data-placeholder);
          color: #6b7280;
          pointer-events: none;
          display: block;
        }
        .dark .prompt-editor:empty:before { color: #52525b; }
      `}} />

      {/* --- 精确指哪打哪的下拉菜单 --- */}
      {showMentionMenu && mentionMenuPos && (
        <div 
          className="fixed z-[130] w-56 bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: mentionMenuPos.top, left: mentionMenuPos.left }}
        >
          <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/40">Select Reference</div>
          <div className="max-h-48 overflow-y-auto">
            {uploadedImages.map((img, idx) => (
              <button key={idx} onClick={() => insertMention(idx)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cyan-50 dark:hover:bg-white/5 transition-colors text-left border-b border-gray-100 dark:border-white/5 last:border-0 group">
                <div className="relative">
                  <img src={img} className="w-8 h-8 rounded border border-gray-200 dark:border-white/10 object-cover shadow-sm" />
                  <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-[9px] font-bold px-1 rounded shadow">R{idx + 1}</div>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">Insert @R{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- 悬浮 @ 图片的大图预览 --- */}
      {hoveredBadge && (
        <div 
          className="fixed z-[120] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: hoveredBadge.rect.left + hoveredBadge.rect.width / 2,
            top: hoveredBadge.rect.top > 180 ? hoveredBadge.rect.top - 160 : hoveredBadge.rect.bottom + 10,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 p-1.5 rounded-xl shadow-2xl">
            <img src={hoveredBadge.img} className="w-36 h-36 object-cover rounded-lg" />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 dark:bg-[#000] text-gray-900 dark:text-[#EDEDED] font-sans flex flex-col selection:bg-cyan-500/30 scroll-smooth transition-colors duration-300">
        
        {/* 顶部导航 */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 dark:border-white/10 px-6 bg-white/70 dark:bg-black/50 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 shadow-sm transition-transform duration-300 group-hover:scale-105 overflow-hidden">
              <div className="absolute h-5 w-5 rounded-full border border-cyan-400/40 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute h-5 w-5 rounded-full border border-indigo-500/30 animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="relative z-10">
                <ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-30 12 12)" stroke="url(#ring-grad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 2" />
                <circle cx="12" cy="12" r="5" fill="url(#planet-grad)" />
                <circle cx="3" cy="6" r="1.5" fill="#38bdf8"><animate attributeName="opacity" values="0.2; 1; 0.2" dur="2s" repeatCount="indefinite" /></circle>
                <circle cx="20" cy="18" r="1" fill="#818cf8"><animate attributeName="opacity" values="1; 0.2; 1" dur="3s" repeatCount="indefinite" /></circle>
                <defs>
                  <linearGradient id="planet-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#4f46e5" /></linearGradient>
                  <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" /></linearGradient>
                </defs>
              </svg>
            </div>
            <span className="text-[15px] font-bold tracking-wide text-gray-900 dark:text-white transition-colors group-hover:text-cyan-600 dark:text-cyan-400">{t.badge}</span>
            <div className="w-px h-4 bg-gray-300 dark:bg-white/20 mx-2"></div>
            <button onClick={(e) => { e.stopPropagation(); setIsDark(!isDark); }} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-0.5">
              {(["zh", "en"] as Locale[]).map((value) => (
                <button key={value} type="button" onClick={() => setLocale(value)} className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all duration-300 ${locale === value ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-[#CCC]"}`}>{value === "zh" ? "中文" : "EN"}</button>
              ))}
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                {/* 积分抽屉触发器 */}
                <button onClick={() => setIsDrawerOpen(true)} className="hidden sm:flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-xs font-medium transition-colors group cursor-pointer">
                  <div className="text-cyan-600 dark:text-cyan-400 group-hover:animate-pulse"><Icons.Zap /></div>
                  <span className="text-gray-900 dark:text-white font-bold">{user.creditBalance} {t.credits}</span>
                </button>
                <div className="relative" ref={menuRef}>
                  <button type="button" onClick={() => setShowAccountMenu((curr) => !curr)} className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-[#111] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-medium transition-colors hover:bg-gray-300 dark:hover:bg-[#222] shadow-sm">
                    {accountInitials}
                  </button>
                  {showAccountMenu && (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-56 rounded-xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95">
                      <div className="p-4 border-b border-gray-100 dark:border-white/10">
                        <div className="text-xs text-gray-500 dark:text-[#888] truncate">{user.email}</div>
                      </div>
                      <div className="p-1.5">
                        <button type="button" onClick={() => { setShowAccountMenu(false); setShowDashboard(true); }} className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-[#CCC] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <Icons.CreditCard /> {t.dashboardTitle}
                        </button>
                        <button type="button" onClick={() => void handleLogout()} className="w-full flex items-center gap-2 text-left rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-[#CCC] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors">
                           <Icons.X /> {t.signOut}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowLoginPanel(true)} className="text-xs font-medium text-gray-700 dark:text-white px-4 py-2 rounded-full border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                {t.signIn}
              </button>
            )}
          </div>
        </header>

        {/* --- 快捷入口：积分收纳抽屉 (Drawer) --- */}
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] transition-opacity duration-300 ${
            isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsDrawerOpen(false)}
        />
        <div
            className={`fixed top-0 right-0 w-full sm:w-[420px] h-full bg-white dark:bg-[#111] border-l border-gray-200 dark:border-white/10 z-[110] transform transition-transform duration-300 ease-out shadow-2xl flex flex-col ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5">
            <h2 className="text-lg font-bold flex items-center gap-2 tracking-wide text-gray-900 dark:text-white">
                <div className="text-cyan-600 dark:text-cyan-400"><Icons.Sparkles /></div>
                {t.walletTitle}
            </h2>
            <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
                <Icons.X />
            </button>
            </div>

            <div className="p-8 flex flex-col items-center border-b border-gray-100 dark:border-white/5 bg-gradient-to-b from-gray-50 dark:from-white/[0.02] to-transparent">
              <span className="text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium">{t.currentCredits}</span>
              <div className="text-6xl font-mono font-bold mb-2 text-gray-900 dark:text-white tracking-tighter drop-shadow-md">
                  {user?.creditBalance || 0}
              </div>

              {/* 签到收纳区 */}
              <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${hasCheckedIn ? 'max-h-12 mt-2 opacity-80' : 'max-h-20 mt-6 opacity-100'}`}>
                {hasCheckedIn ? (
                   <div className="flex items-center justify-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium py-3 bg-green-50 dark:bg-green-400/10 rounded-xl border border-green-200 dark:border-green-400/20">
                      <Icons.CheckCircle /> {t.checkedInBtn}
                   </div>
                ) : (
                  <button
                    onClick={handleCheckIn}
                    disabled={!user}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                    !user
                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/5'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse hover:animate-none border border-cyan-400/50 cursor-pointer'
                    }`}
                  >
                    <Icons.Calendar />
                    {t.checkInBtn}
                  </button>
                )}
              </div>
            </div>

            <div className="flex border-b border-gray-100 dark:border-white/5 px-8 pt-4 gap-8 bg-white dark:bg-transparent">
            <button
                onClick={() => setActiveTab('topup')}
                className={`pb-4 text-sm font-bold transition-colors relative ${
                activeTab === 'topup' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
            >
                <span className="inline-block mr-2 align-text-bottom"><Icons.CreditCard /></span>
                {t.getCredits}
                {activeTab === 'topup' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500 dark:bg-cyan-400 rounded-t-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                )}
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`pb-4 text-sm font-bold transition-colors relative ${
                activeTab === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'
                }`}
            >
                <span className="inline-block mr-2 align-text-bottom"><Icons.Clock /></span>
                {t.history}
                {activeTab === 'history' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-500 dark:bg-cyan-400 rounded-t-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                )}
            </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide relative bg-gray-50 dark:bg-transparent">
            {activeTab === 'topup' ? (
                <div className="space-y-4 pb-10">
                {[
                    { pts: 500, price: '$4.99', popular: false, desc: locale === 'zh' ? '轻度创作包' : 'Starter Pack' },
                    { pts: 1200, price: '$9.99', popular: true, desc: locale === 'zh' ? '进阶灵感包' : 'Creator Pack' },
                    { pts: 3000, price: '$19.99', popular: false, desc: locale === 'zh' ? '专业生产力' : 'Pro Studio' },
                ].map((plan, idx) => (
                    <div
                    key={idx}
                    className={`relative p-5 rounded-2xl border flex justify-between items-center cursor-pointer transition-all duration-300 group ${
                        plan.popular
                        ? 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-400/10 hover:bg-cyan-100 dark:hover:bg-cyan-400/20'
                        : 'border-gray-200 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                    >
                    {plan.popular && (
                        <div className="absolute -top-3 left-5 bg-gradient-to-r from-cyan-400 to-blue-500 text-[10px] font-bold px-3 py-1 rounded-full text-white tracking-wider shadow-lg">
                        🔥 Popular
                        </div>
                    )}
                    <div>
                        <div className="text-gray-900 dark:text-white font-bold text-xl flex items-center gap-1.5 mb-1">
                        <span className={plan.popular ? "text-cyan-500 dark:text-cyan-400" : "text-gray-400"}><Icons.Sparkles /></span>
                        {plan.pts}
                        </div>
                        <div className="text-xs text-gray-500">{plan.desc}</div>
                    </div>
                    <div className="text-gray-900 dark:text-white font-mono text-xl group-hover:scale-105 transition-transform">
                        {plan.price}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="space-y-1">
                {hasCheckedIn && (
                    <div className="flex justify-between items-center py-3 px-2 border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.02] rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-400/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                        <Icons.Calendar />
                        </div>
                        <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Daily Check-in</div>
                        <div className="text-xs text-gray-500">Just now</div>
                        </div>
                    </div>
                    <div className="text-green-500 dark:text-green-400 font-mono text-base font-bold">+20</div>
                    </div>
                )}
                {/* 流水明细列表 */}
                <div className="flex justify-between items-center py-3 px-2 border-b border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/[0.02] rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
                        <Icons.Image />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Image Generation</div>
                        <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                    </div>
                    <div className="text-gray-900 dark:text-white font-mono text-base font-medium">-10</div>
                </div>
                </div>
            )}
            <div className="sticky bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-gray-50 dark:from-[#111] to-transparent pointer-events-none" />
            </div>
        </div>

        {/* ==================== 深度入口：全屏账单与订阅中心 (Dashboard) ==================== */}
        <div 
          className={`fixed inset-0 bg-gray-50 dark:bg-[#000] z-[200] overflow-y-auto transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${showDashboard ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}
        >
          <header className="h-16 shrink-0 flex items-center px-6 border-b border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#000]/60 backdrop-blur-xl sticky top-0 z-10">
             <button onClick={() => setShowDashboard(false)} className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                 <Icons.ArrowLeft /> {t.backToWorkspace}
             </button>
             <div className="mx-auto font-bold text-lg text-gray-900 dark:text-white">{t.dashboardTitle}</div>
             <div className="w-[100px]"></div>
          </header>
          
          <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="flex flex-col gap-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.overview}</h3>
                  
                  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                     <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t.currentCredits}</div>
                     <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white mb-6">{user?.creditBalance || 0}</div>
                     <button onClick={() => { setShowDashboard(false); setIsDrawerOpen(true); setActiveTab('topup'); }} className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-semibold hover:bg-black dark:hover:bg-gray-200 transition-colors">
                        {t.getCredits}
                     </button>
                  </div>

                  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                     <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{t.currentPlan}</div>
                     <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.freePlan}</div>
                     <div className="text-xs text-gray-500 dark:text-[#888] mb-6 leading-relaxed">包含基础速度引擎与每日限量额度。</div>
                     <button className="w-full py-3 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-400/20 rounded-xl font-semibold hover:bg-cyan-100 dark:hover:bg-cyan-400/20 transition-colors">
                        {t.upgradePlan}
                     </button>
                  </div>

                  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
                     <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">{t.usageLast7Days}</div>
                     <div className="flex items-end justify-between h-24 gap-2">
                         {[30, 70, 45, 90, 20, 60, 100].map((h, i) => (
                             <div key={i} className="w-full bg-cyan-100 dark:bg-cyan-900/30 rounded-t-sm relative group cursor-crosshair" style={{ height: `${h}%` }}>
                                 <div className="absolute inset-0 bg-cyan-500 dark:bg-cyan-400 opacity-0 group-hover:opacity-100 rounded-t-sm transition-opacity" />
                                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-black text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                     -{Math.floor(h * 1.5)}
                                 </div>
                             </div>
                         ))}
                     </div>
                     <div className="flex justify-between text-[10px] text-gray-400 mt-2 font-mono">
                         <span>7 days ago</span>
                         <span>Today</span>
                     </div>
                  </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.transactionHistory}</h3>
                      <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-lg border border-gray-200 dark:border-white/5">
                          <button onClick={() => setHistoryFilter('all')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${historyFilter === 'all' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-[#CCC]'}`}>{t.filterAll}</button>
                          <button onClick={() => setHistoryFilter('consumed')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${historyFilter === 'consumed' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-[#CCC]'}`}>{t.filterConsumed}</button>
                          <button onClick={() => setHistoryFilter('earned')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${historyFilter === 'earned' ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-[#CCC]'}`}>{t.filterEarned}</button>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
                      {filteredHistory.length > 0 ? (
                          <div className="divide-y divide-gray-100 dark:divide-white/5">
                              {filteredHistory.map((item) => (
                                  <div key={item.id} className="flex justify-between items-center p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'earned' ? 'bg-green-100 dark:bg-green-400/10 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400'}`}>
                                              {item.type === 'earned' ? (item.title.includes('充值') ? <Icons.CreditCard /> : <Icons.Calendar />) : <Icons.Image />}
                                          </div>
                                          <div>
                                              <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</div>
                                              <div className="text-xs text-gray-500 dark:text-[#888] font-mono mt-0.5">{item.date}</div>
                                          </div>
                                      </div>
                                      <div className={`font-mono text-base font-bold ${item.type === 'earned' ? 'text-green-500 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                                          {item.amount > 0 ? `+${item.amount}` : item.amount}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                              暂无相关记录
                          </div>
                      )}
                      
                      {filteredHistory.length > 0 && (
                          <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-500">
                              <span>Showing 1 to {filteredHistory.length} of 148 entries</span>
                              <div className="flex gap-1">
                                  <button className="px-3 py-1 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5">Previous</button>
                                  <button className="px-3 py-1 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5">Next</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col relative w-full">
          {!user ? (
            // ================= 未登录态 =================
            <div className="flex-1 w-full pb-24">
              <section className="relative pt-24 pb-16 px-6 overflow-hidden flex flex-col items-center text-center w-full min-h-[85vh] justify-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-cyan-400/10 dark:bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-medium mb-8">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                    {t.heroEyebrow}
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-900 to-gray-500 dark:from-white dark:to-white/60 mb-6 leading-[1.1] whitespace-pre-line">
                    {t.landingTitle}
                  </h1>
                  <p className="text-lg md:text-xl text-gray-600 dark:text-[#888] max-w-2xl leading-relaxed mb-10">
                    {t.landingBody}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button onClick={scrollToPlayground} className="flex items-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-black px-6 py-3.5 rounded-full font-semibold text-sm hover:bg-black dark:hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105">
                      {t.heroCtaPrimary} <Icons.Play />
                    </button>
                    <button onClick={() => window.scrollTo({ top: 800, behavior: 'smooth'})} className="flex items-center gap-2 bg-white dark:bg-[#111] text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 px-6 py-3.5 rounded-full font-medium text-sm hover:bg-gray-50 dark:hover:bg-[#222] transition-colors">
                      {t.heroCtaSecondary}
                    </button>
                  </div>
                </div>

                <div className="mt-16 w-full max-w-6xl mx-auto relative rounded-3xl overflow-hidden border border-gray-200 dark:border-white/5 shadow-2xl h-[400px] md:h-[600px] group bg-white dark:bg-black">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/20 dark:from-black dark:via-black/20 to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-transparent dark:from-black dark:via-transparent to-transparent z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-transparent to-gray-50 dark:from-black dark:via-transparent dark:to-black z-10" />
                  <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2560&auto=format&fit=crop" alt="Hero Art" className="w-full h-full object-cover opacity-90 dark:opacity-80 group-hover:scale-105 transition-transform duration-1000" />
                </div>
              </section>

              {/* 2. Feature Grid (功能特性介绍) */}
              <section className="py-24 px-6 w-full max-w-6xl mx-auto relative border-t border-gray-200 dark:border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-8 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 hover:border-cyan-500/30 transition-colors shadow-sm dark:shadow-none group">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icons.Brain />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t.feature1Title}</h3>
                    <p className="text-sm text-gray-600 dark:text-[#888] leading-relaxed">{t.feature1Desc}</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 hover:border-purple-500/30 transition-colors shadow-sm dark:shadow-none group">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icons.Zap />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t.feature2Title}</h3>
                    <p className="text-sm text-gray-600 dark:text-[#888] leading-relaxed">{t.feature2Desc}</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-white dark:bg-[#111] border border-gray-200 dark:border-white/5 hover:border-green-500/30 transition-colors shadow-sm dark:shadow-none group">
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icons.Shield />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t.feature3Title}</h3>
                    <p className="text-sm text-gray-600 dark:text-[#888] leading-relaxed">{t.feature3Desc}</p>
                  </div>
                </div>
              </section>

              {/* 3. Interactive Playground */}
              <section ref={playgroundRef} className="py-24 px-6 w-full max-w-6xl mx-auto">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">{t.playgroundTitle}</h2>
                  <p className="text-gray-600 dark:text-[#888] text-sm max-w-xl mx-auto">{t.playgroundDesc}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-xl flex flex-col md:flex-row overflow-hidden min-h-[450px]">
                  {/* 左侧控制台 */}
                  <div className="w-full md:w-[380px] border-b md:border-b-0 md:border-r border-gray-200 dark:border-white/10 p-6 flex flex-col bg-gray-50 dark:bg-[#0A0A0A]">
                    
                    <div className="flex bg-white dark:bg-[#111] p-1 rounded-xl border border-gray-200 dark:border-white/5 mb-5 shadow-sm dark:shadow-none">
                      <button onClick={() => handleModeSwitch('t2i')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${mode === 't2i' ? 'bg-gray-100 dark:bg-[#222] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#CCC]'}`}>
                        <Icons.Sparkles /> {t.t2iMode}
                      </button>
                      <button onClick={() => handleModeSwitch('i2i')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all ${mode === 'i2i' ? 'bg-gray-100 dark:bg-[#222] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#CCC]'}`}>
                        <Icons.Image /> {t.i2iMode}
                      </button>
                    </div>

                    {mode === 'i2i' && (
                      <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider block">
                            {t.uploadRef} <span className="text-cyan-600 dark:text-cyan-400 normal-case tracking-normal">({uploadedImages.length}/5)</span>
                          </label>
                        </div>
                        
                        {uploadedImages.length > 0 ? (
                          <div className="flex flex-wrap gap-3 mb-2">
                            {uploadedImages.map((img, idx) => (
                              <div key={idx} onClick={() => setPreviewImage(img)} className="relative w-[60px] h-[60px] group rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden cursor-pointer hover:border-cyan-500 transition-colors shadow-sm">
                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md shadow-sm">R{idx + 1}</div>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                   <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} disabled={isGeneratingImage} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                  <Icons.X />
                                </button>
                              </div>
                            ))}
                            {uploadedImages.length < 5 && (
                              <button onClick={() => !isGeneratingImage && fileInputRef.current?.click()} className="w-[60px] h-[60px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 text-gray-400 hover:text-cyan-600 hover:border-cyan-500 dark:hover:text-cyan-400 dark:hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-white/5 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div onClick={() => !isGeneratingImage && fileInputRef.current?.click()} className={`relative border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl h-24 flex flex-col items-center justify-center text-gray-500 transition-all group bg-gray-50 dark:bg-transparent ${isGeneratingImage ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-white/5 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer'}`}>
                            <Icons.Upload />
                            <span className="text-[11px] mt-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">Click to upload up to 5 images</span>
                          </div>
                        )}
                        <input type="file" multiple ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-h-[160px]">
                      <div className="flex justify-between items-end mb-3">
                        <label className="text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider">{t.promptLabel}</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={handleInspire} disabled={isInspiring || isGeneratingImage} className="text-[10px] flex items-center gap-1 bg-white dark:bg-[#111] text-gray-600 dark:text-[#CCC] border border-gray-200 dark:border-white/10 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50">
                            {isInspiring ? (locale === 'zh' ? '✨ 思考中...' : '✨ Inspiring...') : (locale === 'zh' ? '✨ 给我灵感' : '✨ Inspire Me')}
                          </button>
                          <button type="button" onClick={handleEnhance} disabled={isEnhancing || isGeneratingImage} className="text-[10px] flex items-center gap-1 bg-white dark:bg-[#111] text-gray-600 dark:text-[#CCC] border border-gray-200 dark:border-white/10 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-[#222] transition-colors disabled:opacity-50">
                            {isEnhancing ? (locale === 'zh' ? '✨ 优化中...' : '✨ Enhancing...') : (locale === 'zh' ? '✨ 智能扩写' : '✨ Enhance')}
                          </button>
                        </div>
                      </div>
                      
                      {/* --- 富文本 Prompt 核心交互区 --- */}
                      <div className="relative flex-1 flex flex-col">
                        {mode === 't2i' ? (
                          <div 
                            key="t2i-editor"
                            ref={(el) => { if (el) { activeEditorRef.current = el; if (el.innerHTML === "") { syncEditorHTML(prompts['t2i'], el, [], 't2i'); } } }}
                            contentEditable={!isGeneratingImage}
                            onInput={(e) => handleEditorInput(e, 't2i')}
                            onFocus={(e) => { activeEditorRef.current = e.currentTarget; }}
                            className="prompt-editor w-full flex-1 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-black/50 p-4 text-sm leading-relaxed text-gray-900 dark:text-white outline-none transition-colors focus:border-cyan-500/50 dark:focus:border-white/20 shadow-sm dark:shadow-none overflow-y-auto disabled:opacity-50" 
                            data-placeholder={t.landingPromptPlaceholder} 
                            style={{ minHeight: '140px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                          />
                        ) : (
                          <div 
                            key="i2i-editor"
                            ref={(el) => { if (el) { activeEditorRef.current = el; if (el.innerHTML === "") { syncEditorHTML(prompts['i2i'], el, uploadedImages, 'i2i'); } } }}
                            contentEditable={!isGeneratingImage}
                            onInput={(e) => handleEditorInput(e, 'i2i')}
                            onMouseMove={handleEditorMouseMove}
                            onMouseLeave={handleEditorMouseLeave}
                            onFocus={(e) => { activeEditorRef.current = e.currentTarget; }}
                            className="prompt-editor w-full flex-1 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-black/50 p-4 text-sm leading-[26px] text-gray-900 dark:text-white outline-none transition-colors focus:border-cyan-500/50 dark:focus:border-white/20 shadow-sm dark:shadow-none overflow-y-auto disabled:opacity-50" 
                            data-placeholder={t.i2iPromptPlaceholder} 
                            style={{ minHeight: '140px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                          />
                        )}
                      </div>

                    </div>
                    
                    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-white/5 space-y-4">
                      {generationNotice && <NoticeBanner notice={generationNotice} />}
                      <button type="button" onClick={requireLoginToGenerate} className="w-full rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-3.5 text-sm font-semibold transition-all hover:bg-black dark:hover:bg-gray-200 hover:scale-[1.02]">
                        {t.ctaPrimary}
                      </button>
                      <p className="text-[11px] text-gray-500 dark:text-[#666] text-center leading-relaxed">{t.landingHint}</p>
                    </div>
                  </div>
                  
                  {/* 右侧画布 */}
                  <div className="flex-1 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:24px_24px] bg-gray-50 dark:bg-[#000] p-6 flex flex-col items-center justify-center relative transition-colors duration-300">
                    <div className="w-full max-w-sm p-8 rounded-2xl border border-gray-200 dark:border-white/5 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md text-center shadow-xl">
                      <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#111] flex items-center justify-center mx-auto mb-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-white/20 animate-pulse" />
                      </div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white mb-2">{t.resultEmptyTitle}</div>
                      <div className="text-xs text-gray-500 dark:text-[#666] leading-relaxed">{t.previewBody}</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            // ================= 已登录：专业工作台视图 (Generation Studio) =================
            <div className="flex-1 flex overflow-hidden w-full">
              {/* 左侧控制台 */}
              <aside className="w-full md:w-[380px] flex shrink-0 flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] overflow-y-auto">
                <div className="p-6 flex flex-col gap-6 flex-1">
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#111]">
                      <div className="text-[10px] text-gray-500 dark:text-[#666] uppercase tracking-wider mb-2">Provider</div>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-900 dark:text-white">
                        <span className={`w-2 h-2 rounded-full ${systemStatus === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : systemStatus === 'unavailable' ? 'bg-red-500' : 'bg-gray-500'}`} />
                        {systemStatus === "available" ? t.providerAvailable : systemStatus === "unavailable" ? t.providerUnavailable : t.providerUnknown}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#111]">
                      <div className="text-[10px] text-gray-500 dark:text-[#666] uppercase tracking-wider mb-2">Status</div>
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-900 dark:text-white">
                        <span className={`w-2 h-2 rounded-full ${isGeneratingImage ? 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-green-500'}`} />
                        {isGeneratingImage ? t.generating : t.ready}
                      </div>
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-[#111] p-1 rounded-xl border border-gray-200 dark:border-white/5 mt-2">
                    <button onClick={() => handleModeSwitch('t2i')} disabled={isGeneratingImage} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${mode === 't2i' ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#CCC]'}`}>
                      <Icons.Sparkles /> {t.t2iMode}
                    </button>
                    <button onClick={() => handleModeSwitch('i2i')} disabled={isGeneratingImage} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50 ${mode === 'i2i' ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-[#666] hover:text-gray-900 dark:hover:text-[#CCC]'}`}>
                      <Icons.Image /> {t.i2iMode}
                    </button>
                  </div>

                  {mode === 'i2i' && (
                    <div className="mt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider block">
                          {t.uploadRef} <span className="text-cyan-600 dark:text-cyan-400 normal-case tracking-normal">({uploadedImages.length}/5)</span>
                        </label>
                      </div>

                      {uploadedImages.length > 0 ? (
                        <div className="flex flex-wrap gap-3 mb-2">
                          {uploadedImages.map((img, idx) => (
                            <div key={idx} onClick={() => setPreviewImage(img)} className="relative w-[60px] h-[60px] group rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden cursor-pointer hover:border-cyan-500 transition-colors shadow-sm">
                              <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md shadow-sm">R{idx + 1}</div>
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                 <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} disabled={isGeneratingImage} className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                <Icons.X />
                              </button>
                            </div>
                          ))}
                          {uploadedImages.length < 5 && (
                            <button onClick={() => !isGeneratingImage && fileInputRef.current?.click()} className="w-[60px] h-[60px] flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-white/10 text-gray-400 hover:text-cyan-600 hover:border-cyan-500 dark:hover:text-cyan-400 dark:hover:border-cyan-500/50 hover:bg-cyan-50 dark:hover:bg-white/5 transition-colors">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div onClick={() => !isGeneratingImage && fileInputRef.current?.click()} className={`relative border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl h-24 flex flex-col items-center justify-center text-gray-500 transition-all group bg-gray-50 dark:bg-transparent ${isGeneratingImage ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500/40 hover:bg-cyan-50 dark:hover:bg-white/5 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer'}`}>
                          <Icons.Upload />
                          <span className="text-[11px] mt-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">Click to upload up to 5 images</span>
                        </div>
                      )}
                      <input type="file" multiple ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                  )}

                  <div className="flex flex-col flex-1 min-h-[160px] mt-2">
                    <div className="flex justify-between items-end mb-3">
                      <label className="text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider">{t.promptLabel}</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleInspire} disabled={isInspiring || isGeneratingImage} className="text-[10px] flex items-center gap-1 bg-gray-100 dark:bg-[#111] text-gray-600 dark:text-[#CCC] border border-gray-200 dark:border-white/10 px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-[#222] transition-colors disabled:opacity-50">
                          {isInspiring ? (locale === 'zh' ? '✨ 思考中...' : '✨ Inspiring...') : (locale === 'zh' ? '✨ 给我灵感' : '✨ Inspire Me')}
                        </button>
                        <button type="button" onClick={handleEnhance} disabled={isEnhancing || isGeneratingImage} className="text-[10px] flex items-center gap-1 bg-gray-100 dark:bg-[#111] text-gray-600 dark:text-[#CCC] border border-gray-200 dark:border-white/10 px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-[#222] transition-colors disabled:opacity-50">
                          {isEnhancing ? (locale === 'zh' ? '✨ 优化中...' : '✨ Enhancing...') : (locale === 'zh' ? '✨ 智能扩写' : '✨ Enhance')}
                        </button>
                      </div>
                    </div>
                    
                    {/* --- 富文本 Prompt 核心交互区 (Workspace) --- */}
                    <div className="relative flex-1 flex flex-col">
                      {mode === 't2i' ? (
                        <div 
                          key="t2i-editor"
                          ref={(el) => { if (el) { activeEditorRef.current = el; if (el.innerHTML === "") { syncEditorHTML(prompts['t2i'], el, [], 't2i'); } } }}
                          contentEditable={!isGeneratingImage}
                          onInput={(e) => handleEditorInput(e, 't2i')}
                          onFocus={(e) => { activeEditorRef.current = e.currentTarget; }}
                          className="prompt-editor w-full flex-1 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#000] p-4 text-sm leading-relaxed text-gray-900 dark:text-white outline-none transition-colors focus:border-cyan-500/50 dark:focus:border-white/20 shadow-sm dark:shadow-none overflow-y-auto disabled:opacity-50" 
                          data-placeholder={t.workspacePromptPlaceholder} 
                          style={{ minHeight: '140px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                        />
                      ) : (
                        <div 
                          key="i2i-editor"
                          ref={(el) => { if (el) { activeEditorRef.current = el; if (el.innerHTML === "") { syncEditorHTML(prompts['i2i'], el, uploadedImages, 'i2i'); } } }}
                          contentEditable={!isGeneratingImage}
                          onInput={(e) => handleEditorInput(e, 'i2i')}
                          onMouseMove={handleEditorMouseMove}
                          onMouseLeave={handleEditorMouseLeave}
                          onFocus={(e) => { activeEditorRef.current = e.currentTarget; }}
                          className="prompt-editor w-full flex-1 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#000] p-4 text-sm leading-[26px] text-gray-900 dark:text-white outline-none transition-colors focus:border-cyan-500/50 dark:focus:border-white/20 shadow-sm dark:shadow-none overflow-y-auto disabled:opacity-50" 
                          data-placeholder={t.i2iPromptPlaceholder} 
                          style={{ minHeight: '140px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
                        />
                      )}
                    </div>

                  </div>

                  <div className="space-y-4">
                    {(authNotice || generationNotice) && (
                      <NoticeBanner notice={generationNotice || authNotice!} />
                    )}
                    <button type="button" onClick={() => void generateImage()} disabled={!canGenerate} className="w-full rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-3.5 text-sm font-semibold transition-all hover:bg-black dark:hover:bg-gray-200 disabled:opacity-50 hover:scale-[1.02] flex justify-center items-center gap-2">
                      {isGeneratingImage ? <span className="w-4 h-4 border-2 border-white/20 border-t-white dark:border-black/20 dark:border-t-black rounded-full animate-spin" /> : <Icons.Sparkles />}
                      {isGeneratingImage ? t.generating : t.generate}
                      {!isGeneratingImage && (
                        <span className="flex items-center gap-1 bg-white/20 dark:bg-black/10 px-2 py-0.5 rounded-md text-[10px] font-bold border border-white/10 dark:border-black/5">
                          <span className="text-cyan-400 dark:text-cyan-600"><Icons.Zap /></span>
                          {currentCost} {t.credits}
                        </span>
                      )}
                    </button>
                  </div>

                  {generationTask && (
                    <div className="mt-2 pt-6 border-t border-gray-200 dark:border-white/5">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">{t.taskTitle}</div>
                      <div className="space-y-3 text-xs bg-gray-50 dark:bg-[#000] p-4 rounded-xl border border-gray-200 dark:border-white/5">
                        <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-[#666]">{t.taskId}</span><span className="text-gray-700 dark:text-[#CCC] font-mono">{generationTask.id.substring(0,8)}...</span></div>
                        <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-[#666]">{t.model}</span><span className="text-gray-700 dark:text-[#CCC] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">{generationTask.model || "-"}</span></div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-[#666]">{t.cost}</span>
                          <span className="text-gray-700 dark:text-[#CCC] flex items-center gap-1">
                            <span className="text-cyan-600 dark:text-cyan-400"><Icons.Zap /></span>
                            {generationTask.costCredits} {t.credits}
                          </span>
                        </div>
                        <div className="flex justify-between items-center"><span className="text-gray-500 dark:text-[#666]">{t.completedAt}</span><span className="text-gray-700 dark:text-[#CCC]">{formatDate(generationTask.completedAt, locale)}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* 右侧大画布 */}
              <main className="flex-1 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:24px_24px] bg-gray-50 dark:bg-[#000] relative flex items-center justify-center p-8 overflow-y-auto transition-colors duration-300">
                {generatedImageUrl && !previewLoadFailed && !isGeneratingImage ? (
                  <div className="relative w-full h-full max-h-full flex items-center justify-center animate-in fade-in duration-700">
                    <img src={generatedImageUrl} alt="Generated result" className="object-contain w-full h-full rounded-md shadow-2xl" onError={() => setPreviewLoadFailed(true)} />
                  </div>
                ) : (
                  <div className="max-w-sm text-center">
                    <div className="w-16 h-16 rounded-full border border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0A] flex items-center justify-center mx-auto mb-6 shadow-xl">
                      {isGeneratingImage ? <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /> : <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-white/10" />}
                    </div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white mb-2">{isGeneratingImage ? t.generating : t.resultEmptyTitle}</div>
                    <div className="text-xs text-gray-500 dark:text-[#666] leading-relaxed max-w-[200px] mx-auto">{isGeneratingImage ? t.workspaceBody : previewLoadFailed ? t.imagePreviewUnavailable : t.resultEmptyBody}</div>
                  </div>
                )}
              </main>
            </div>
          )}
        </main>

        {/* --- 缩略图放大预览弹窗 (Lightbox) --- */}
        {previewImage && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
              <img 
                src={previewImage} 
                alt="Preview Full" 
                className="max-w-full max-h-full object-contain rounded-xl drop-shadow-2xl ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()} 
              />
              <button 
                onClick={() => setPreviewImage(null)} 
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 p-2.5 rounded-full backdrop-blur-md transition-colors"
              >
                <Icons.X />
              </button>
            </div>
          </div>
        )}

        {/* 共享 Auth 弹窗 (Modal) */}
        {showLoginPanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
              <button type="button" onClick={() => setShowLoginPanel(false)} className="absolute right-5 top-5 text-gray-400 dark:text-[#666] hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-100 dark:bg-white/5 rounded-full p-1.5 hover:bg-gray-200 dark:hover:bg-white/10">
                <Icons.X />
              </button>
              
              <div className="mb-8 mt-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t.authTitle}</h2>
                <p className="text-sm text-gray-600 dark:text-[#888] leading-relaxed">{t.authBody}</p>
              </div>

              {authNotice && <div className="mb-6"><NoticeBanner notice={authNotice} /></div>}

              <form className="space-y-4" onSubmit={(e) => void handleSendCode(e)}>
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider mb-2">{t.email}</label>
                  <input ref={emailRef} id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500/50 dark:focus:border-white/30 transition-colors" placeholder="you@example.com" />
                </div>
                <button type="submit" disabled={isSendingCode || cooldownActive} className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-[#111] px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#222] transition-colors disabled:opacity-50">
                  {isSendingCode ? t.sendingCode : cooldownActive ? `${t.cooldown} ${timeLeftText(timeLeft)}` : t.sendCode}
                </button>
              </form>

              <div className="my-6 border-t border-gray-200 dark:border-white/5" />

              <form className="space-y-4" onSubmit={(e) => void handleVerifyCode(e)}>
                <div>
                  <label htmlFor="auth-code" className="block text-xs font-semibold text-gray-500 dark:text-[#888] uppercase tracking-wider mb-2">{t.code}</label>
                  <input ref={codeRef} id="auth-code" type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-cyan-500/50 dark:focus:border-white/30 transition-colors tracking-[0.5em] text-center font-mono" placeholder="------" />
                </div>
                <button type="submit" disabled={isVerifyingCode} className="w-full rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-3.5 text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
                  {isVerifyingCode ? t.verifying : t.verify}
                </button>
              </form>

              <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-[11px] leading-relaxed text-center">
                {t.authHint}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}