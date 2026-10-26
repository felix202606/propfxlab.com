import {defineLocaleResourceBundle} from 'sanity'

export const STUDIO_NS = 'propfxlab'

const en = {
  'structure.content': 'Content',
  'structure.homepage': 'Homepage placements',
  'structure.firms': 'Prop firms',
  'structure.news': 'News',
  'type.firm': 'Prop firm',
  'type.newsArticle': 'News',
  'group.listing': 'Listing & partner',
  'group.rules': 'Rules & payouts',
  'group.profile': 'Profile',
  'group.content': 'FAQ & pros/cons',
}

const zhHans: Record<keyof typeof en, string> = {
  'structure.content': '内容',
  'structure.homepage': '首页推荐位',
  'structure.firms': '自营交易平台',
  'structure.news': '新闻',
  'type.firm': '自营交易平台',
  'type.newsArticle': '新闻',
  'group.listing': '展示与合作',
  'group.rules': '规则与出金',
  'group.profile': '公司资料',
  'group.content': '常见问题与优缺点',
}

export const studioBundles = [
  defineLocaleResourceBundle({locale: 'en-US', namespace: STUDIO_NS, resources: en}),
  defineLocaleResourceBundle({locale: 'zh-Hans', namespace: STUDIO_NS, resources: zhHans}),
]

export function studioText(key: keyof typeof en) {
  return {key, ns: STUDIO_NS}
}
