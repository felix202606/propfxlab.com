import {defineField, defineType} from 'sanity'

export const newsArticle = defineType({
  name: 'newsArticle',
  title: 'News',
  type: 'document',
  fields: [
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'string',
      description: 'Published URL is /news/{slug}. Do not change after publishing.',
      readOnly: ({document}) => Boolean(document?._createdAt && document?.slug),
      validation: (rule) =>
        rule
          .required()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {name: 'kebab-case'}),
    }),
    defineField({name: 'title', title: 'English title', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'summary', title: 'English summary', type: 'text', rows: 3, validation: (rule) => rule.required()}),
    defineField({name: 'body', title: 'English body', type: 'text', rows: 14, validation: (rule) => rule.required()}),
    defineField({name: 'translations', type: 'newsTranslations', validation: (rule) => rule.required()}),
    defineField({name: 'sourceName', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'sourceUrl', type: 'url', validation: (rule) => rule.required()}),
    defineField({name: 'publishedAt', type: 'datetime', validation: (rule) => rule.required()}),
    defineField({name: 'scrapedAt', type: 'datetime', validation: (rule) => rule.required()}),
    defineField({name: 'tags', type: 'array', of: [{type: 'string'}], options: {layout: 'tags'}}),
    defineField({
      name: 'relatedFirmSlugs',
      title: 'Related firms (slug)',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),
    defineField({
      name: 'relevance',
      type: 'string',
      options: {list: ['high', 'medium'], layout: 'radio'},
      initialValue: 'medium',
    }),
  ],
  orderings: [
    {title: 'Newest', name: 'publishedDesc', by: [{field: 'publishedAt', direction: 'desc'}]},
  ],
  preview: {
    select: {title: 'title', subtitle: 'publishedAt'},
  },
})
