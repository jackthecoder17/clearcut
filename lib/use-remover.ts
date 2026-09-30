"use client"

import * as React from "react"

import type { ImageItem, ModelState, WorkerRequest, WorkerResponse } from "@/lib/remover-types"

let counter = 0
const nextId = () => `img-${Date.now().toString(36)}-${counter++}`

export function useRemover() {
  const workerRef = React.useRef<Worker | null>(null)
  const [model, setModel] = React.useState<ModelState>({ status: "idle" })
  const [items, setItems] = React.useState<ImageItem[]>([])

  const patch = React.useCallback((id: string, update: Partial<ImageItem>) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...update } : it)))
  }, [])

  const getWorker = React.useCallback(() => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL("./remover.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      switch (msg.type) {
        case "loading":
          setModel((m) => ({
            status: "loading",
            device: msg.device,
            model: msg.model,
            progress: m.status === "loading" ? m.progress : 0,
            loaded: m.status === "loading" ? m.loaded : 0,
            total: m.status === "loading" ? m.total : 0,
          }))
          break
        case "progress":
          setModel((m) => ({ ...(m.status === "loading" ? m : { status: "loading" as const }), progress: msg.progress, loaded: msg.loaded, total: msg.total }))
          break
        case "ready":
          setModel({ status: "ready", device: msg.device, model: msg.model })
          break
        case "error":
          setModel({ status: "error", message: msg.message })
          setItems((list) => list.map((it) => (it.status === "done" ? it : { ...it, status: "error", error: msg.message })))
          break
        case "result":
          patch(msg.id, {
            status: "done",
            cutout: new ImageData(new Uint8ClampedArray(msg.data), msg.width, msg.height),
            ms: msg.ms,
          })
          break
        case "failed":
          patch(msg.id, { status: "error", error: msg.message })
          break
      }
    }
    workerRef.current = worker
    return worker
  }, [patch])

  React.useEffect(() => () => workerRef.current?.terminate(), [])

  const send = React.useCallback((msg: WorkerRequest) => getWorker().postMessage(msg), [getWorker])

  const add = React.useCallback(
    (files: { file: Blob; name: string }[]) => {
      const images = files.filter((f) => f.file.type.startsWith("image/"))
      if (!images.length) return []
      setModel((m) => (m.status === "idle" || m.status === "error" ? { status: "loading", progress: 0, loaded: 0, total: 0 } : m))
      const created: ImageItem[] = images.map(({ file, name }) => ({
        id: nextId(),
        name,
        file,
        originalUrl: URL.createObjectURL(file),
        status: "queued",
      }))
      setItems((list) => [...list, ...created])
      for (const it of created) send({ type: "remove", id: it.id, file: it.file })
      return created
    },
    [send]
  )

  const retry = React.useCallback(
    (id: string) => {
      const it = items.find((i) => i.id === id)
      if (!it) return
      patch(id, { status: "queued", error: undefined })
      send({ type: "remove", id, file: it.file })
    },
    [items, patch, send]
  )

  const remove = React.useCallback((id: string) => {
    setItems((list) => {
      const it = list.find((i) => i.id === id)
      if (it) URL.revokeObjectURL(it.originalUrl)
      return list.filter((i) => i.id !== id)
    })
  }, [])

  // Show the first unfinished image as "processing" so the list reflects the worker's queue.
  const displayItems = React.useMemo(() => {
    const active = model.status === "ready" ? items.findIndex((it) => it.status === "queued") : -1
    return items.map((it, i) => (i === active ? { ...it, status: "processing" as const } : it))
  }, [items, model.status])

  return { model, items: displayItems, add, retry, remove }
}
