/** @jsxImportSource @builder.io/qwik */
import { component$, useTask$, useVisibleTask$ } from '@builder.io/qwik'
import { NotesDB } from '../note/notes-schema';

export const Download = component$<{ url: string }>((props) => {
    useVisibleTask$(() => {
        const db = new NotesDB()
        ;(async () => {
            const res = await fetch(props.url).catch(error => {
                alert('読み込みに失敗しました')
            })
            if (!res) {
                return
            }
            const buff = new Uint8Array(await res.arrayBuffer())
            const added = await db.notes.add({
                name: props.url,
                nnote: buff,
                updated: new Date()
            })
            location.href = `/app/notes/local-${added}`
        })()
    })
    return <div>
        aa
    </div>
})