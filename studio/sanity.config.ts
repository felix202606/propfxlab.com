import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {zhHansLocale} from '@sanity/locale-zh-hans'
import {schemaTypes} from './schemaTypes'
import {studioBundles, studioText} from './i18n/bundles'
import {LocalizedField} from './i18n/LocalizedField'

const SINGLETON = 'homepagePlacements'

export default defineConfig({
  name: 'default',
  title: 'PropFXLab',

  projectId: '7am7u5md',
  dataset: 'production',

  i18n: {bundles: studioBundles},

  plugins: [
    zhHansLocale(),
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .i18n({title: studioText('structure.content')})
          .items([
            S.listItem()
              .title('Homepage placements')
              .i18n({title: studioText('structure.homepage')})
              .id(SINGLETON)
              .child(S.document().schemaType(SINGLETON).documentId(SINGLETON)),
            S.documentTypeListItem('firm')
              .title('Prop firms')
              .i18n({title: studioText('structure.firms')}),
            S.documentTypeListItem('newsArticle')
              .title('News')
              .i18n({title: studioText('structure.news')}),
          ]),
    }),
    visionTool(),
  ],

  form: {
    components: {field: LocalizedField},
  },

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates
        .filter(({schemaType}) => schemaType !== SINGLETON)
        .map((template) =>
          template.schemaType === 'firm' || template.schemaType === 'newsArticle'
            ? {...template, i18n: {title: studioText(`type.${template.schemaType}`)}}
            : template,
        ),
  },

  document: {
    actions: (actions, {schemaType}) =>
      schemaType === SINGLETON
        ? actions.filter(({action}) => action !== 'duplicate' && action !== 'delete')
        : actions,
  },
})
