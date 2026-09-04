import { z } from "zod";

/** ISO-8601 日历日期，例如 2015-01-01 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "必须是 YYYY-MM-DD 格式的日期");

/** ISO 4217 货币代码，例如 USD、EUR */
const currencyCode = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "必须是三位大写货币代码");

/** 百分比：0–100 */
const percent = z.number().min(0).max(100);

/** URL 或站点内相对路径（Logo 可用 CDN / 本地 /public） */
const assetUrl = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    "Logo 必须是 http(s) URL 或以 / 开头的相对路径",
  );

const kebabSlug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "必须是 kebab-case，例如 ftmo-payout-cycle");

export const logoSchema = z.object({
  src: assetUrl,
  alt: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const fundingScaleSchema = z
  .object({
    currency: currencyCode,
    /** 最低初始账户资金（Challenge 最小档） */
    minAccountSize: z.number().positive(),
    /** 最高初始账户资金（Challenge 最大档） */
    maxAccountSize: z.number().positive(),
    /** 通过 Scaling Plan 可达的上限；没有则省略 */
    maxScaledSize: z.number().positive().optional(),
  })
  .refine((value) => value.minAccountSize <= value.maxAccountSize, {
    message: "最低资金规模不能大于最高资金规模",
    path: ["minAccountSize"],
  });

export const basicInfoSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().min(1).optional(),
  logo: logoSchema,
  foundedAt: isoDate,
  headquarters: z.object({
    city: z.string().min(1),
    country: z.string().min(1),
    countryCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  }),
  website: z.url(),
  funding: fundingScaleSchema,
});

export const payoutCycleSchema = z.object({
  type: z.enum(["on_demand", "fixed_interval", "hybrid"]),
  /** 首次出金需等待的最少日历天数 */
  firstPayoutMinDays: z.number().int().nonnegative(),
  /** 之后的固定间隔（天）；纯按需出金则为 null */
  subsequentIntervalDays: z.number().int().positive().nullable(),
  description: z.string().min(1),
});

export const withdrawalFeeSchema = z
  .object({
    type: z.enum(["none", "flat", "percent", "mixed"]),
    flatAmount: z.number().nonnegative().optional(),
    percent: percent.optional(),
    currency: currencyCode.optional(),
  })
  .superRefine((fee, ctx) => {
    if ((fee.type === "flat" || fee.type === "mixed") && fee.flatAmount == null) {
      ctx.addIssue({
        code: "custom",
        message: "flat / mixed 手续费必须提供 flatAmount",
        path: ["flatAmount"],
      });
    }
    if ((fee.type === "percent" || fee.type === "mixed") && fee.percent == null) {
      ctx.addIssue({
        code: "custom",
        message: "percent / mixed 手续费必须提供 percent",
        path: ["percent"],
      });
    }
  });

export const withdrawalChannelSchema = z.object({
  id: kebabSlug,
  name: z.string().min(1),
  method: z.enum(["bank_wire", "card", "ewallet", "crypto", "other"]),
  minAmount: z.number().nonnegative(),
  maxAmount: z.number().positive().nullable(),
  processingBusinessDays: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  }),
  fee: withdrawalFeeSchema,
  currencies: z.array(currencyCode).min(1),
  notes: z.string().optional(),
});

export const withdrawalRulesSchema = z.object({
  /** 默认交易员分成比例（未走 Scaling 时） */
  defaultTraderSharePercent: percent,
  /** 平台/公司保留比例，应与分成互补 */
  defaultFirmSharePercent: percent,
  payoutCycle: payoutCycleSchema,
  /** 全局手续费说明（各渠道可再覆盖） */
  platformFee: withdrawalFeeSchema,
  channels: z.array(withdrawalChannelSchema).min(1),
  minPayoutAmount: z.number().nonnegative(),
  minPayoutCurrency: currencyCode,
  challengeFeeRefundedOnFirstPayout: z.boolean(),
  /** 出金/规则相关的禁忌与风险提醒，用于详情页 Warning Box */
  warnings: z.array(z.string().min(1)).min(1).optional(),
});

/** 计算器：按利润区间或产品线切换的阶梯分成 */
export const profitSplitTierSchema = z.object({
  id: kebabSlug,
  label: z.string().min(1),
  /** 适用的评估/账户产品，例如 2-step、1-step */
  program: z.string().min(1),
  /** 该阶梯生效的最低利润（含），币种见 calculator.currency */
  minProfit: z.number().nonnegative(),
  /** 上限（不含）；null 表示无上限 */
  maxProfit: z.number().positive().nullable(),
  traderSharePercent: percent,
});

export const scalingPlanSchema = z.object({
  enabled: z.boolean(),
  intervalMonths: z.number().int().positive().optional(),
  balanceIncreasePercent: percent.optional(),
  maxCapital: z.number().positive().optional(),
  traderShareAfterScalePercent: percent.optional(),
  requirements: z.array(z.string().min(1)).optional(),
});

