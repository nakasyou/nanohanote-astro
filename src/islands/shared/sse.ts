interface SSEMessage {
  event: string | null
  data: string
  id: string | null
  retry: number | null
}

class SSETransformerContext implements Transformer<Uint8Array, SSEMessage> {
  private buffer = ''

  transform(
    chunk: Uint8Array,
    controller: TransformStreamDefaultController<SSEMessage>,
  ) {
    this.buffer += new TextDecoder().decode(chunk)

    const lines = this.buffer.split(/\r?\n/)
    this.buffer = lines.pop() || ''

    let event: string | null = null
    let data = ''
    let id: string | null = null
    let retry: number | null = null

    for (const line of lines) {
      if (line === '') {
        if (data) {
          controller.enqueue({ event, data: data.trim(), id, retry })
        }
        event = null
        data = ''
        id = null
        retry = null
        continue
      }

      if (line.startsWith(':')) {
        continue
      }

      const [field, ...rest] = line.split(':')
      const value = rest.join(':').trimStart()

      switch (field) {
        case 'event':
          event = value || null
          break
        case 'data':
          data += `${value}\n`
          break
        case 'id':
          id = value || null
          break
        case 'retry':
          retry = value ? Number.parseInt(value, 10) : null
          break
      }
    }
  }

  flush(controller: TransformStreamDefaultController<SSEMessage>) {
    if (this.buffer) {
      const lines = this.buffer.split(/\r?\n/)
      let event: string | null = null
      let data = ''
      let id: string | null = null
      let retry: number | null = null

      for (const line of lines) {
        if (line === '') {
          if (data) {
            controller.enqueue({ event, data: data.trim(), id, retry })
          }
          event = null
          data = ''
          id = null
          retry = null
          continue
        }

        const [field, ...rest] = line.split(':')
        const value = rest.join(':').trimStart()

        switch (field) {
          case 'event':
            event = value || null
            break
          case 'data':
            data += `${value}\n`
            break
          case 'id':
            id = value || null
            break
          case 'retry':
            retry = value ? Number.parseInt(value, 10) : null
            break
        }
      }
    }
  }
}

export class SSETransformStream extends TransformStream<
  Uint8Array,
  SSEMessage
> {
  constructor() {
    super(new SSETransformerContext())
  }
}
