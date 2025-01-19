import { App } from 'astro/app'
// @ts-check
import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'

export function createExports(manifest: import('astro').SSRManifest) {
  const app = new App(manifest)

  const honoApp = new Hono()

  honoApp.use(basicAuth({ verifyUser: (username, password, c) => true }))

  honoApp.all('/*', async (c) => {
    const res = await app.render(c.req.raw)
    return res
  })
  return {
    fetch: honoApp.fetch,
  }
}
