import { Key } from '@solid-primitives/keyed'
import {
  type Accessor,
  type JSX,
  type Setter,
  Show,
  createEffect,
  createSignal,
  onMount,
} from 'solid-js'
import { moveArray } from '../utils/array/moveArray'

import { icon } from '../../../utils/icons'
import { noteBookState, notes, setNoteBookState } from '../store'
import type { Note } from './notes-utils'
import { Dialog } from './utils/Dialog'

export default (props: {
  notes: Note[]
  setNotes: Setter<Note[]>
  scrollParent: HTMLDivElement
}) => {
  const [getFocusedIndex, setFocusedIndex] = createSignal(0)
  const [getIndexToRemove, setIndexToRemove] = createSignal<null | number>(null)

  const handleUpdate = () => {
    setNoteBookState('isSaved', false)
  }
  createEffect(() => {
    notes.notes
    handleUpdate()
  })

  const getNoteRect: Record<string, () => DOMRect> = {}

  const [getDraggedNoteIndex, setDraggedNoteIndex] = createSignal<
    number | null
  >(null)
  const [getDraggedNoteYPosition, setDraggedNoteYPosition] = createSignal<
    number | null
  >(null)
  const [getDragTarget, setDragTarget] = createSignal<number | null>(null)
  const [getIsDragUp, setIsDragUp] = createSignal(false)

  return (
    <div class="flex flex-col gap-2 my-2">
      <Show when={getIndexToRemove() !== null}>
        <Dialog
          type="confirm"
          onClose={(result) => {
            const indexToRemove = getIndexToRemove()
            setIndexToRemove(null)
            if (!result) {
              return
            }
            if (indexToRemove === null) {
              return
            }
            const newNotes = [...props.notes]
            newNotes.splice(indexToRemove, 1)
            props.setNotes(newNotes)
            setIndexToRemove(null)
          }}
          title="ノートを削除しますか？"
        >
          削除すると、もとに戻せない可能性があります。
        </Dialog>
      </Show>
      <Key each={props.notes} by={(note) => note.noteData.id}>
        {(note, index) => {
          const nowNote = note()
          const NoteComponent = nowNote.Component
          createEffect(() => {
            nowNote.noteData
            handleUpdate()
          })
          const noteElement = (
            <div
              class="border p-1 grow"
              onPointerDown={() => {
                setFocusedIndex(index())
              }}
            >
              <NoteComponent
                noteData={note().noteData}
                setNoteData={note().setNoteData}
                focus={() => {
                  setFocusedIndex(index())
                }}
                updated={handleUpdate}
                index={index()}
                notes={props.notes}
                focusedIndex={getFocusedIndex()}
              />
            </div>
          )
          let notePosition!: HTMLDivElement
          let noteElem!: HTMLDivElement

          let downedPointerId: number | null = null
          const getRectCenterY = (rect: DOMRect) => rect.top + rect.height / 2
          const calcTarget = () => {
            const thisNoteRect = notePosition.getBoundingClientRect()
            const draggingRect = noteElem.getBoundingClientRect()

            const isUP = thisNoteRect.top > draggingRect.top
            setIsDragUp(isUP)

            const noteRects: DOMRect[] = []
            for (const {
              noteData: { id },
            } of props.notes) {
              noteRects.push(getNoteRect[id]!())
            }
            if (isUP) {
              for (let i = 0; i < index(); i++) {
                const rect = noteRects[i]!
                if (getRectCenterY(draggingRect) < getRectCenterY(rect)) {
                  setDragTarget(i)
                  return
                }
              }
            } else {
              for (let i = noteRects.length - 1; i > index(); i--) {
                const rect = noteRects[i]!
                if (getRectCenterY(draggingRect) > getRectCenterY(rect)) {
                  return setDragTarget(i)
                }
              }
            }
            setDragTarget(index())
          }
          onMount(() => {
            getNoteRect[note().noteData.id] = () =>
              noteElem.getBoundingClientRect()
          })
          const [getDraggable] = createSignal<JSX.Element | null>(
            <div class="h-24 bg-blue-300" />,
          )

          let scrollIntervalId: number | null = null
          let lastPointerEvent: PointerEvent | null = null
          return (
            <>
              <Show when={index() === getDragTarget() && getIsDragUp()}>
                {getDraggable()}
              </Show>
              <div ref={notePosition} />
              <div
                class="flex flex-col"
                ref={noteElem}
                classList={{
                  fixed: getDraggedNoteIndex() === index(),
                }}
                style={{
                  ...(getDraggedNoteIndex() === index()
                    ? {
                        top: `${getDraggedNoteYPosition()}px`,
                      }
                    : {}),
                }}
              >
                <Show
                  when={
                    noteBookState.isEditMode && getFocusedIndex() === index()
                  }
                >
                  <div class="flex gap-1">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        if (downedPointerId) {
                          return
                        }
                        downedPointerId = e.pointerId
                        scrollIntervalId = window.setInterval(() => {
                          if (!lastPointerEvent) {
                            return
                          }
                          const vy =
                            lastPointerEvent.clientY < 50
                              ? -1
                              : window.innerHeight - lastPointerEvent.clientY <
                                  50
                                ? 1
                                : 0
                          if (vy === 0) {
                            return
                          }
                          props.scrollParent.scrollBy({
                            top: 100 * vy,
                            //behavior: 'smooth'
                          })
                        }, 100)
                        setDragTarget(index())
                        setDraggedNoteYPosition(e.clientY)
                        setDraggedNoteIndex(index())
                        calcTarget()
                      }}
                      onPointerMove={(e) => {
                        if (downedPointerId === e.pointerId) {
                          lastPointerEvent = e
                          const target = e.currentTarget as HTMLButtonElement
                          target.setPointerCapture(e.pointerId)
                          setDraggedNoteYPosition(e.clientY)
                          calcTarget()
                        }
                      }}
                      onPointerUp={() => {
                        clearInterval(scrollIntervalId ?? void 0)
                        props.setNotes(
                          moveArray(props.notes, index(), getDragTarget() ?? 0),
                        )
                        setFocusedIndex(getDragTarget() ?? 0)
                        downedPointerId = null
                        setDraggedNoteIndex(null)
                        setDraggedNoteYPosition(null)
                        setDragTarget(null)
                      }}
                      class="touch-none w-8 h-8 text-gray-400"
                      innerHTML={icon('gripHorizontal')}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIndexToRemove(index())
                      }}
                      class="touch-none w-8 h-8"
                      innerHTML={icon('x')}
                    />
                  </div>
                </Show>
                {noteElement}
              </div>
              <Show when={index() === getDragTarget() && !getIsDragUp()}>
                {getDraggable()}
              </Show>
            </>
          )
        }}
      </Key>
    </div>
  )
}
