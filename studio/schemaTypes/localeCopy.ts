import {defineField, defineType} from 'sanity'

export const NEWS_LOCALES = [
  {name: 'en', title: 'English'},
  {name: 'es', title: 'Español'},
  {name: 'cn', title: '简体中文'},
  {name: 'tw', title: '繁體中文'},
  {name: 'th', title: 'ไทย'},
  {name: 'vi', title: 'Tiếng Việt'},
  {name: 'pt', title: 'Português'},
] as const

export const newsLocaleCopy = defineType({
  name: 'newsLocaleCopy',
  title: 'Locale copy',
  type: 'object',
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'summary', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({name: 'content', type: 'text', rows: 14, validation: (rule) => rule.required()}),
  ],
})

export const newsTranslations = defineType({
  name: 'newsTranslations',
  title: 'Translations',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fields: NEWS_LOCALES.map((locale) =>
    defineField({
      name: locale.name,
      title: locale.title,
      type: 'newsLocaleCopy',
      validation: (rule) => rule.required(),
    }),
  ),
})
