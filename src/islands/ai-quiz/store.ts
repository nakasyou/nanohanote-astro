import { createContextId, type NoSerialize } from "@builder.io/qwik"
import type { NoteData } from "../note/components/notes-utils"
import type { QuizContent } from './constants'
import type { NoteLoadType } from "../note/note-load-types"

/**
 * クイズ
 */
export interface Quiz {
  content: QuizContent
  
  source: NoteData
}

export interface ScreenState {
  note: NoSerialize<{
    name: string
    notes: NoteData[]
  }> | 'pending' | 'notfound' | 'invalid'

  started: boolean

  availableAI: boolean | null

  noteLoadType: NoteLoadType
}

export interface QuizState {
  correctQuizzes: Quiz[]
  incorrectQuizzes: Quiz[]

  generatedQuizzes: number

  quizzes: Quiz[]

  current: {
    index: number
    quiz: Quiz
    choices: string[]
  } | null

  goalQuestions: number

  isFinished: boolean

  finishedQuizIndexes: Set<number>
}

export const SCREEN_STATE_CTX = createContextId<ScreenState>('screenState')
export const QUIZ_STATE_CTX = createContextId<QuizState>('quizState')

