/** Register new experiments here. No page components, queries or services are imported. */
export const TEST_HUB_PATH = "/test-pages";
export const MAIN_PAGE_ROUTES = [
  "/[region]/submission/[token]",
  "/",
  "/consultation",
  "/faq",
  "/privacy",
  "/solar-analysis",
  "/pwa",
  "/pwa/app",
  "/[region]",
  "/[region]/consultation",
  "/[region]/faq",
  "/[region]/privacy",
] as const;
export const TEST_GROUPS = [
  {
    id: "calculators",
    title: "Solar calculators",
    description:
      "Independent estimates for solar savings, system packages and battery backup.",
  },
  {
    id: "account",
    title: "Homepage & account",
    description:
      "The optional account experience, kept separate from the original homepage.",
  },
  {
    id: "contact",
    title: "Message review & legacy forms",
    description:
      "Local-only message review, exports and the archived standalone form. Public Contact us and FAQ are on the main website.",
  },
  {
    id: "media",
    title: "Images & rich text",
    description:
      "Try compression, uploads, rich-text editing and saved previews.",
  },
  {
    id: "records",
    title: "Record-specific previews",
    description:
      "These pages need a saved record. Start from the corresponding list.",
  },
] as const;
export type TestGroup = (typeof TEST_GROUPS)[number]["id"];
export type TestPageEntry = {
  route: string;
  title: string;
  description: string;
  group: TestGroup;
  access: string;
  href: string;
  action?: string;
  notice?: string;
  keywords: string[];
  shortcuts?: { title: string; href: string }[];
};
export const TEST_PAGES: TestPageEntry[] = [
  {
    route: "/submission-preview-test",
    title: "Legacy consultation result",
    description:
      "Retired map-based result and email preview. No longer part of the consultation flow.",
    group: "records",
    access: "Retired",
    href: "/submission-preview-test",
    keywords: ["legacy", "旧方案"],
  },
  {
    route: "/test-pages/cookie-preview",
    title: "Cookie preferences — UI prototype",
    description:
      "Preview the banner and settings dialog. Buttons only change this demo's appearance; no cookie controls are connected.",
    group: "account",
    access: "Local-only visual prototype",
    href: "/test-pages/cookie-preview",
    notice:
      "Not a working consent manager. Preferences are not persisted and do not affect any services.",
    keywords: ["cookie", "privacy", "隐私", "样式", "弹窗"],
  },
  {
    route: "/antigua-calculator-preview",
    title: "Antigua solar & battery calculator",
    description:
      "Estimate a hybrid system, electricity savings, indicative price and outage backup using a monthly electricity bill slider.",
    group: "calculators",
    access: "No sign-in required",
    href: "/antigua-calculator-preview",
    notice:
      "Local calculations only. Uses the APUA June 2026 tariff preset and provisional business assumptions, not a final quote.",
    keywords: [
      "安提瓜",
      "光储",
      "计算器",
      "电费",
      "电价",
      "电池",
      "apua",
      "solar",
      "payback",
    ],
  },
  {
    route: "/home-preview",
    title: "Homepage with account (archived prototype)",
    description:
      "The optional account status and account menu experiment. The public homepage remains account-free.",
    group: "account",
    access: "Sign-in optional",
    href: "/home-preview",
    keywords: ["首页", "登录状态", "菜单", "留言"],
    shortcuts: [
      { title: "Jump to Contact us", href: "/home-preview#contact-us" },
    ],
  },
  {
    route: "/auth-preview",
    title: "Sign in & create an account",
    description:
      "Test email/password access, registration, password recovery and the signed-in account view.",
    group: "account",
    access: "No sign-in required",
    href: "/auth-preview",
    notice: "Submitting these forms can create an account or send an email.",
    keywords: ["登录", "注册", "邮箱", "找回密码", "认证"],
    shortcuts: [
      { title: "Sign up", href: "/auth-preview?view=sign-up" },
      { title: "Forgot password", href: "/auth-preview?view=forgot" },
    ],
  },
  {
    route: "/auth-preview/update-password",
    title: "Set a new password",
    description:
      "Test the new-password form and the missing or expired recovery-session state.",
    group: "account",
    access: "Valid session to save",
    href: "/auth-preview/update-password",
    notice: "Saving changes the password for the current account.",
    keywords: ["密码", "重置", "过期", "修改密码"],
  },
  {
    route: "/my-submissions-preview",
    title: "My consultation submissions",
    description:
      "View all consultations associated with the signed-in email, with sorting and record previews.",
    group: "account",
    access: "Sign-in required",
    href: "/my-submissions-preview",
    notice: "When signed out, the login-required overlay is shown.",
    keywords: ["我的提交", "邮箱", "登录保护", "蒙层", "问价"],
  },
  {
    route: "/contact-preview",
    title: "Standalone anonymous inquiry",
    description:
      "The earlier standalone inquiry form with an email field, rich text and compressed photos.",
    group: "contact",
    access: "No sign-in required",
    href: "/contact-preview",
    notice: "Send saves a new test inquiry. It does not send a reply email.",
    keywords: ["匿名", "留言", "表单", "咨询", "早期"],
  },
  {
    route: "/contact-submissions-preview",
    title: "All Contact us submissions",
    description:
      "Browse email addresses and submission times. Open a page or modal preview, or download JSON and text with image links.",
    group: "contact",
    access: "No sign-in required",
    href: "/contact-submissions-preview",
    notice:
      "Private local tool: may include real customer messages. Never expose this list or its exports publicly.",
    keywords: [
      "所有提交",
      "留言列表",
      "下载",
      "弹窗",
      "分页",
      "排序",
      "json",
      "txt",
    ],
  },
  {
    route: "/image-upload-preview",
    title: "Image compression & upload lab",
    description:
      "Compare original images with multiple compression levels, then test uploading and previewing the results.",
    group: "media",
    access: "No sign-in required",
    href: "/image-upload-preview",
    notice: "Compression is local; using an upload button stores files.",
    keywords: ["图片", "压缩", "上传", "bucket", "webp", "原图"],
  },
  {
    route: "/rich-text-preview",
    title: "Single-form rich-text editor",
    description:
      "Edit a test form, compress its images and save the rich-text document for the paired preview page.",
    group: "media",
    access: "No sign-in required",
    href: "/rich-text-preview",
    notice: "Saving replaces the previous shared test form.",
    keywords: ["富文本", "编辑器", "tiptap", "覆盖", "保存"],
  },
  {
    route: "/rich-text-preview/view",
    title: "Saved single-form preview",
    description:
      "Read back the latest shared test form, including formatting, photos and the stored JSON.",
    group: "media",
    access: "No sign-in required",
    href: "/rich-text-preview/view",
    notice:
      "Shows the single-form experiment, not the full Contact us submission list.",
    keywords: ["富文本", "预览", "只读", "单份", "读取"],
  },
  {
    route: "/contact-submissions-preview/[id]",
    title: "Individual Contact us preview",
    description:
      "A saved message in its own read-only page. Choose a row in All Contact us submissions, then click Preview or Quick preview.",
    group: "records",
    access: "Submission ID required",
    href: "/contact-submissions-preview",
    action: "Choose a message",
    keywords: ["单条", "详情", "预览", "留言"],
  },
];

export function filterTestPages(
  query: string,
  group: TestGroup | "all" = "all",
) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return TEST_PAGES.filter((page) => {
    if (group !== "all" && page.group !== group) return false;
    const text = [
      page.title,
      page.description,
      page.route,
      page.access,
      page.notice,
      ...page.keywords,
      ...(page.shortcuts?.map((shortcut) => shortcut.title) ?? []),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return words.every((word) => text.includes(word));
  });
}
