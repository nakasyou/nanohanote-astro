import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from 'solid-js'
import { shuffle } from '../../utils/arr'
import { icon } from '../../utils/icons'
import type { MargedNoteData } from '../note/components/notes-utils'
import type { TextNoteData } from '../note/components/notes/TextNote/types'
import type { QuizContent } from './constants'
import { type GeneratedQuiz, QuizManager } from './quiz-manager'
import { QuizDB, type Quizzes } from './storage'
import './QuizScreen.css'

export const finish = () => {
  location.href = location.href.replace(/\/quiz\/?$/, '')
}

const QuizSelection = (props: {
  text: string

  onChange: (selected: boolean) => void
}) => {
  const [getSelected, setSelected] = createSignal(false)

  createEffect(() => {
    props.onChange
    setSelected(false)
  })
  createEffect(() => {
    props.onChange(getSelected())
  })

  return (
    <button
      type="button"
      class="w-full block transition-all h-auto min-h-[2.5rem]"
      classList={{
        'filled-button': getSelected(),
        'outlined-button': !getSelected(),
      }}
      onClick={() => setSelected(!getSelected())}
    >
      {props.text}
    </button>
  )
}

const SelectAnswerScreen = (props: {
  quiz: GeneratedQuiz
  onAnswer(selected: string[]): void
}) => {
  const [getSelected, setSelected] = createSignal<string[]>([])
  const getSelections = createMemo(() => {
    setSelected([])
    const allSelections = [
      ...props.quiz.content.corrects,
      ...props.quiz.content.damys,
    ]
    return shuffle(allSelections)
  })

  return (
    <div class="h-full grid place-items-center">
      <div class="">
        <div class="text-lg">{props.quiz.content.question}</div>
        <div class="text-right">
          <Show
            when={props.quiz.reason === 'new'}
            fallback={
              <>
                😒低正答率 (
                {Math.round(
                  (props.quiz.rate.correct / props.quiz.rate.proposed) * 10000,
                ) / 100}
                %)
              </>
            }
          >
            ⚡新しい問題
          </Show>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <For each={getSelections()}>
          {(selection) => (
            <QuizSelection
              text={selection}
              onChange={(v) => {
                setSelected((prev) => {
                  const set = new Set(prev)
                  if (v) {
                    set.add(selection)
                  } else {
                    set.delete(selection)
                  }
                  return [...set]
                })
              }}
            />
          )}
        </For>
      </div>
      <div>
        <button
          class="filled-button disabled:opacity-80"
          type="button"
          onClick={() => props.onAnswer(getSelected())}
          disabled={getSelected().length === 0}
        >
          {getSelected().length === 0 ? '選択してください' : '回答する'}
        </button>
      </div>
    </div>
  )
}

const CorrectShow = (props: {
  onEndShow(): void
}) => {
  const [getIsOpacity0, setIsOpacity0] = createSignal(false)
  onMount(() => {
    setTimeout(() => {
      setIsOpacity0(true)
      setTimeout(() => {
        props.onEndShow()
      }, 200)
    }, 700)
  })
  return (
    <div class="fixed top-0 left-0 w-full h-dvh grid place-items-center">
      <div
        class="text-3xl p-2 transition-opacity"
        classList={{
          'opacity-0': getIsOpacity0(),
        }}
      >
        ✅正解!
      </div>
    </div>
  )
}

