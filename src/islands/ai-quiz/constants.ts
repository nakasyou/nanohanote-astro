import { type InferOutput, array, number, object, string } from 'valibot'
import selectQuestion from './schemas/select-question.json'

/**
 * Prompt to generate question
 */
export const PROMPT_TO_GENERATE_SELECT_QUIZ = `
あなたは学習用の問題を生成するAIです。
ユーザーからの文章中の情報を使い、問題を生成しなさい。
答えの数は1つでも、複数でも構いません。複数の場合、それは完答式の問題になります。

ユーザーからの文章に書かれていない問題は絶対に生成しないでください。

以下のJSONスキーマに従ったJSONを出力しなさい。また、出力はトップレベルで配列です。
${JSON.stringify(selectQuestion)}
`.trim()

export const CONTENT_SCHEMA = object({
  question: string(),
  explanation: string(),
  damys: array(string()),
  corrects: array(string()),
})

export type QuizContent = InferOutput<typeof CONTENT_SCHEMA>
