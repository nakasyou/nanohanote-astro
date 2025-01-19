import markdownIt from 'markdown-it'
import {
  Match,
  Show,
  Switch,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { generate as generateLLM, generateStream } from '../../../../shared/llm'
import { Spinner } from '../../utils/Spinner'

const markdownParser = markdownIt()

type Mode = 'text' | 'image'
type Generate = {
  generate: () => ReturnType<typeof generateStream>
}

const renderMarkdown = (markdown: string) =>
  markdownParser
    .render(
      markdown.replace(/\*\*[\s\S]*?\*\*/g, (str) => `((${str.slice(2, -2)}))`),
    )
    .replace(
      /\(\([\s\S]*?\)\)/g,
      (str) =>
        `<span data-nanohasheet="true" class="nanoha-sheet">${str.slice(2, -2)}</span>`,
    )

const ModeSwitcher = (props: {
  mode: Mode
  onChange(mode: Mode): void
}) => {
  return (
    <div class="grid grid-cols-2 place-items-center">
      <button
        class="border-b w-full h-full"
        onClick={() => props.onChange('text')}
        type="button"
      >
        テキストから
        <wbr />
        生成
      </button>
      <button
        class="border-b w-full h-full"
        onClick={() => props.onChange('image')}
        type="button"
      >
        写真を
        <wbr />
        スキャンして生成
      </button>
      <div
        class="border-t border-primary w-full transition-transform duration-200 ease-in -translate-y-px"
        classList={{
          'translate-x-full': props.mode === 'image',
        }}
      />
    </div>
  )
}

const FROM_TEXT_PLACEHOLDER_CONTENTS: string[] = [
  '水の電気分解とは?',
  '平安時代の貴族について',
  '日本国憲法について説明して',
  '日本語の品詞についての暗記シートを作成して',
  '英語の曜日についての暗記シート',
]

export const FromText = (props: {
  setStream(stream: Generate): void
  initPrompt?: string
}) => {
  const [getCurrentPlaceholder, setCurrentPlaceholder] = createSignal({
    isWriting: false,
    current: '',
    index: 0,
  })
  const [getPrompt, setPrompt] = createSignal(props.initPrompt ?? '')
  const [getIsPreprocessing, setIsPreprocessing] = createSignal(false)

  let cleanupped = false
  onMount(() => {
    const step = async () => {
      const currentPlaceholder = getCurrentPlaceholder()
      const placeholderTarget =
        FROM_TEXT_PLACEHOLDER_CONTENTS[currentPlaceholder.index] ?? ''

      if (currentPlaceholder.isWriting) {
        // 追加中
        if (currentPlaceholder.current === placeholderTarget) {
          // 書き終わった
          await new Promise((resolve) => setTimeout(resolve, 1500))
          setCurrentPlaceholder({
            ...currentPlaceholder,
            isWriting: false, // 削除している
          })
        } else {
          // 書き続ける
          setCurrentPlaceholder({
            ...currentPlaceholder,
            current:
              currentPlaceholder.current +
              placeholderTarget[currentPlaceholder.current.length],
          })
        }
      } else {
        // Backspace している
        if (currentPlaceholder.current === '') {
          // 次
          setCurrentPlaceholder({
            current: '',
            isWriting: true,
            index:
              (currentPlaceholder.index + 1) %
              FROM_TEXT_PLACEHOLDER_CONTENTS.length,
          })
        } else {
          // Backspace している
          setCurrentPlaceholder({
            ...currentPlaceholder,
            current: currentPlaceholder.current.slice(0, -1),
          })
        }
      }

      if (!cleanupped) {
        requestAnimationFrame(step)
      }
    }
    step()
  })
  onCleanup(() => {
    cleanupped = true
  })

  const generate = async () => {
    setIsPreprocessing(true)
    props.setStream({
      generate: () =>
        generateStream({
          systemPrompt:
            'ユーザーの指示に基づき、暗記の手助けになる赤シート用文章を生成しなさい。赤シートで隠すべき単語は、Markdownの太字機能で表現しなさい。隠す必要がない場所には太字は使わないでください。太字の場所はユーザーに見えません。また、単語の一覧を箇条書きにすることはしないでください。',
          userPrompt: getPrompt(),
        }),
    })
    setIsPreprocessing(false)
  }

  return (
    <div>
      <div>
        <label>
          <div>プロンプトを入力...</div>
          <textarea
            placeholder={getCurrentPlaceholder().current}
            class="w-full p-1 h-20"
            value={getPrompt()}
            onInput={(e) => setPrompt(e.target.value)}
          />
        </label>
        <button
          onClick={generate}
          class="filled-button my-2 disabled:opacity-70 flex justify-center items-center gap-1"
          disabled={!getPrompt() || getIsPreprocessing()}
          type="button"
        >
          <Show when={getIsPreprocessing()} fallback="生成">
            <Spinner />
            準備中...
          </Show>
        </button>
      </div>
    </div>
  )
}
export const FromImage = (props: {
  setStream(stream: Generate): void
}) => {
  const [getImageFile, setImageFile] = createSignal<File>()
  const [getScanedImageURL, setScanedImageURL] = createSignal<string>()
  const [getIsPreprocessing, setIsPreprocessing] = createSignal(false)

  createEffect(() => {
    untrack(() => {
      const prev = getScanedImageURL()
      if (prev) {
        URL.revokeObjectURL(prev)
      }
    })
    const file = getImageFile()
    setScanedImageURL(file ? URL.createObjectURL(file) : void 0)
  })

  const generate = async () => {
    setIsPreprocessing(true)
    const file = getImageFile()
    if (!file) {
      return
    }

    const b64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]!)
      reader.readAsDataURL(file)
    })

    const generate = async () =>
      await generateStream({
        systemPrompt:
          '画像を抽出し、そっくりそのまま書き出しなさい。省略せずに画像の文字全てを書き出すこと。画像に書いていないことは書かないこと。また、ユーザーからの指示があれば、条件を満たす場所をMarkdownの太字で表現しなさい。',
        image: { mimeType: file.type, data: b64 },
        userPrompt: '',
      })
    props.setStream({
      generate,
    })
    setIsPreprocessing(false)
  }

  return (
    <div>
      <Show
        when={getImageFile()}
        fallback={
          <div>
            <FromImageScanner scaned={setImageFile} />
          </div>
        }
      >
        <div class="h-[70dvh] max-h-[70dvh] grid grid-rows-2 grid-cols-1 md:grid-rows-1 md:grid-cols-2">
          <div>
            <div
              style={{
                'background-image': `url("${getScanedImageURL()}")`,
              }}
              class="w-full h-full bg-no-repeat bg-center bg-contain"
            />
          </div>
          <div class="h-full">
            <label class="h-full flex flex-col">
              <div>どのように処理するかのカスタムプロンプト(任意)</div>
              <textarea class="w-full m-1 p-1 border grow" placeholder="" />
              <button
                onClick={generate}
                type="button"
                class="filled-button disabled:opacity-80 flex items-center gap-1 justify-center"
                disabled={getIsPreprocessing()}
              >
                <Show when={getIsPreprocessing()} fallback={'生成'}>
                  <Spinner />
                  準備中...
                </Show>
              </button>
            </label>
          </div>
        </div>
      </Show>
    </div>
  )
}
const FromImageScanner = (props: {
  scaned(file: File): void
}) => {
  let inputRef!: HTMLInputElement
  const [getIsUsingCamera, setIsUsingCamera] = createSignal(false)
  const open = (useCamera: boolean) => {
    setIsUsingCamera(useCamera)
    inputRef.click()
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          file && props.scaned(file)
        }}
        capture={getIsUsingCamera() ? 'camera' : void 0}
      />
      <div class="flex justify-center p-2 gap-1 flex-wrap">
        <button class="filled-button" type="button" onClick={() => open(true)}>
          カメラを開く
        </button>
        <div>
          または
          <button class="text-button" type="button" onClick={() => open(false)}>
            ファイルを開く
          </button>
        </div>
      </div>
    </div>
  )
}
export const AIDialogCore = (props: {
  close(result: string): void
  initPrompt?: string
}) => {
  const [getGenerateMode, setGenerateMode] = createSignal<Mode>('text')
  const [getStream, setStream] = createSignal<Generate>()
  const [getGenerated, setGenerated] = createSignal('')
  const [getIsGenerating, setIsGenerating] = createSignal(false)
  const [getGenerateError, setGenerateError] = createSignal<{
    type: 'SERVICE_UNAVAILABLE' | 'UNKNOWN' | 'SAFETY' | 'RATE_LIMIT'
    isFetchError: boolean
  }>()
  let outputRef!: HTMLDivElement

  const generate = async () => {
    setIsGenerating(true)
    setGenerated('')
    setGenerateError()
    const streamer = getStream()
    if (!streamer) {
      return
    }
    let stream: Awaited<ReturnType<typeof generateStream>>
    try {
      stream = await streamer.generate()
    } catch (e) {
      console.error(e)
      setIsGenerating(false)
      setGenerateError({ type: 'UNKNOWN', isFetchError: true })
      return
    }
    let text = ''
    for await (const chunk of stream) {
      text += chunk
      setGenerated(text)
    }
    setIsGenerating(false)
  }
  createEffect(() => {
    getStream()
    generate()
  })
  return (
    <div>
      <Show
        when={getStream()}
        fallback={
          <>
            <ModeSwitcher mode={getGenerateMode()} onChange={setGenerateMode} />
            <Show
              when={getGenerateMode() === 'text'}
              fallback={<FromImage setStream={setStream} />}
            >
              <FromText setStream={setStream} initPrompt={props.initPrompt} />
            </Show>
          </>
        }
      >
        <div>
          <div
            class="nanohanote-textnote-styler border p-1 max-h-[70dvh] overflow-y-scroll break-words"
            innerHTML={renderMarkdown(getGenerated())}
            ref={outputRef}
          />
          <div
            classList={{
              'grid grid-cols-1 md:grid-cols-2': !!getGenerateError(),
            }}
          >
            <div class="text-error">
              <Switch>
                <Match when={getGenerateError()?.type === 'SAFETY'}>
                  安全上の理由により停止されました
                </Match>
                <Match when={getGenerateError()?.type === 'RATE_LIMIT'}>
                  API
                  呼び出しの上限に達しました。時間をおいて試す、またはカスタム
                  Gemini API Key
                  を設定するか、更新することにより解決するかもしれません。
                </Match>
                <Match
                  when={getGenerateError()?.type === 'SERVICE_UNAVAILABLE'}
                >
                  Google
                  のサーバーにエラーが発生している可能性があります。時間をおいて試してください。
                </Match>
                <Match when={getGenerateError()?.type === 'UNKNOWN'}>
                  Gemini の使用において、不明なエラーが発生しました。
                </Match>
              </Switch>
            </div>
            <div class="flex items-center">
              <Show when={!getIsGenerating() && getGenerateError()}>
                <button class="filled-button" type="button" onClick={generate}>
                  再生成
                </button>
              </Show>
              <Show when={!getGenerateError()?.isFetchError}>
                <button
                  onClick={() => props.close(renderMarkdown(getGenerated()))}
                  classList={{
                    'text-button': !!getGenerateError(),
                    'filled-button': !getGenerateError(),
                  }}
                  class="disabled:opacity-80"
                  disabled={getIsGenerating()}
                  type="button"
                >
                  <Show
                    when={getIsGenerating()}
                    fallback={
                      getGenerateError() ? 'このまま挿入' : '結果を挿入する'
                    }
                  >
                    <div class="flex gap-2 justify-start items-center">
                      <Spinner />
                      生成中...
                    </div>
                  </Show>
                </button>
              </Show>
              <Show when={!getIsGenerating() && !getGenerateError()}>
                <button class="text-button" type="button" onClick={generate}>
                  再生成
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