const ExplainContent = (props: {
  quiz: GeneratedQuiz
}) => {
  return (
    <div class="h-full gap-2">
      <div class="flex flex-col">
        <div class="font-bold">✨AI による解説</div>
        <div class="p-2 grow">{props.quiz.content.explanation}</div>
      </div>
      <div class="flex flex-col">
        <div class="font-bold">📒使用されたノート</div>
        <div class="p-2 border grow">
          <div innerHTML={props.quiz.usedNote.canToJsonData.html} />
        </div>
      </div>
    </div>
  )
}
/** 不正解時 */
const ExplainScreen = (props: {
  quiz: GeneratedQuiz
  selected: string[]

  onEnd(): void
}) => {
  const [getIsShownExplain, setIsShownExplain] = createSignal(false)
  const [getIsTopExplain, setIsTopExplain] = createSignal(false)

  return (
    <div class="h-full flex flex-col p-2">
      <Show when={getIsShownExplain()}>
        <div
          classList={{ 'translate-y-[100%] opacity-0': !getIsTopExplain() }}
          class="p-2 transition-all bg-background border border-outlined w-full h-dvh fixed top-0 left-0 z-30 flex flex-col"
        >
          <div class="flex justify-between items-center">
            <div class="text-2xl">解説</div>
            <button
              onClick={() => {
                setIsTopExplain(false)
                setTimeout(() => {
                  setIsShownExplain(false)
                }, 200)
              }}
              type="button"
              innerHTML={icon('x')}
              class="w-10 h-10"
            />
          </div>
          <div class="overflow-y-scroll grow">
            <ExplainContent quiz={props.quiz} />
          </div>
        </div>
      </Show>
      <div>
        <div class="text-3xl text-center my-2">😒不正解..</div>
        <div class="text-center p-2">{props.quiz.content.question}</div>
      </div>
      <div class="grow">
        <div class="h-full md:flex md:items-start grid place-items-center">
          <div class="md:w-1/2">
            <div class="h-full grid grid-cols-3 gap-2 p-2">
              <div>選択肢</div>
              <div>あなたの回答</div>
              <div>正解</div>
              <For
                each={[
                  ...props.quiz.content.corrects,
                  ...props.quiz.content.damys,
                ]}
              >
                {(selection) => (
                  <>
                    <div
                      classList={{
                        'text-green-500':
                          props.selected.includes(selection) ===
                          props.quiz.content.corrects.includes(selection),
                        'text-red-500':
                          props.selected.includes(selection) !==
                          props.quiz.content.corrects.includes(selection),
                      }}
                    >
                      {selection}
                    </div>
                    <Show
                      when={props.selected.includes(selection)}
                      fallback={<div>✖</div>}
                    >
                      <div>✅</div>
                    </Show>
                    <Show
                      when={props.quiz.content.corrects.includes(selection)}
                      fallback={<div>✖</div>}
                    >
                      <div>✅</div>
                    </Show>
                  </>
                )}
              </For>
            </div>
            <div class="flex gap-2 flex-wrap justify-center my-5">
              <button
                class="flex items-center text-button md:hidden"
                type="button"
                onClick={() => {
                  setIsShownExplain(true)
                  setTimeout(() => setIsTopExplain(true), 50)
                }}
              >
                <div innerHTML={icon('sparkles')} class="w-8 h-8" />
                解説を見る
              </button>
              <button
                class="flex items-center filled-button"
                type="button"
                onClick={() => props.onEnd()}
              >
                次の問題
                <div innerHTML={icon('chevronRight')} class="w-8 h-8" />
              </button>
            </div>
          </div>
          <div class="hidden md:block w-1/2 h-full">
            <ExplainContent quiz={props.quiz} />
          </div>
        </div>
      </div>
    </div>
  )
}

const ResultScreen = (props: {
  correct: number
  all: number

  onFinish(): void
  onNextRound(): void
}) => {
  const rate = createMemo(() => (props.correct / props.all) * 100)

  return (
    <div class="h-full flex flex-col justify-around items-center">
      <div>
        <div
          class="w-48 h-48 rounded-full"
          style={{
            background: `conic-gradient(rgb(16 185 129) 0%, rgb(16 185 129) ${rate()}%, rgb(239 68 68) ${rate()}%, rgb(239 68 68) 100%)`,
          }}
        />
        <div class="flex flex-wrap gap-2 justify-center">
          <div>{Math.round(rate() * 100) / 100}%</div>
          <div>
            {props.correct} / {props.all} 正解
          </div>
        </div>
      </div>
      <div class="flex">
        <button
          onClick={() => props.onNextRound()}
          type="button"
          class="filled-button flex gap-2 justify-center items-center"
        >
          次のラウンド
          <div class="w-10 h-10" innerHTML={icon('chevronRight')} />
        </button>
        <button
          onClick={() => props.onFinish()}
          type="button"
          class="text-button"
        >
          終了する
        </button>
      </div>
    </div>
  )
}

