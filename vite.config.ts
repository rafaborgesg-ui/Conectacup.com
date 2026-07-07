import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { pathToFileURL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function sourcingApiDevServer() {
  const routes = new Map([
    ['/api/sourcing/public-event', path.resolve(__dirname, 'api/sourcing/public-event.ts')],
    ['/api/sourcing/respond', path.resolve(__dirname, 'api/sourcing/respond.ts')],
    ['/api/sourcing/send-invite', path.resolve(__dirname, 'api/sourcing/send-invite.ts')],
  ])

  return {
    name: 'sourcing-api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://localhost')
        const routeFile = routes.get(requestUrl.pathname)

        if (!routeFile) {
          next()
          return
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of request) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
          }

          const rawBody = Buffer.concat(chunks).toString('utf8')
          const body = rawBody
            ? (() => {
                try {
                  return JSON.parse(rawBody)
                } catch {
                  return rawBody
                }
              })()
            : undefined

          const handlerModule = await server.ssrLoadModule(`${pathToFileURL(routeFile).href}?t=${Date.now()}`)
          const handler = handlerModule.default

          if (typeof handler !== 'function') {
            throw new Error(`Handler de API inválido para ${requestUrl.pathname}`)
          }

          let statusCode = 200
          let finished = false
          const apiResponse = {
            setHeader(name: string, value: string) {
              response.setHeader(name, value)
              return apiResponse
            },
            status(code: number) {
              statusCode = code
              return apiResponse
            },
            json(payload: unknown) {
              if (finished) return
              finished = true
              response.statusCode = statusCode
              if (!response.hasHeader('Content-Type')) {
                response.setHeader('Content-Type', 'application/json; charset=utf-8')
              }
              response.end(JSON.stringify(payload))
            },
            end(payload?: unknown) {
              if (finished) return
              finished = true
              response.statusCode = statusCode
              response.end(payload == null ? undefined : String(payload))
            },
          }

          await handler({
            method: request.method,
            headers: request.headers,
            query: Object.fromEntries(requestUrl.searchParams.entries()),
            body,
          }, apiResponse)

          if (!finished && !response.writableEnded) {
            response.statusCode = 204
            response.end()
          }
        } catch (error) {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Erro ao executar API local de sourcing.',
          }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }

  return {
    plugins: [
      figmaAssetResolver(),
      sourcingApiDevServer(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/app'),
      },
    },
  }
})
