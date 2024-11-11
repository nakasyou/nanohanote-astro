import { parse, safeParse } from 'valibot'
import { getGoogleGenerativeAI } from '../shared/gemini'
import { CONTENT_SCHEMA, PROMPT_TO_GENERATE_SELECT_QUIZ, type QuizContent } from './constants'
import type { MargedNoteData } from '../note/components/notes-utils'
import type { TextNoteData } from '../note/components/notes/TextNote/types'
import type { QuizDB, Quizzes } from './storage'
import { shuffle } from '../../utils/arr'

const generateQuizzesFromAI = async (text: string): Promise<QuizContent[]> => {
  const gemini = getGoogleGenerativeAI()
  if (!gemini) {
    throw new Error('Gemini is null.')
  }
  const response = await gemini.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json'
    },
    systemInstruction: {
      role: 'system',
      parts: [{ text: PROMPT_TO_GENERATE_SELECT_QUIZ }],
    }
  }).startChat().sendMessage(text)

  let json: unknown
  try {
    json = JSON.parse(response.response.text())
  } catch {
    return []
  }
  if (!Array.isArray(json)) {
    return []
  }
  return json.flatMap(r => {
    const parsed = safeParse(CONTENT_SCHEMA, r)
    if (!parsed.success) {
      return []
    }
    const data = parsed.output
    if (!new Set(data.damys).isDisjointFrom(new Set(data.corrects))) {
      return []
    }
    return [data]
  })
}

export interface GeneratedQuiz {
  content: QuizContent
  noteDataId: string
  reason: 'new' | 'lowRate'
  id: number
  rate: {
    proposed: number
    correct: number
  }
}
export class QuizManager {
  #db: QuizDB
  constructor(db: QuizDB) {
    this.#db = db
  }
  async #getNeverProposedQuizzes(noteId: number) {
    const quizzes = await this.#db.quizzes.where({
      noteId,
      proposeCount: 0
    }).toArray()
    return quizzes
  }
  async getLowCorrectRateQuizzes(noteId: number) {
    const quizzes = (await this.#db.quizzes.where({
      noteId
    }).toArray())
      .filter(q => q.proposeCount > 0).sort((a, b) => (a.correctCount / a.proposeCount) - (b.correctCount / b.proposeCount))
    return quizzes
  }
  async #addProposedQuizz(notes: MargedNoteData[], noteId: number) {
    const textNotes = notes.filter(note => note.type === 'text') as TextNoteData[]
    const randomTextNote = textNotes[Math.floor(textNotes.length * Math.random())]
    const generated = await generateQuizzesFromAI(randomTextNote?.canToJsonData.html ?? '')

    const quizzes = generated.map(content => ({
      content,
      correctCount: 0,
      proposeCount: 0,
      noteDataId: randomTextNote?.id ?? '',
      noteId
    } satisfies Quizzes))

    await this.#db.quizzes.bulkAdd(quizzes)
  }
  async generateQuizzes(n: number, notes: MargedNoteData[], noteId: number): Promise<GeneratedQuiz[]> {
    const quizzes: Map<number, GeneratedQuiz> = new Map()

    // First, propose 5 low rate quizzes
    const lowRates = await this.getLowCorrectRateQuizzes(noteId)
    for (let i = 0; i < 5; i++) {
      const lowRateQuiz = lowRates[i]
      if (!lowRateQuiz) {
        break
      }
      quizzes.set(lowRateQuiz.id ?? 0, {
        content: lowRateQuiz.content,
        id: lowRateQuiz.id ?? 0,
        reason: 'lowRate',
        noteDataId: lowRateQuiz.noteDataId,
        rate: {
          proposed: lowRateQuiz.proposeCount, correct: lowRateQuiz.correctCount
        }
      })
    }

    // Second, generate quizzes
    while (true) {
      const gotQuizzes = shuffle(await this.#getNeverProposedQuizzes(noteId))
      for (const quiz of gotQuizzes) {
        quizzes.set(quiz.id ?? 0, {
          id: quiz.id ?? 0,
          content: quiz.content,
          reason: 'new',
          noteDataId: quiz.noteDataId,
          rate: { proposed: quiz.proposeCount, correct: quiz.correctCount }
        })
      }

      if ([...quizzes.keys()].length >= n) {
        return shuffle([...quizzes.values()])
      }
      await this.#addProposedQuizz(notes, noteId)
    }
  }
  async updateQuizStat(id: number, corrected: boolean) {
    const prev = await this.#db.quizzes.get(id)
    if (!prev) {
      return
    }
    await this.#db.quizzes.update(id, {
      proposeCount: prev.proposeCount + 1,
      correctCount: corrected ? prev.correctCount + 1 : prev.correctCount
    })
  }
}
