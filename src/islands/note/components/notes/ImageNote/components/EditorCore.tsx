import { Show, createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import Sheet, { type Sheets } from './Sheet'

import { icon } from '../../../../../../utils/icons'
import { Dialog } from '../../../utils/Dialog'
import { Spinner } from '../../../utils/Spinner'
import { getGemini } from '../../../../../shared/gemini'

export interface Props {
  scanedImage?: Blob | undefined

  changeSheets(sheets: Sheets): void

  sheets?: Sheets

  rescan(): void
}

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
}

export default (props: Props) => {
  const [editMode, setEditMode] = createSignal<'move' | 'paint' | 'clear'>(
    'move',
  )

  const [imageUrl, setImageUrl] = createSignal<string>()
  const [imageSize, setImageSize] = createSignal<{
    w: number
    h: number
  }>({
    w: 0,
    h: 0,
  })
  const [sheets, setSheets] = createSignal<Sheets>(props.sheets ?? [])
  const [tmpSheet, setTmpSheet] = createSignal<
    | {
        sheet: Sheets[number]
        pointerId: number
      }
    | number
  >()

  createEffect(() => {
    props.changeSheets(sheets())
  })
  createEffect(() => {
    if (!props.scanedImage) {
      return
    }
    const blobImageUrl = URL.createObjectURL(props.scanedImage)
    const image = new Image()
    image.onload = () => {
      setImageSize({
        w: image.width,
        h: image.height,
      })
    }
    image.src = blobImageUrl
    setImageUrl(blobImageUrl)
  })
  const [editorPosition, setEditorPosition] = createSignal({
    x: 0,
    y: 0,
    size: 1,
  })

  let editorContainer!: HTMLDivElement
  const [editorContainerRect, setEditorContainerRect] = createSignal<DOMRect>(
    new DOMRect(),
  )
  onMount(() => {
    const observer = new ResizeObserver(() => {
      setEditorContainerRect(editorContainer.getBoundingClientRect())
    })
    observer.observe(editorContainer)
    setTimeout(() => {
      setEditorContainerRect(editorContainer.getBoundingClientRect())
    }, 500)
  })

  const getPositionByImage = (evt: MouseEvent) => {
    const pointerXByEditor = evt.clientX - editorContainerRect().left
    const pointerYByEditor = evt.clientY - editorContainerRect().top

    const positionX =
      (pointerXByEditor - editorPosition().x) / editorPosition().size
    const positionY =
      (pointerYByEditor - editorPosition().y) / editorPosition().size
    return [Math.floor(positionX), Math.floor(positionY)]
  }
  const pointersData: Record<
    string,
    | {
        isDowned: boolean
        last: PointerEvent
      }
    | undefined
  > = {}
  const pointerDown = (evt: PointerEvent) => {
    evt.preventDefault()
    pointersData[evt.pointerId] = {
      isDowned: true,
      last: evt,
    }
    const currentEditMode = editMode()
    if (currentEditMode === 'paint') {
      const [positionX, positionY] = getPositionByImage(evt)
      const lastTmpSheet = tmpSheet()
      if (typeof lastTmpSheet !== 'number' && lastTmpSheet) {
        return
      }
      setTmpSheet({
        pointerId: evt.pointerId,
        sheet: {
          positions: [],
          startPosition: {
            x: positionX ?? 0,
            y: positionY ?? 0,
          },
          weight: 30 / editorPosition().size,
        },
      })
    }
  }
  const scaleDatas: {
    baseDistance: null | number
    lastDistance: number | null
    baseScale: number
    preview(): void
    end(): void
  } = {
    baseDistance: null,
    lastDistance: null,
    baseScale: 1,
    preview() {
      setEditorPosition((prev) => ({
        ...prev,
        size:
          (this.baseScale * (this.lastDistance ?? 1)) /
          (this.baseDistance ?? 1),
      }))
    },
    end() {
      this.baseScale *= (this.lastDistance ?? 1) / (this.baseDistance ?? 1)
      this.lastDistance = null
      this.baseDistance = null
      setEditorPosition((prev) => ({
        ...prev,
        size: this.baseScale,
      }))
    },
  }
  const pointerMove = (evt: PointerEvent) => {
    evt.preventDefault()
    if (!(evt.pointerId in pointersData)) {
      pointersData[evt.pointerId] = {
        isDowned: false,
        last: evt,
      }
    }
    const thisPointer = pointersData[evt.pointerId]!
    const currentEditMode = editMode()
    if (currentEditMode === 'move') {
      if (Object.values(pointersData).filter((e) => e?.isDowned).length === 1) {
        // タッチしているポインターが一つ
        if (pointersData[evt.pointerId]?.isDowned) {
          const movementX = evt.screenX - thisPointer.last.screenX
          const movementY = evt.screenY - thisPointer.last.screenY
          // そのポインターが押されている
          setEditorPosition({
            x: editorPosition().x + movementX,
            y: editorPosition().y + movementY,
            size: editorPosition().size,
          })
          scaleDatas.end()
        }
      } else if (
        Object.values(pointersData).filter((e) => e?.isDowned).length >= 2
      ) {
        // タッチしているポインターが2つ以上
        const downedPointers = Object.values(pointersData).filter(
          (e) => e?.isDowned,
        )
        const p0 = downedPointers[0]!
        const p1 = downedPointers[1]!

        const pinchDistance = Math.sqrt(
          (p0.last.screenX - p1.last.screenX) ** 2 +
            (p0.last.screenY - p1.last.screenY) ** 2,
        ) // ピタゴラスに感謝

        if (!scaleDatas.baseDistance) {
          scaleDatas.baseDistance = pinchDistance
        }
        scaleDatas.lastDistance = pinchDistance
        scaleDatas.preview()
      }
    } else if (currentEditMode === 'paint') {
      const nowPointerData = pointersData[evt.pointerId]
      if (nowPointerData?.isDowned) {
        const [positionX, positionY] = getPositionByImage(evt)
        const lastTmpSheet = tmpSheet()
        if (typeof lastTmpSheet === 'number') {
          return
        }
        if (lastTmpSheet?.pointerId !== evt.pointerId) {
          return
        }
        setTmpSheet({
          pointerId: evt.pointerId,
          sheet: {
            ...lastTmpSheet.sheet,
            positions: [
              ...lastTmpSheet.sheet.positions,
              {
                x: positionX ?? 0,
                y: positionY ?? 0,
              },
            ],
          },
        })
      }
    }
    thisPointer.last = evt
  }
  const pointerUp = (evt: PointerEvent) => {
    evt.preventDefault()
    delete pointersData[evt.pointerId]
    scaleDatas.end()
    const nowTmpSheet = tmpSheet()
    if (typeof nowTmpSheet === 'number') {
      return
    }
    if (nowTmpSheet?.pointerId === evt.pointerId) {
      setSheets([...sheets(), nowTmpSheet?.sheet])
      setTmpSheet()
    }
  }
  const onWheel = (evt: WheelEvent) => {
    const lastEditorPosition = editorPosition()
    scaleDatas.baseScale *= evt.deltaY > 0 ? 0.9 : 1.1
    scaleDatas.end()
    /*setEditorPosition({
      ...lastEditorPosition,
      size: lastEditorPosition.size * (evt.deltaY > 0 ? 0.9 : 1.1),
    })*/
  }
  const sheetClicked = (sheetIndex: number) => {
    if (editMode() === 'clear') {
      setSheets(sheets => {
        const newSheets = [...sheets]
        newSheets.splice(sheetIndex, 1)
        return newSheets
      })
      setTmpSheet(Math.random())
    }
  }
  const [getRescanConfirm, setRescanConfirm] = createSignal(false)

  let forGetTouchRef!: HTMLDivElement

  onMount(() => {
    document.addEventListener('pointerdown', pointerDown)
    document.addEventListener('pointermove', pointerMove)
    document.addEventListener('pointerup', pointerUp)
    document.addEventListener('pointercancel', pointerUp)
    document.addEventListener('wheel', onWheel)
  })
  onCleanup(() => {
    document.removeEventListener('pointerdown', pointerDown)
    document.removeEventListener('pointermove', pointerMove)
    document.removeEventListener('pointerup', pointerUp)
    document.removeEventListener('pointercancel', pointerUp)
    document.removeEventListener('wheel', onWheel)
  })

  const [getIsOCRIng, setIsOCRIng] = createSignal(false)
  const ocr = async () => {
    setIsOCRIng(true)

    const imageType = IMAGE_TYPES[props.scanedImage!.type]
    if (!imageType) {
      alert('このファイル形式はサポートされていません')
      setIsOCRIng(false)
      return
    }
    let ocrResult:
      | {
          success: true
          text: string
          lines: {
            /** Text in the line */
            text: string
            tokens: {
              text: string
              boundingBox: {
                top: number
                left: number
                right: number
                bottom: number
                width: number
                height: number
              }
            }[]
          }[]
        }
      | {
          success: false
          error: string
        }
    try {
      ocrResult = await fetch(
        `https://ocr.evex.land?lang=ja&fileType=${imageType}`,
        {
          method: 'POST',
          body: props.scanedImage!!,
        },
      ).then((res) => res.json())
      if (!ocrResult.success) {
        alert(`OCRエラーが発生しました: ${ocrResult.error}`)
        setIsOCRIng(false)
        return
      }
    } catch {
      alert('OCR エラーが発生しました。時間をおいて試してください。')
      setIsOCRIng(false)
      return
    }

    const gemini = getGemini()

    let importants: string[]
    try {
      const generated = await gemini
        .getGenerativeModel({
          model: 'gemini-1.5-pro',
          generationConfig: {
            responseMimeType: 'application/json',
          },
          systemInstruction: {
            role: 'model',
            parts: [
              {
                text: '渡されたテキストから、重要な単語をそのまま書き出し、結果を\n{ "words": ["重要単語", "重要単語2"] }\nの配列形式で返しなさい。',
              },
            ],
          },
        })
        .startChat()
        .sendMessage(ocrResult.text)
      const parsed = JSON.parse(generated.response.text()).words
      if (!Array.isArray(parsed)) {
        throw new Error('This is not array')
      }
      importants = parsed.filter(word => typeof word === 'string')
    } catch {
      alert('生成にエラーが発生しました。時間をおいて試してください。')
      setIsOCRIng(false)
      return
    }

    const covers: {
      top: number
      left: number
      width: number
      height: number
    }[][] = []
    for (const line of ocrResult.lines) {
      const tokenLength = line.tokens.length
      for (let offset = 0; offset < tokenLength; offset ++) {
        let text = ''
        for (let i = offset; i < tokenLength; i++) {
          text += line.tokens[i]!.text
          for (const important of importants) {
            if (text !== important) {
              continue
            }
            covers.push(line.tokens.slice(Math.max(0, offset), i + 1).map(a => a.boundingBox))
          }
        }
      }
    }
    const newSheets: Sheets = covers.map((covers): Sheets[number] => {
      const maxHeight = covers.reduce((a, b) => Math.max(a, b.height), 0) * 1.5
      const positions = covers.map(bb => ({x: bb.left + bb.width / 2, y: bb.top + bb.height / 2}))

      const startPosition = {
        x: covers[0]!.left - covers[0]!.width,
        y: covers[0]!.top + covers[0]!.height / 2
      }
      const endPosition = {
        x: covers.at(-1)!.left + covers.at(-1)!.width,
        y: covers.at(-1)!.top + covers.at(-1)!.height / 2
      }
      return {
        weight: maxHeight,
        startPosition,
        positions: [startPosition, ...positions, endPosition]
      }
    })
    setSheets(sheets => [...sheets, ...newSheets])
    setIsOCRIng(false)
  }
  return (
    <div>
      <Show when={getIsOCRIng()}>
        <div class="fixed top-0 left-0 w-full h-dvh bg-[#000a] z-50 grid place-items-center">
          <div class="flex items-center">
            <Spinner />
            <div class="text-white">処理中...</div>
          </div>
        </div>
      </Show>
      <Show when={getRescanConfirm()}>
        <Dialog
          type="confirm"
          onClose={(ok) => {
            if (ok) {
              props.rescan()
            }
            setRescanConfirm(false)
          }}
          title="Confirm"
        >
          本当に再スキャンしますか？このデータは失われます。
        </Dialog>
      </Show>
      <div class="w-full h-[calc(100dvh-200px)]">
        <div
          class="bg-black w-full h-full overflow-hidden"
          classList={{
            'touch-none': editMode() !== 'clear',
          }}
          ref={editorContainer}
        >
          <div
            class="relative"
            style={{
              width: `${imageSize().w}px`,
              height: `${imageSize().h}px`,
            }}
            ref={forGetTouchRef}
          >
            <div
              class="origin-top-left"
              style={{
                transform: `translateX(${editorPosition().x + Math.random()}px) translateY(${
                  editorPosition().y
                }px) scale(${editorPosition().size})`,
              }}
            >
              <div class="absolute top-0 left-0">
                <img
                  class="pointer-events-none select-none"
                  src={imageUrl()}
                  alt="Scaned"
                />
              </div>
              <div class="absolute top-0 left-0 w-full h-full">
                <Sheet
                  isPlayMode={false}
                  sheets={[
                    ...sheets(),
                    ...(() => {
                      const nowTmpSheet = tmpSheet()
                      return nowTmpSheet && typeof nowTmpSheet !== 'number'
                        ? [nowTmpSheet.sheet]
                        : []
                    })(),
                  ]}
                  onClickSheet={sheetClicked}
                  width={imageSize().w}
                  height={imageSize().h}
                />
              </div>
            </div>
            <div
              class="absolute top-0 left-0"
              classList={{
                hidden: editMode() === 'clear',
              }}
              style={{
                width: `${editorContainerRect().width}px`,
                height: `${editorContainerRect().height}px`,
              }}
            />
          </div>
        </div>
      </div>
      <div class="flex my-2 justify-center gap-5">
        <div class="flex gap-2">
          <button
            class="grid hover:drop-shadow drop-shadow-none disabled:drop-shadow-none bg-secondary text-on-secondary disabled:bg-secondary-container disabled:text-on-secondary-container rounded-full p-1 border"
            onClick={() => {
              setEditMode('move')
            }}
            disabled={editMode() === 'move'}
            type="button"
          >
            <div innerHTML={icon('arrowsMove')} class="w-8 h-8" />
          </button>
          <button
            class="grid hover:drop-shadow drop-shadow-none disabled:drop-shadow-none bg-secondary text-on-secondary disabled:bg-secondary-container disabled:text-on-secondary-container rounded-full p-1 border"
            onClick={() => {
              setEditMode('paint')
            }}
            disabled={editMode() === 'paint'}
            type="button"
          >
            <div innerHTML={icon('highlight')} class="w-8 h-8" />
          </button>
          <button
            class="grid hover:drop-shadow drop-shadow-none disabled:drop-shadow-none bg-secondary text-on-secondary disabled:bg-secondary-container disabled:text-on-secondary-container rounded-full p-1 border"
            onClick={() => {
              setEditMode('clear')
            }}
            disabled={editMode() === 'clear'}
            type="button"
          >
            <div innerHTML={icon('eraser')} class="w-8 h-8" />
          </button>
          <button
            class="grid hover:drop-shadow drop-shadow-none disabled:drop-shadow-none bg-secondary text-on-secondary disabled:bg-secondary-container disabled:text-on-secondary-container rounded-full p-1 border"
            onClick={() => {
              ocr()
            }}
            type="button"
          >
            <div innerHTML={icon('sparkles')} class="w-8 h-8" />
          </button>
        </div>
        <div>
          <button
            class="text-button"
            onClick={() => setRescanConfirm(true)}
            type="button"
          >
            ReScan
          </button>
        </div>
      </div>
    </div>
  )
}
