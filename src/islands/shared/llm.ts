import { StepMap } from '@tiptap/pm/transform'
import { SSETransformStream } from './sse'

export interface GenerateInit {
  userPrompt: string
  systemPrompt?: string
  image?: {
    mimeType: string
    data: string
  }
  jsonMode?: boolean
}
export const generate = async (init: GenerateInit) => {
  const res = await fetch(
    'https://mobile-app-contest-nanoha.deno.dev/generate',
    {
      method: 'POST',
      body: JSON.stringify({ ...init, stream: false }),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    throw new Error(`error: ${await res.text()}`)
  }
  return await res.text()
}
export const generateStream = async (init: GenerateInit) => {
  const res = await fetch(
    'https://mobile-app-contest-nanoha.deno.dev/generate',
    {
      method: 'POST',
      body: JSON.stringify({ ...init, stream: true }),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    throw new Error('Error')
  }
  if (!res.body) {
    throw new Error('Body is null')
  }
  const stream = res.body.pipeThrough(new SSETransformStream())
  const reader = await stream.getReader()
  return (async function* () {
    while (true) {
      const { value, done } = await reader.read()
      if (value) {
        yield value.data ?? ''
      }
      if (done) {
        return
      }
    }
  })()
}
