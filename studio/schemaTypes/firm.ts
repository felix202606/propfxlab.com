import {defineArrayMember, defineField, defineType} from 'sanity'
import {studioText} from '../i18n/bundles'

const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const currency = /^[A-Z]{3}$/

const percentField = (name: string, title?: string) =>
  defineField({name, title, type: 'number', validation: (rule) => rule.required().min(0).max(100)})

const feeFields = [
  defineField({
    name: 'type',
    type: 'string',
    options: {list: ['none', 'flat', 'percent', 'mixed']},
    validation: (rule) => rule.required(),
  }),
  defineField({name: 'flatAmount', type: 'number', validation: (rule) => rule.min(0)}),
  defineField({name: 'percent', type: 'number', validation: (rule) => rule.min(0).max(100)}),
  defineField({name: 'currency', type: 'string', validation: (rule) => rule.regex(currency)}),
]

export const firm = defineType({
  name: 'firm',
  title: 'Prop firm',
  type: 'document',
  groups: [
    {name: 'listing', title: 'Listing & partner', i18n: {title: studioText('group.listing')}, default: true},
    {name: 'rules', title: 'Rules & payouts', i18n: {title: studioText('group.rules')}},
    {name: 'profile', title: 'Profile', i18n: {title: studioText('group.profile')}},
    {name: 'content', title: 'FAQ & pros/cons', i18n: {title: studioText('group.content')}},
  ],
  fields: [
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'string',
      group: 'listing',
      description: 'Used in /firm/{slug}, /out/{slug} and every compare URL. Do not change.',
      readOnly: ({document}) => Boolean(document?._createdAt && document?.slug),
      validation: (rule) => rule.required().regex(kebab, {name: 'kebab-case'}),
    }),
    defineField({
      name: 'status',
      group: 'listing',
      type: 'string',
      options: {list: ['active', 'warning', 'suspended'], layout: 'radio'},
      initialValue: 'active',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Directory order',
      group: 'listing',
      type: 'number',
      description: 'Lower shows earlier in the homepage directory. Leave empty to use the calculated ranking.',
    }),
    defineField({
      name: 'offer',
      title: 'Partner deal',
      group: 'listing',
      type: 'object',
      options: {collapsible: true, collapsed: false},
      fields: [
        defineField({
          name: 'partner',
          title: 'Approved partner',
          type: 'boolean',
          initialValue: false,
          description: 'Off = editorial only: official site link, no promo tile.',
        }),
        defineField({
          name: 'href',
          title: 'Tracking URL',
          type: 'url',
          description: 'Only used by the /out/{slug} redirect. Never shown in page HTML.',
          hidden: ({parent}) => !parent?.partner,
          validation: (rule) =>
            rule.custom((value, context) => {
              const parent = context.parent as {partner?: boolean} | undefined
              return parent?.partner && !value ? 'Partner needs a tracking URL' : true
            }),
        }),
        defineField({
          name: 'code',
          title: 'Promo code',
          type: 'string',
          hidden: ({parent}) => !parent?.partner,
        }),
        defineField({
          name: 'discountLabel',
          title: 'Badge',
          type: 'string',
          description: 'Only the real deal, e.g. "15% OFF".',
          hidden: ({parent}) => !parent?.partner,
        }),
        defineField({
          name: 'promotion',
          title: 'Limited-time promotion',
          type: 'object',
          hidden: ({parent}) => !parent?.partner,
          fields: [
            defineField({name: 'label', type: 'string'}),
            defineField({name: 'code', title: 'Promo code during the window', type: 'string'}),
            defineField({name: 'startsAt', type: 'datetime'}),
            defineField({name: 'endsAt', type: 'datetime'}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'tier',
      group: 'listing',
      type: 'number',
      options: {list: [1, 2], layout: 'radio'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      group: 'listing',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: ['forex', 'futures', 'crypto']},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'platforms',
      group: 'listing',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: [
          'mt4', 'mt5', 'ctrader', 'tradovate', 'ninjatrader', 'thinktrader', 'matchtrader',
          'tradelocker', 'tradingview', 'dxtrade', 'bybit', 'kraken', 'cleo',
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'assets',
      group: 'listing',
      type: 'array',
      of: [{type: 'string'}],
      options: {list: ['fx', 'futures', 'crypto', 'indices', 'metals', 'energy']},
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'highlights',
      group: 'listing',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        list: ['licensed_broker', 'instant_payout', 'low_entry', 'exchange_depth', 'always_on'],
      },
    }),
    defineField({name: 'payoutSpeed', group: 'listing', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'rating', group: 'listing', type: 'number', validation: (rule) => rule.min(0).max(5)}),
    defineField({name: 'reviewCount', group: 'listing', type: 'number', validation: (rule) => rule.required().min(0).integer()}),

    defineField({
      name: 'basic',
      group: 'profile',
      type: 'object',
      fields: [
        defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
        defineField({name: 'legalName', type: 'string'}),
        defineField({
          name: 'logo',
          type: 'object',
          fields: [
            defineField({name: 'src', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'alt', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'width', type: 'number'}),
            defineField({name: 'height', type: 'number'}),
          ],
        }),
        defineField({name: 'foundedAt', type: 'date', validation: (rule) => rule.required()}),
        defineField({
          name: 'headquarters',
          type: 'object',
          fields: [
            defineField({name: 'city', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'country', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'countryCode', type: 'string', validation: (rule) => rule.required().regex(/^[A-Z]{2}$/)}),
          ],
        }),
        defineField({
          name: 'website',
          title: 'Official website',
          type: 'url',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'funding',
          type: 'object',
          fields: [
            defineField({name: 'currency', type: 'string', validation: (rule) => rule.required().regex(currency)}),
            defineField({name: 'minAccountSize', type: 'number', validation: (rule) => rule.required().positive()}),
            defineField({name: 'maxAccountSize', type: 'number', validation: (rule) => rule.required().positive()}),
            defineField({name: 'maxScaledSize', type: 'number', validation: (rule) => rule.positive()}),
          ],
        }),
      ],
    }),

    defineField({
      name: 'withdrawal',
      group: 'rules',
      type: 'object',
      fields: [
        percentField('defaultTraderSharePercent', 'Trader split %'),
        percentField('defaultFirmSharePercent', 'Firm split %'),
        defineField({
          name: 'payoutCycle',
          type: 'object',
          fields: [
            defineField({
              name: 'type',
              type: 'string',
              options: {list: ['on_demand', 'fixed_interval', 'hybrid']},
              validation: (rule) => rule.required(),
            }),
            defineField({name: 'firstPayoutMinDays', type: 'number', validation: (rule) => rule.required().min(0).integer()}),
            defineField({name: 'subsequentIntervalDays', type: 'number', validation: (rule) => rule.positive().integer()}),
            defineField({name: 'description', type: 'text', rows: 3, validation: (rule) => rule.required()}),
          ],
        }),
        defineField({name: 'platformFee', type: 'object', fields: feeFields}),
        defineField({
          name: 'channels',
          type: 'array',
          validation: (rule) => rule.required().min(1),
          of: [
            defineArrayMember({
              type: 'object',
              name: 'withdrawalChannel',
              fields: [
                defineField({name: 'id', type: 'string', validation: (rule) => rule.required().regex(kebab)}),
                defineField({name: 'name', type: 'string', validation: (rule) => rule.required()}),
                defineField({
                  name: 'method',
                  type: 'string',
                  options: {list: ['bank_wire', 'card', 'ewallet', 'crypto', 'other']},
                  validation: (rule) => rule.required(),
                }),
                defineField({name: 'minAmount', type: 'number', validation: (rule) => rule.required().min(0)}),
                defineField({name: 'maxAmount', type: 'number', validation: (rule) => rule.positive()}),
                defineField({
                  name: 'processingBusinessDays',
                  type: 'object',
                  fields: [
                    defineField({name: 'min', type: 'number', validation: (rule) => rule.required().min(0)}),
                    defineField({name: 'max', type: 'number', validation: (rule) => rule.required().min(0)}),
                  ],
                }),
                defineField({name: 'fee', type: 'object', fields: feeFields}),
                defineField({name: 'currencies', type: 'array', of: [{type: 'string'}], validation: (rule) => rule.required().min(1)}),
                defineField({name: 'notes', type: 'text', rows: 2}),
              ],
              preview: {select: {title: 'name', subtitle: 'method'}},
            }),
          ],
        }),
        defineField({name: 'minPayoutAmount', type: 'number', validation: (rule) => rule.required().min(0)}),
        defineField({name: 'minPayoutCurrency', type: 'string', validation: (rule) => rule.required().regex(currency)}),
        defineField({name: 'challengeFeeRefundedOnFirstPayout', type: 'boolean', initialValue: false}),
        defineField({
          name: 'warnings',
          title: 'Rule warnings (drawdown, bans…)',
          type: 'array',
          of: [{type: 'string'}],
        }),
      ],
    }),

    defineField({
      name: 'calculator',
      group: 'rules',
      type: 'object',
      fields: [
        defineField({name: 'currency', type: 'string', validation: (rule) => rule.required().regex(currency)}),
        defineField({
          name: 'profitSplitTiers',
          type: 'array',
          validation: (rule) => rule.required().min(1),
          of: [
            defineArrayMember({
              type: 'object',
              name: 'profitSplitTier',
              fields: [
                defineField({name: 'id', type: 'string', validation: (rule) => rule.required().regex(kebab)}),
                defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
                defineField({name: 'program', type: 'string', validation: (rule) => rule.required()}),
                defineField({name: 'minProfit', type: 'number', validation: (rule) => rule.required().min(0)}),
                defineField({name: 'maxProfit', type: 'number', validation: (rule) => rule.positive()}),
                percentField('traderSharePercent', 'Trader %'),
              ],
              preview: {select: {title: 'label', subtitle: 'traderSharePercent'}},
            }),
          ],
        }),
        percentField('platformWithholdingTaxPercent'),
        percentField('platformDeductionPercent'),
        percentField('paymentProcessorFeePercent'),
        defineField({name: 'minPayoutAmount', type: 'number', validation: (rule) => rule.required().min(0)}),
        defineField({
          name: 'scaling',
          type: 'object',
          fields: [
            defineField({name: 'enabled', type: 'boolean', initialValue: false}),
            defineField({name: 'intervalMonths', type: 'number'}),
            defineField({name: 'balanceIncreasePercent', type: 'number'}),
            defineField({name: 'maxCapital', type: 'number'}),
            defineField({name: 'traderShareAfterScalePercent', type: 'number'}),
            defineField({name: 'requirements', type: 'array', of: [{type: 'string'}]}),
          ],
        }),
      ],
    }),

    defineField({
      name: 'faqs',
      group: 'content',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'firmFaq',
          fields: [
            defineField({name: 'id', type: 'string', validation: (rule) => rule.required().regex(kebab)}),
            defineField({name: 'question', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'answer', type: 'text', rows: 5, validation: (rule) => rule.required()}),
            defineField({name: 'slug', type: 'string', validation: (rule) => rule.required().regex(kebab)}),
            defineField({name: 'locale', type: 'string', initialValue: 'en'}),
            defineField({name: 'keywords', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}}),
            defineField({
              name: 'seo',
              type: 'object',
              fields: [
                defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
                defineField({name: 'metaDescription', type: 'text', rows: 2, validation: (rule) => rule.required().max(320)}),
                defineField({name: 'datePublished', type: 'date', validation: (rule) => rule.required()}),
                defineField({name: 'dateModified', type: 'date'}),
                defineField({name: 'schemaType', type: 'string', initialValue: 'FAQPage', readOnly: true}),
                defineField({name: 'canonicalPath', type: 'string', validation: (rule) => rule.required()}),
              ],
            }),
          ],
          preview: {select: {title: 'question'}},
        }),
      ],
    }),
    defineField({
      name: 'prosAndCons',
      group: 'content',
      type: 'object',
      fields: [
        defineField({name: 'pros', type: 'array', of: [{type: 'string'}]}),
        defineField({name: 'cons', type: 'array', of: [{type: 'string'}]}),
      ],
    }),
  ],
  orderings: [
    {title: 'Directory order', name: 'sortOrder', by: [{field: 'sortOrder', direction: 'asc'}]},
    {title: 'Name', name: 'name', by: [{field: 'basic.name', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'basic.name', partner: 'offer.partner', status: 'status'},
    prepare: ({title, partner, status}) => ({
      title,
      subtitle: [partner ? 'Partner' : 'Editorial', status].filter(Boolean).join(' · '),
    }),
  },
})
