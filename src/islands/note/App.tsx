import Notes from './components/Notes'
import  { createTextNote } from './components/notes/TextNote'
import Header from './components/Header'
import Fab from './components/Fab'
import { Show, createEffect, createSignal, onMount, onCleanup } from 'solid-js'

import './App.css'
import { createImageNote } from './components/notes/ImageNote'
import { Menu } from './components/Menu'
import { noteBookState, notes, setNoteBookState } from './store'
import type { Props } from '.'
import { Dialog } from './components/utils/Dialog'
import { NotesDB } from './notes-schema'
import { loadFromBlob } from './components/load-process'
import { save as saveFromNotes } from './utils/file-format'

export default (props: Props) => {
  let timeoutEnded = false
  onCleanup(() => {
    timeoutEnded = true
  })
  onMount(async () => {
    notes.setNotes([
      createTextNote({
        blobs: {},
        canToJsonData: {
          html: '<h1>Loading...</h1>'
        },
        type: 'text',
        id: crypto.randomUUID(),
      }),
      ...notes.notes()
    ])

    let save: () => Promise<void> = async () => void 0
    if (props.noteLoadType.from === 'unknown') {
      setLoadError('指定したノートは存在しません。URLが正しいことを確認してください。')
      return
    } else if (props.noteLoadType.from === 'local') {
      const db = new NotesDB()
      const noteResponse = await db.notes.get(props.noteLoadType.id)
      if (!noteResponse) {
        setLoadError(`ノートID${props.noteLoadType.id}はローカルに存在しませんでした。`)
        return
      }
      await loadFromBlob(new Blob([noteResponse.nnote]))
      save = async () => {
        const data = await saveFromNotes(notes.notes())
        db.notes.update(noteResponse, {
          nnote: new Uint8Array(await data.arrayBuffer()),
          updated: new Date()
        })
      }
    }

    const saveStep = async () => {
      if (!noteBookState.isSaved) {
        await save()
      }
      setNoteBookState('isSaved', true)
      if (!timeoutEnded) {
        setTimeout(saveStep, 1000)
      }
    }
    saveStep()
  })
  const [getLoadError, setLoadError] = createSignal<string>()
  return <div class="bg-background h-[100dvh] touch-manipulation">
    <Show when={getLoadError()}>
      <Dialog onClose={() => setLoadError(void 0)} type="alert" title="Load Error">{ getLoadError() }</Dialog>
    </Show>
    <div class="flex flex-col lg:flex-row lg:max-w-[calc(100dvw-2.5em)]">
      <div class="sticky lg:fixed top-0 z-30">
        <Header />
      </div>
      <div class="w-10 hidden lg:block flex-shrink-0">

      </div>
      <div class="px-2 w-full pb-5">
        {
          notes.notes().length === 0 ?
            <div class="text-center my-2">
              <div>
                <p class="text-xl">ここにはノートが一つもありません :(</p>
                <p>右下の<span class="text-2xl">+</span>を押して、ノートを追加しましょう!</p>
              </div>
            </div> : <Notes notes={notes.notes()} setNotes={notes.setNotes}/>
        }
      </div>
    </div>
    <Fab
      onAddTextNote={() => {
        notes.setNotes([
          ...notes.notes(),
          createTextNote()
        ])
      }}
      onAddImageNote={() => {
        notes.setNotes([
          ...notes.notes(),
          createImageNote()
        ])
      }}
    />
    <Menu />
  </div>
}