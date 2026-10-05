'use client'

import { RouteError } from '@/components/shared/RouteError'

export default function EditorError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} area="editor" />
}
