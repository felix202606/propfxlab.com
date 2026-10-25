import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const SINGLETON = 'homepagePlacements'

export default defineConfig({
  name: 'default',
  title: 'PropFXLab',

  projectId: '7am7u5md',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Homepage placements')
              .id(SINGLETON)
              .child(S.document().schemaType(SINGLETON).documentId(SINGLETON)),
            S.documentTypeListItem('firm').title('Prop firms'),
            S.documentTypeListItem('newsArticle').title('News'),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => schemaType !== SINGLETON),
  },

  document: {
    actions: (actions, {schemaType}) =>
      schemaType === SINGLETON
        ? actions.filter(({action}) => action !== 'duplicate' && action !== 'delete')
        : actions,
  },
})
