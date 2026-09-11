import { ANTIGUA_CONFIG } from "../antigua-calculator/config";

export const FAQ_CATEGORIES = [
  { id: "getting-started", title: "Getting started" },
  { id: "savings", title: "Savings & sizing" },
  { id: "support", title: "Equipment & support" },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]["id"];
export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  keywords: string[];
  link?: { href: string; label: string };
};

/** Editorial copy, kept separate from layout. Confirm product-specific terms in the quotation. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "start-assessment",
    category: "getting-started",
    question: "How do I get a solar and battery assessment?",
    answer:
      "Start with our free assessment form. Share your property location, electricity needs and backup priorities so our team can discuss a suitable system with you.",
    keywords: ["quote", "quotation", "consultation", "报价", "咨询"],
    link: { href: "/consultation", label: "Get your free assessment" },
  },
  {
    id: "prepare-information",
    category: "getting-started",
    question: "What information should I have ready?",
    answer:
      "Your property location, a recent electricity bill and the appliances you want to keep running during an outage are a useful starting point. If available, photos of your roof and installation space can help explain your needs. Leave out account numbers and other sensitive details that are not needed for your inquiry.",
    keywords: ["documents", "roof", "photos", "bill", "资料", "屋顶", "账单"],
  },
  {
    id: "account-required",
    category: "getting-started",
    question: "Do I need an account to get started?",
    answer:
      "No. You can use the homepage calculator and start a consultation without signing in. For an inquiry, provide an email address where our team can reach you.",
    keywords: ["login", "sign in", "register", "email", "登录", "账户"],
  },
  {
    id: "share-photos",
    category: "getting-started",
    question: "Can I include photos with my question?",
    answer:
      "When the Contact us message form is available, choose Add photos to open the photo editor. It accepts JPG, PNG and WebP images and compresses them before sending. If you use the consultation form instead, tell us that you have photos to share with the team.",
    keywords: ["pictures", "images", "attachments", "upload", "图片", "上传"],
    link: { href: "/#contact-us", label: "Go to Contact us" },
  },
  {
    id: "calculator-location",
    category: "savings",
    question: "Which location is the savings calculator for?",
    answer:
      "The calculator is for homes in Antigua using the APUA electricity tariff. It is not a region-wide calculator: other islands can have different electricity prices. For a property elsewhere, share your location through our consultation form.",
    keywords: ["Antigua", "island", "coverage", "country", "安提瓜", "地区"],
    link: { href: "/#calculator", label: "Explore the calculator" },
  },
  {
    id: "calculator-bill",
    category: "savings",
    question: "Which amount from my electricity bill should I use?",
    answer:
      "Use your monthly electricity charges only. Do not include overdue balances, water charges or other services. Move the bill slider on the homepage to the closest amount; there is no need to enter your monthly kWh.",
    keywords: ["input", "amount", "slider", "monthly", "电费", "账单", "滑块"],
  },
  {
    id: "calculator-tariff",
    category: "savings",
    question: "Which APUA tariff does the calculator use?",
    answer: `It uses the ${ANTIGUA_CONFIG.tariff.sourceDate} preset, including an EC$${ANTIGUA_CONFIG.tariff.fuelAdjustment.toFixed(2)}/kWh fuel surcharge. This is a fixed reference, not a live electricity rate. You can also find this note under the question mark beside the bill slider.`,
    keywords: ["fuel", "rate", "June", "0.80", "燃油", "附加费", "电价"],
  },
  {
    id: "savings-assumption",
    category: "savings",
    question: "Are the savings shown guaranteed?",
    answer: `No. The calculator uses an ${Math.round(ANTIGUA_CONFIG.savingsFraction * 100)}% bill-saving assumption to provide a starting point. Your actual savings depend on the final system, electricity usage, site conditions and applicable tariff. Discuss your property with our team before making a purchase decision.`,
    keywords: ["monthly", "annual", "estimate", "guarantee", "节省", "收益"],
  },
  {
    id: "investment-quote",
    category: "savings",
    question: "Is the suggested investment a final quote?",
    answer:
      "No. Suggested investment and simple payback are planning figures, not a supplier quotation or a verified return. Request an assessment to discuss a proposed configuration, its scope and the applicable price.",
    keywords: [
      "price",
      "cost",
      "payback",
      "budget",
      "investment",
      "价格",
      "投资",
      "回本",
    ],
    link: { href: "/consultation", label: "Discuss your project" },
  },
  {
    id: "backup-duration",
    category: "savings",
    question: "How should I read the backup time?",
    answer: `The displayed backup time assumes a full battery and a constant ${ANTIGUA_CONFIG.backup.loadKw} kW average load, with no solar contribution during the outage. Actual runtime changes with the appliances in use. The preview is not a guarantee that every appliance in your home can run together.`,
    keywords: ["battery", "outage", "hours", "load", "停电", "备用", "电池"],
  },
  {
    id: "warranty-terms",
    category: "support",
    question: "What warranty comes with the system?",
    answer:
      "Our inverters and batteries come with a 10-year warranty, and our solar panels come with a 25-year warranty. Contact our team for the written warranty terms for your proposed equipment.",
    keywords: [
      "warranty",
      "guarantee",
      "10 year",
      "25 year",
      "repair",
      "保修",
      "十年",
      "二十五年",
    ],
    link: { href: "/#contact-us", label: "Ask about warranty coverage" },
  },
  {
    id: "cleaning-reinforcement",
    category: "support",
    question: "Do you offer cleaning and reinforcement services?",
    answer:
      "Yes. We also provide solar panel cleaning and reinforcement services. Contact our team to discuss the support your system needs.",
    keywords: [
      "cleaning",
      "reinforcement",
      "maintenance",
      "service",
      "清洗",
      "加固",
      "维护",
    ],
    link: { href: "/#contact-us", label: "Ask about system services" },
  },
  {
    id: "wind-rating",
    category: "support",
    question: "Where can I find details about the 150+ MPH rating?",
    answer:
      "Ask our team for the product-specific rating documents and installation requirements for your proposed system. The homepage rating should not be read as a promise that every installation will be damage-free in every storm.",
    keywords: ["hurricane", "wind", "storm", "150 mph", "飓风", "抗风"],
  },
  {
    id: "local-parts",
    category: "support",
    question: "Are replacement parts available locally?",
    answer:
      "Local Parts Stock is part of our service offering. Availability depends on the specific part and system model. Contact our team to check the part you need, current stock and the next steps before arranging a replacement.",
    keywords: [
      "spares",
      "stock",
      "replacement",
      "local",
      "配件",
      "库存",
      "本地",
    ],
  },
  {
    id: "installation-timing",
    category: "support",
    question: "How long will it take to arrange my installation?",
    answer:
      "There is no single timeline for every property. Ask for a schedule with your proposal so equipment availability, site preparation and any required approvals can be considered for your project.",
    keywords: [
      "delivery",
      "schedule",
      "installation",
      "lead time",
      "安装",
      "交期",
    ],
  },
];

function normalize(text: string) {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function searchFaq(
  query: string,
  category: FaqCategory | "all" = "all",
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return FAQ_ITEMS.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    const categoryTitle =
      FAQ_CATEGORIES.find((group) => group.id === item.category)?.title ?? "";
    const haystack = normalize(
      [item.question, item.answer, categoryTitle, ...item.keywords].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