export const calculatorParamsSchema = z
  .object({
    currency: currencyCode,
    profitSplitTiers: z.array(profitSplitTierSchema).min(1),
    /**
     * 平台在发放前预扣的税率（模拟税 / 平台扣税）。
     * FTMO 通常不代扣个人所得税，样例中为 0。
     */
    platformWithholdingTaxPercent: percent,
    /**
     * 其他平台固定扣减（如数据费、非分成性质的账户费），按利润百分比计。
     */
    platformDeductionPercent: percent,
    /** 支付通道成本，计算器可叠加在出金金额上 */
    paymentProcessorFeePercent: percent,
    minPayoutAmount: z.number().nonnegative(),
    scaling: scalingPlanSchema,
  })
  .refine(
    (value) => {
      const ids = value.profitSplitTiers.map((tier) => tier.id);
      return new Set(ids).size === ids.length;
    },
    { message: "profitSplitTiers.id 必须唯一", path: ["profitSplitTiers"] },
  );

/**
 * FAQ：同时服务页面展示与 pSEO（独立 slug 页 + FAQPage JSON-LD）。
 * 渲染结构化数据时用 toFaqJsonLd()。
 */
export const faqSeoSchema = z.object({
  title: z.string().min(1),
  metaDescription: z.string().min(1).max(320),
  datePublished: isoDate,
  dateModified: isoDate.optional(),
  /** schema.org 页面类型，pSEO FAQ 页固定为 FAQPage */
  schemaType: z.literal("FAQPage"),
  canonicalPath: z
    .string()
    .regex(/^\/[a-z0-9\-/?#]*$/i, "canonicalPath 必须是以 / 开头的站内路径"),
});

export const faqItemSchema = z.object({
  id: kebabSlug,
  question: z.string().min(1),
  answer: z.string().min(1),
  /** 程序化 SEO 落地页路径片段，例如 /firms/ftmo/faq/payout-cycle */
  slug: kebabSlug,
  locale: z.string().min(2).default("en"),
  keywords: z.array(z.string().min(1)).default([]),
  seo: faqSeoSchema,
});

/** 优缺点对比框：详情页 Pros & Cons 区块 */
export const prosAndConsSchema = z.object({
  pros: z.array(z.string().min(1)).min(1),
  cons: z.array(z.string().min(1)).min(1),
});

/** 平台安全状态：用于首页卡片角标，与详情页的详细规则解耦 */
export const platformStatusSchema = z
  .enum(["active", "warning", "suspended"])
  .default("active");

export const propFirmSchema = z
  .object({
    slug: kebabSlug,
    /** 安全状态：active 正常运营 / warning 延迟预警 / suspended 暂停出金 */
    status: platformStatusSchema,
    /** 卡片展示用的出金速度短文案，例如 "Instant"、"Within 24 Hours" */
    payoutSpeed: z.string().min(1),
    basic: basicInfoSchema,
    withdrawal: withdrawalRulesSchema,
    calculator: calculatorParamsSchema,
    faqs: z.array(faqItemSchema).min(1),
    /** 优缺点对比框内容；缺省时页面不渲染该区块 */
    prosAndCons: prosAndConsSchema.optional(),
  })
  .superRefine((firm, ctx) => {
    const splitSum =
      firm.withdrawal.defaultTraderSharePercent +
      firm.withdrawal.defaultFirmSharePercent;
    if (Math.abs(splitSum - 100) > 0.01) {
      ctx.addIssue({
        code: "custom",
        message: "默认交易员分成 + 公司分成必须等于 100",
        path: ["withdrawal", "defaultFirmSharePercent"],
      });
    }

    const faqSlugs = firm.faqs.map((item) => item.slug);
    if (new Set(faqSlugs).size !== faqSlugs.length) {
      ctx.addIssue({
        code: "custom",
        message: "faqs.slug 必须唯一（pSEO 路由不能冲突）",
        path: ["faqs"],
      });
    }
  });

export type PlatformStatus = z.infer<typeof platformStatusSchema>;
export type Logo = z.infer<typeof logoSchema>;
export type BasicInfo = z.infer<typeof basicInfoSchema>;
export type WithdrawalFee = z.infer<typeof withdrawalFeeSchema>;
export type WithdrawalChannel = z.infer<typeof withdrawalChannelSchema>;
export type WithdrawalRules = z.infer<typeof withdrawalRulesSchema>;
export type ProfitSplitTier = z.infer<typeof profitSplitTierSchema>;
export type CalculatorParams = z.infer<typeof calculatorParamsSchema>;
export type FaqItem = z.infer<typeof faqItemSchema>;
export type ProsAndCons = z.infer<typeof prosAndConsSchema>;
export type PropFirm = z.infer<typeof propFirmSchema>;

export function parsePropFirm(data: unknown): PropFirm {
  return propFirmSchema.parse(data);
}

const isoDateTime = z
  .string()
  .min(20)
  .refine((value) => !Number.isNaN(Date.parse(value)), "必须是可解析的 ISO-8601 时间");

export const newsArticleSchema = z.object({
  slug: kebabSlug,
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  sourceName: z.string().min(1),
  sourceUrl: z.url(),
  publishedAt: isoDateTime,
  scrapedAt: isoDateTime,
  tags: z.array(z.string().min(1)).default([]),
  relatedFirmSlugs: z.array(kebabSlug).default([]),
  relevance: z.enum(["high", "medium"]).default("medium"),
});

export type NewsArticle = z.infer<typeof newsArticleSchema>;

export function parseNewsArticle(data: unknown): NewsArticle {
  return newsArticleSchema.parse(data);
}

/** 生成 schema.org FAQPage，可直接放入 <script type="application/ld+json"> */
export function toFaqJsonLd(firm: PropFirm) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: firm.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      url: item.seo.canonicalPath,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
