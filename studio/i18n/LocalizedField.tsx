import {useCurrentLocale, type FieldProps} from 'sanity'
import {ZH_FIELD_TEXT} from './labels'

function translate(text: string | undefined): string | undefined {
  return text ? (ZH_FIELD_TEXT[text] ?? text) : text
}

/** Field titles can't use Studio i18n keys, so they follow the language menu here. */
export function LocalizedField(props: FieldProps) {
  const locale = useCurrentLocale()
  if (!locale.id.startsWith('zh')) return props.renderDefault(props)
  const title = translate(props.title)
  const description = translate(props.description)
  // DateTimeField and BooleanField read the label from schemaType, not props.title.
  return props.renderDefault({
    ...props,
    title,
    description,
    schemaType: {...props.schemaType, title, description},
  } as FieldProps)
}
