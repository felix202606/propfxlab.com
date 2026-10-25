import {defineArrayMember, defineField, defineType} from 'sanity'

const firmRef = {type: 'reference' as const, to: [{type: 'firm' as const}]}

const scheduleFields = [
  defineField({name: 'startsAt', type: 'datetime'}),
  defineField({name: 'endsAt', type: 'datetime'}),
]

/** Paid slots. Shown as sponsored and kept apart from the calculated ranking. */
export const homepagePlacements = defineType({
  name: 'homepagePlacements',
  title: 'Homepage placements',
  type: 'document',
  fields: [
    defineField({
      name: 'top3',
      title: 'Sponsored Top 3',
      type: 'array',
      validation: (rule) => rule.max(3),
      description: 'Drag to reorder. Labelled "Sponsored" on the site.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'sponsoredSlot',
          fields: [defineField({name: 'firm', ...firmRef, validation: (rule) => rule.required()}), ...scheduleFields],
          preview: {select: {title: 'firm.basic.name', subtitle: 'endsAt'}},
        }),
      ],
    }),
    defineField({
      name: 'banner',
      title: 'Recommended banner',
      type: 'object',
      fields: [
        defineField({name: 'enabled', type: 'boolean', initialValue: false}),
        defineField({name: 'firm', ...firmRef}),
        defineField({name: 'headline', type: 'string'}),
        ...scheduleFields,
      ],
    }),
    defineField({
      name: 'popularComparisons',
      title: 'Popular comparisons on /compare',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'comparisonPair',
          fields: [
            defineField({name: 'left', ...firmRef, validation: (rule) => rule.required()}),
            defineField({name: 'right', ...firmRef, validation: (rule) => rule.required()}),
          ],
          preview: {
            select: {left: 'left.basic.name', right: 'right.basic.name'},
            prepare: ({left, right}) => ({title: `${left ?? '?'} vs ${right ?? '?'}`}),
          },
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Homepage placements'})},
})