const QUESTION_COUNT = 10
export const QuizScreen = (props: {
  notes: MargedNoteData[]
  noteId: number
}) => {
  const [getQuizzes, setQuizzes] = createSignal<GeneratedQuiz[]>([])
  const [getQuizIndex, setQuizIndex] = createSignal(-1)
  const [getIsShownCorrect, setIsShownCorrect] = createSignal(false)
  const [getIsShownExplain, setIsShownExplain] = createSignal(false)
  const [getSelected, setSelected] = createSignal<string[]>([])
  const [getCorrectCount, setCorrectCount] = createSignal(0)
  const currentQuiz = createMemo(() => getQuizzes()[getQuizIndex()])

  const isFinished = createMemo(() => getQuizIndex() >= QUESTION_COUNT)

  let quizManager!: QuizManager

  const nextRound = async () => {
    // Generate
    const generated = await quizManager.generateQuizzes(
      QUESTION_COUNT,
      props.notes,
      props.noteId,
    )
    setQuizzes(generated)
    setQuizIndex(0)
    setIsShownCorrect(false)
    setIsShownExplain(false)
    setSelected([])
    setCorrectCount(0)
  }
  onMount(async () => {
    // Init
    const db = new QuizDB()
    quizManager = new QuizManager(db)
    await nextRound()
  })

  const answered = (selected: string[]) => {
    const selectedSet = new Set(selected)
    const correctSet = new Set(currentQuiz()!.content.corrects)

    const isCorrect =
      selectedSet.isSubsetOf(correctSet) && selectedSet.isSupersetOf(correctSet)

    setSelected(selected)

    if (isCorrect) {
      setIsShownCorrect(true)
      setCorrectCount((p) => p + 1)
    } else {
      setIsShownExplain(true)
    }
    quizManager.updateQuizStat(currentQuiz()!.id, isCorrect)
  }

  const nextQuiz = () => {
    setQuizIndex((p) => p + 1)
    setSelected([])
    setIsShownExplain(false)
    setIsShownCorrect(false)
  }

  return (
    <div class="h-full flex flex-col">
      <Show when={!isFinished()}>
        <div class="flex w-full justify-between items-center px-2">
          <div>
            問{getQuizIndex() + 1} / {QUESTION_COUNT}
          </div>
          <button class="text-button" type="button" onClick={finish}>
            終了する
          </button>
        </div>
      </Show>
      <div class="grow">
        <Show
          when={currentQuiz()}
          fallback={
            <Show
              when={isFinished()}
              fallback={
                <div class="h-full grid place-items-center">生成中...</div>
              }
            >
              <ResultScreen
                all={QUESTION_COUNT}
                correct={getCorrectCount()}
                onFinish={() => finish()}
                onNextRound={() => nextRound()}
              />
            </Show>
          }
        >
          {(quiz) => (
            <Show
              when={getIsShownExplain()}
              fallback={
                <SelectAnswerScreen
                  quiz={quiz()}
                  onAnswer={(s) => answered(s)}
                />
              }
            >
              <ExplainScreen
                quiz={quiz()}
                selected={getSelected()}
                onEnd={() => nextQuiz()}
              />
            </Show>
          )}
        </Show>
        <Show when={getIsShownCorrect()}>
          <CorrectShow
            onEndShow={() => {
              setIsShownCorrect(false)
              nextQuiz()
            }}
          />
        </Show>
      </div>
    </div>
  )
}
