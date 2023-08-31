import TextNote from "./components/TextNote.tsx"
import {
  IconPlayerPlay,
  IconEdit,
  IconEye,
  IconPlus,
  IconScan,
  IconX,
  IconPencil,
  IconArrowNarrowUp,
  IconArrowNarrowDown,
  IconMenu2,
} from "@tabler/icons-react"
import { useEffect, useState, createContext } from "react"
import classnames from "classnames"
import ScanDialog from "./components/ScanDialog.tsx"
import ImageNote from './components/ImageNote.tsx'
import type { Editor } from "@tiptap/react"
import { arrayMoveImmutable } from 'array-move'

export interface Props {
  
}
export const UserStateContext = createContext<{
  mode: "edit" | "play",
  isView: boolean
}>({
  mode: 'edit',
  isView: true,
})
export const NoteIndexContext = createContext(0)

export default function(props: Props){
  const [mode, setMode] = useState<"edit" | "play">("edit")
  const [isView, setIsView] = useState(false)
  
  const [plusFubActive, setPlusFubActive] = useState(false)
  const [isScanActive, setIsScanActive] = useState(false)

  const [editor, setEditor] = useState<Editor | null>(null)
  
  const [isMenuActive, setIsMenuActive] = useState(false)
  
  const [noteElements, setNoteElements] = useState<{
    element: JSX.Element
    key: any
    data: [any]
  }[]>([])
  
  const createTextNote = (defaultContent: string) => {
    const data = [{}]
    setNoteElements([
      ...noteElements,
      {
        element: <TextNote
          defaultContent={defaultContent}
          setEditorState={(editor) => null}
          data={data}
         />,
         key: Math.random()
      }
    ])
  }
  useEffect(() => {
    createTextNote(`<p>こんにちは！これはNanohaNoteです！</p>
        <p>NanohaNoteは、「じぶん」で作る、学習用ノートブックです！</p>
        <p>暗記をスムーズに行えます。</p>
        <p>例えば、こんなことができちゃいます:</p>
        <p>「Scratchでプログラミングするように、視覚的にプログラミングすることを、<span data-nanohasheet="true">ビジュアルプログラミング</span>という」</p>
        <p>じゃーん。すごいでしょ。<b>こんなふうに太字</b>にしたり、<del>証拠隠滅</del>したりできます。</p>
        <p>さあ、あなたの思いのままのノートにしましょう！この説明を消してもいいですよ〜</p>`)
    console.log(
      "%cここにコピペしろ",
      "font-size: 4em; color: red; font-weight: bold;",
    )
    console.log(
      "%cはすべて詐欺です",
      "font-size: 4em; color: red; font-weight: bold;",
      "\nここは開発者がウェブサイトを詳しく調べる場所です。ここに貼り付けることで、情報が抜き取られたりするかもしれません。"
    )
  }, [])
  return <>
    <div>
      { isScanActive && <ScanDialog onClose={(data) => {
        if (!data.failed) {
          setNoteElements([...noteElements, {
            element: <ImageNote imageBlob={data.imageBlob} paths={data.paths} sheetSvgPaths={data.sheetSvgPaths} />,
            key: Math.random()
          }])
        }
        setIsScanActive(false)
      }} /> }
    </div>
    <button onClick={() => setIsMenuActive(true)}>{ isMenuActive.toString() }</button>
    <div>
      {
        isMenuActive && <div class='w-screen h-screen fixed top-0 bottom-0'>
          <div className='flex'>
            <div>Menu</div>
            <button onClick={setIsMenuActive(true)}>
              <IconX />
            </button>
          </div>
          <div>
            <div className='outlined-button my-2'>保存する</div>
            <div className='outlined-button my-2'>読み込む</div> 


          </div>
        </div>
      }
    </div>
    <div className="bg-background text-on-background min-h-screen">
      <div className="p-4 flex gap-4 flex-col">
          { (noteElements.length === 0) && <div className="text-center">
            <div className="text-2xl">ここにはノートが一つもありません</div>
            <div className="text-xl">右下の+を押して、ノートを追加しましょう!</div>
          </div>}
        
        <UserStateContext.Provider value={{
          mode,
          isView,
        }}>
            {
              noteElements.map((noteElement, index) => {
                return (
                    <div key={noteElement.key} className=''>
                    <div className='text-right'>
                      <button
                        className="p-2 rounded-full border"
                        onClick={() => {
                          setNoteElements(arrayMoveImmutable(noteElements, index, index - 1))
                        }}
                      ><IconArrowNarrowUp /></button>
                      <button
                        className="p-2 rounded-full border"
                        onClick={() => {
                          setNoteElements(arrayMoveImmutable(noteElements, index, index+1))
                        }}
                      ><IconArrowNarrowDown /></button>
                      <button
                        className="p-2 rounded-full border"
                        onClick={() => {
                          if (window.confirm('削除しますか?')){
                            setNoteElements(noteElements.filter((_v, eachIndex) => index !== eachIndex))
                          }
                        }}
                      >
                        <IconX />
                      </button>
                    </div>
                    { noteElement.element }
                  </div>
                  )
              })
            }
        </UserStateContext.Provider>
      </div>
      <div className="h-24" />
      <div className="fixed bottom-0 w-full bg-secondary-container h-24">
        {/* Navbar */}
        <div className="flex gap-4 justify-center items-center m-2">
          <div className="flex justify-center items-center bg-surface text-on-surface rounded-full">
            <button onClick={()=>setMode("edit")} className={classnames("p-4 rounded-full", { "bg-secondary text-on-secondary": mode === "edit" })}>
              <IconEdit />
            </button>
            <button onClick={()=>setMode("play")} className={classnames("p-4 rounded-full", { "bg-secondary text-on-secondary": mode === "play" })}>
              <IconPlayerPlay />
            </button>
          </div>
          <button onClick={() => setIsMenuActive(true)} className="filled-button ">
            <IconMenu2 />
          </button>
        </div>
      </div>
      <div className="fixed bottom-10 right-4">
        {/* 重要ボタンとか言うやつ */}
        { mode === "play" && <div className="flex justify-center items-center gap-2">
          <button className="fab" onClick={()=>setIsView(!isView)}>
            <IconEye />
          </button>
        </div> }

        { mode === "edit" && <>
          <div className="flex justify-center items-center gap-2 flex-col">
            {
              plusFubActive && <>
                <button className="small-fab flex justify-center items-center" onClick={() => setPlusFubActive(false)}>
                  <IconX />
                </button>
                <button className="small-fab flex justify-center items-center" onClick={() => {
                  createTextNote("New Note")
                }}>
                  <IconPencil />
                </button>
                <button className="small-fab flex justify-center items-center" onClick={() => {
                  setIsScanActive(true)
                }}>
                  <IconScan />
                </button>
              </>
            }
            <button className="fab" onClick={() => {
              setPlusFubActive(!plusFubActive)
            }}>
              <IconPlus />
            </button>
          </div>
        </> }
      </div>
    </div>
  </>
}
