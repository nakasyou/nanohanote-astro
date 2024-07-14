/** @jsxImportSource @builder.io/qwik */

import { component$, useContextProvider, useStore } from "@builder.io/qwik"
import { type ScreenState, SCREEN_STATE_CTX } from "./store"
import { InitialScreen } from "./components/InitialScreen.qwik"
import type { NoteLoadType } from "../note/note-load-types"
import { QuizScreen } from "./components/Quiz.qwik"
import IconArrowLeft from '@tabler/icons/outline/arrow-left.svg?raw'
import { removeIconSize } from "../note/utils/icon/removeIconSize"

/**
 * ナビゲーター
 */
const NavBar = component$(() => {
  return <div>
    <a class="w-8 h-8" href=".">
      <div dangerouslySetInnerHTML={removeIconSize(IconArrowLeft)} class="w-8 h-8" />
    </a>
  </div>
})


export default component$<{
  noteLoadType: NoteLoadType
}>((props) => {
  const screenState = useStore<ScreenState>({
    note: 'pending',
    started: false,

    availableAI: null,
    noteLoadType: props.noteLoadType
  })

  useContextProvider(SCREEN_STATE_CTX, screenState)

  return <div class="flex flex-col h-[100dvh] lg:flex-row w-full">
    <div class="lg:h-[100dvh] lg:border-r border-b lg:border-b-0 border-r-0">
      <NavBar />
    </div>
    <div class="px-2 w-full pb-5 h-[100dvh] overflow-y-auto grow">
      {
        screenState.started
          ? <QuizScreen />
          : <InitialScreen />
      }
    </div>
  </div>
})