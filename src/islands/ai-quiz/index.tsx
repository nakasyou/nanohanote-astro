import { Show, createSignal, onMount } from 'solid-js'
import type { MargedNoteData } from '../note/components/notes-utils'
import { Spinner } from '../note/components/utils/Spinner'
import type { NoteLoadType } from '../note/note-load-types'
import { load } from '../note/utils/file-format'
import { loadNoteFromType } from '../shared/storage'
import { QuizScreen, finish } from './QuizScreen'

export const Navbar = () => {}

export const InitialScreen = () => {
  return <div>aaa</div>
}

const LoadingNoteScreen = () => {
  return (
    <div class="h-full grid place-items-center">
      <div class="flex justify-center items-center">
        <Spinner class="border-on-background" />
        ノートを読み込み中...
      </div>
    </div>
  )
}
const LoadErrorScreen = () => (
  <div class="h-full justify-center">
    <div class="text-error">ノートの読み込みに失敗しました</div>
  </div>
)

export default (props: {
  noteLoadType: NoteLoadType
}) => {
  const [getNote, setNote] = createSignal<MargedNoteData[]>()
  const [getNoteLoadState, setNoteLoadState] = createSignal<
    'pending' | 'loaded' | 'error'
  >('pending')
  const [getIsShownQuizScreen, setIsShownQuizScreen] = createSignal(false)
  const [getNoteId, setNoteId] = createSignal<number>()

  onMount(async () => {
    setNoteLoadState('pending')
    const loadedNoteFile = await loadNoteFromType(props.noteLoadType)
    setNoteId(props.noteLoadType.from === 'local' ? props.noteLoadType.id : 0)

    if (!loadedNoteFile) {
      setNoteLoadState('error')
      return
    }

    const loadedNote = await load(new Blob([loadedNoteFile.nnote]))
    if (!loadedNote.success) {
      setNoteLoadState('error')
      return
    }

    setNote(loadedNote.notes)
    setNoteLoadState('loaded')
  })
  return (
    <div class="h-dvh">
      <Show
        when={getIsShownQuizScreen()}
        fallback={
          <>
            <Show when={getNoteLoadState() === 'loaded'}>
              <div class="h-full grid place-items-center">
                <div class="text-center">
                  <div class="text-3xl font-bold">Quiz with AI</div>
                  <hr class="my-1" />
                  <div class="mb-1">AI によるスマートな学習</div>
                  <div class="flex justify-center gap-2 flex-wrap">
                    <button
                      type="button"
                      class="filled-button"
                      onClick={() => setIsShownQuizScreen(true)}
                    >
                      学習を開始する
                    </button>
                    <button
                      type="button"
                      class="text-button"
                      onClick={() => finish()}
                    >
                      戻る
                    </button>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={getNoteLoadState() === 'pending'}>
              <LoadingNoteScreen />
            </Show>
            <Show when={getNoteLoadState() === 'error'}>
              <LoadErrorScreen />
            </Show>
          </>
        }
      >
        <QuizScreen
          notes={getNote() as MargedNoteData[]}
          noteId={getNoteId() as number}
        />
      </Show>
    </div>
  )
}
