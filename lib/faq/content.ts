import { ANTIGUA_CONFIG, DOMINICA_CONFIG } from "../antigua-calculator/config";
import type { ServiceCountry } from "../consultation-intake";
import { regionPath } from "../site-region-routing";
import { HYBRID_FAQS } from "./hybrid";

export const FAQ_CATEGORIES = [
  { id: "getting-started", title: "Getting started" },
  { id: "savings", title: "Savings & sizing" },
  { id: "support", title: "Equipment & support" },
  { id: "hybrid", title: "How the system works" },
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
  ...HYBRID_FAQS,
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
      "No. The illustrative budget is calculated as assumed annual bill savings multiplied by an assumed payback period. The payback period is a planning assumption, not a return calculated from independently priced equipment and installation. This is a budget scenario, not a supplier quotation or a verified return. Request an assessment to confirm the proposed configuration, included work and applicable price.",
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
      "Our systems combine dependable equipment with ongoing support. Warranty duration, coverage and applicable operating conditions are set out in the written terms for your selected inverter, solar panels and battery. Equipment warranty coverage addresses faults in the equipment itself that arise during normal use, subject to the written terms for your equipment. If you notice an issue with your solar panels, our team will help investigate and guide you through the appropriate next steps. Contact us for your equipment's written warranty terms and support with a claim.",
    keywords: [
      "warranty",
      "guarantee",
      "equipment support",
      "written terms",
      "repair",
      "panel issue",
      "fault",
      "troubleshooting",
      "面板异常",
      "保修",
      "质保",
      "循环",
    ],
    link: { href: "/#contact-us", label: "Ask about warranty coverage" },
  },
  {
    id: "antigua-equipment-certifications",
    category: "support",
    question: "Which equipment certifications and standards apply to Antigua products?",
    answer: "The following standards and certifications are listed for our Antigua product range. Applicability depends on the selected model and its supporting documents.\n\nInverter — Grid connection: IEEE 1547-2018, IEEE 1547.1-2020, SRD2.0.\nSafety / EMC: UL 1741, CSA C22.2 No.107.1, UL 1741 CRD, UL 1741 SB, FCC Part 15 Class B.\nAFCI: UL 1699B.\nSoftware approval: UL 1998.\n\nBattery — UN 38.3, CEC, UL 1973, UL 9540A, UL 9540.\n\nAsk our team for the certificates, listings and test reports applicable to your proposed equipment. These references do not replace project-specific utility connection approval.",
    keywords: ["Antigua", "inverter", "battery", "certification", "standards", "UL", "IEEE", "AFCI", "安提瓜", "认证", "逆变器", "电池"],
    link: { href: "/#contact-us", label: "Request equipment certification documents" },
  },
  {
    id: "dominica-equipment-certifications",
    category: "support",
    question: "Which equipment certifications and standards apply to Dominica products?",
    answer: "The following standards and certifications are listed for our Dominica product range. Applicability depends on the selected model and its supporting documents.\n\nInverter — Grid connection: EN 50549, NRS 097-2-1.\nSafety / EMC: IEC 62109-1/-2, IEC/EN 61000-6-1/-2/-3/-4.\n\nBattery — IEC 62619, UN 38.3, CE-EMC.\n\nAsk our team for the certificates, declarations and test reports applicable to your proposed equipment. These references do not replace project-specific utility connection approval.",
    keywords: ["Dominica", "inverter", "battery", "certification", "standards", "CE", "IEC", "多米尼克", "认证", "逆变器", "电池"],
    link: { href: "/#contact-us", label: "Request equipment certification documents" },
  },
  {
    id: "household-appliances",
    category: "support",
    question: "What household appliances can the system power?",
    answer:
      "A suitably sized solar and battery system can support everyday household appliances, including a refrigerator with round-the-clock power needs, air conditioning, a washing machine, lights throughout the house, TVs, WiFi and other electronics. Water heating can also be planned for daytime use to make the most of solar generation. Our engineers tailor the inverter and battery capacity to the appliances you use together and what you would like to keep running during an outage, so the system fits your daily routine.",
    keywords: [
      "appliances",
      "loads",
      "refrigerator",
      "fridge",
      "24/7",
      "air conditioning",
      "washing machine",
      "lights",
      "TV",
      "WiFi",
      "water heater",
      "家电",
      "负载",
      "空调",
      "冰箱",
      "热水器",
    ],
  },
  {
    id: "lifepo4-battery-chemistry",
    category: "support",
    question: "What is a LiFePO4 (LFP) battery, and why do we use it?",
    answer: "Our home storage batteries use Lithium Iron Phosphate (LiFePO4, also called LFP), a lithium-ion battery chemistry known for thermal stability and long cycle life. It is suited to repeated charging and discharging for solar storage and home backup.\n\nCycle life describes repeated charge–discharge use, not a guaranteed number of years. Our batteries are designed for reliable everyday energy storage; actual performance depends on operating temperature, depth of discharge (DoD) and the conditions in the selected model’s documentation. Correct installation and operation remain essential.",
    keywords: ["LiFePO4", "LiFePO₄", "LFP", "lithium iron phosphate", "lithium-ion", "battery chemistry", "thermal stability", "cycle life", "depth of discharge", "DoD", "reliability", "磷酸铁锂", "电池", "循环寿命", "放电深度"],
    link: { href: "/#contact-us", label: "Ask about battery specifications" },
  },
  {
    id: "software-monitoring",
    category: "support",
    question: "Is there a fee for the software and monitoring platform?",
    answer:
      "No. Our software services and monitoring platform are included at no additional charge with our equipment. Simply provide a working WiFi network with internet access and keep the equipment connected to enjoy the software services and view your system's status remotely.",
    keywords: [
      "software",
      "monitoring",
      "platform",
      "app",
      "subscription",
      "free",
      "fee",
      "WiFi",
      "internet",
      "软件",
      "监控",
      "收费",
      "免费",
    ],
  },
  {
    id: "existing-generator",
    category: "support",
    question: "Can you integrate my existing generator?",
    answer:
      "In many cases, yes. If your home already uses a generator and grid electricity, our engineers can assess whether your existing equipment can be integrated into a proposed solar and battery system. The final design depends on your generator model, electrical setup, property needs and site assessment.",
    keywords: [
      "generator",
      "integration",
      "compatibility",
      "grid",
      "发电机",
      "整合",
    ],
  },
  {
    id: "future-expansion",
    category: "support",
    question: "Can I expand my system in the future?",
    answer:
      "In many cases, a solar and battery system can be expanded as your energy needs change. Contact our engineers to discuss your future plans and receive a tailored expansion proposal. Available options depend on your existing system design, roof space, equipment compatibility and electrical capacity.",
    keywords: ["expand", "expansion", "upgrade", "future", "扩容", "升级"],
  },
  {
    id: "cleaning-reinforcement",
    category: "support",
    question: "Do you offer cleaning and reinforcement services?",
    answer:
      "Yes. We provide solar panel cleaning and reinforcement services to help care for your installation. These are maintenance and site-support services arranged separately from equipment warranty coverage. Our team can assess your needs and agree the service scope with you before arranging the work.",
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
    question: "How is the system designed for local wind and weather conditions?",
    answer:
      "Our systems are designed for dependable use in island conditions, with mounting and installation tailored to your roof and site assessment. Ask our team for the selected equipment’s wind-resistance documentation and installation requirements. Performance in a storm depends on the equipment, installation and site conditions.",
    keywords: ["hurricane", "wind", "storm", "wind resistance", "weather", "飓风", "抗风"],
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

/** Build the country-specific content on the server, before rendering or search. */
export function getFaqItems(country: ServiceCountry): FaqItem[] {
  const config = country === "AG" ? ANTIGUA_CONFIG : DOMINICA_CONFIG;
  return FAQ_ITEMS.map((item) => {
    let localized = { ...item };
    if (item.id === "calculator-location") {
      localized = {
        ...localized,
        answer: country === "AG"
          ? "This calculator provides a planning scenario for homes in Antigua using an APUA reference tariff. It is not a live tariff or a quotation. For a property in Dominica, use the Dominica calculator and its separate reference assumptions."
          : "This calculator provides a planning scenario for homes in Dominica using a historical DOMLEC tariff reference. It is not a verified current tariff or a quotation. For a property in Antigua, use the Antigua calculator and its separate reference assumptions.",
        keywords: [country === "AG" ? "Antigua APUA 安提瓜" : "Dominica DOMLEC 多米尼克", "island", "coverage", "country", "地区"],
      };
    }
    if (item.id === "calculator-tariff") {
      localized = {
        ...localized,
        question: `Which ${country === "AG" ? "APUA" : "DOMLEC"} tariff does the calculator use?`,
        answer: country === "AG"
          ? `It uses the ${config.tariff.sourceDate} preset, including an EC$${config.tariff.fuelAdjustment.toFixed(2)}/kWh fuel surcharge. This is a fixed reference, not a live electricity rate. The question mark beside the bill slider provides the sources and assumptions.`
          : `It uses a historical reference: ${config.tariff.sourceDate}. Base rates are EC$${config.tariff.firstTierRate.toFixed(2)}/kWh for the first ${config.tariff.firstTierLimit} kWh and EC$${config.tariff.additionalRate.toFixed(2)}/kWh thereafter, with an EC$${config.tariff.fuelAdjustment.toFixed(2)}/kWh fuel surcharge. VAT is ${config.tariff.vatRate * 100}% on electricity and fuel charges above the first ${config.tariff.vatFreeKwh} kWh. This combines historical sources and is not a verified current tariff. The new structure announced for October 1, 2026 is not included. The question mark beside the bill slider provides the sources and assumptions.`,
        keywords: ["fuel", "rate", "tariff", "historical", config.tariff.sourceDate, config.tariff.fuelAdjustment.toFixed(2), country === "AG" ? "APUA" : "DOMLEC VAT", "燃油", "附加费", "电价"],
      };
    }
    if (item.id === "savings-assumption") {
      localized.answer = `No. The calculator assumes an ${Math.round(config.savingsFraction * 100)}% bill reduction to provide a planning scenario, not a quotation. Actual savings depend on the final system, electricity usage, site conditions and applicable tariff. Discuss your property with our team before making a purchase decision.`;
    }
    if (item.link) {
      localized.link = {
        ...item.link,
        href: item.link.href === "/#calculator"
          ? `${regionPath(country)}#calculator`
          : item.link.href === "/consultation"
            ? regionPath(country, "/consultation")
            : item.link.href === "/#contact-us"
              ? "#ask-question"
              : item.link.href.startsWith("/how-it-works")
                ? regionPath(country, item.link.href)
                : item.link.href,
      };
    }
    return localized;
  });
}

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
  items: readonly FaqItem[] = FAQ_ITEMS,
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    const categoryTitle =
      FAQ_CATEGORIES.find((group) => group.id === item.category)?.title ?? "";
    const haystack = normalize(
      [item.question, item.answer, categoryTitle, ...item.keywords].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
