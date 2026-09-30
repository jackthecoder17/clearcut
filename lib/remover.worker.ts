/// <reference lib="webworker" />
// Runs the background-removal model off the main thread so the page stays responsive.
import { env, pipeline, RawImage, type ProgressInfo } from "@huggingface/transformers"

import { MODELS, type ModelKey, type WorkerRequest, type WorkerResponse } from "@/lib/remover-types"

env.allowLocalModels = false

const post = (msg: WorkerResponse, transfer: Transferable[] = []) => self.postMessage(msg, transfer)

type Device = "webgpu" | "wasm"
type Dtype = "fp16" | "fp32" | "q8"
type Option = { model: ModelKey; device: Device; dtype: Dtype }
type Remover = Option & { run: (image: RawImage) => Promise<RawImage> }

let remover: Promise<Remover> | null = null

// BiRefNet's largest WebGPU shaders bind 11 storage buffers; GPUs that allow fewer can load it but not run it.
const MIN_STORAGE_BUFFERS = 11

// BiRefNet works at 1024×1024 and runs out of WebAssembly memory on the CPU, so the CPU path uses the lighter ormbg.
const CPU: Option = { model: "ormbg", device: "wasm", dtype: "q8" }

type Adapter = { features: Set<string>; limits: { maxStorageBuffersPerShaderStage: number } }

async function gpuOption(): Promise<Option | null> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu
  const adapter = await gpu?.requestAdapter().catch(() => null)
  if (!adapter) return null
  if (adapter.limits.maxStorageBuffersPerShaderStage < MIN_STORAGE_BUFFERS) {
    console.info(`WebGPU skipped: GPU allows ${adapter.limits.maxStorageBuffersPerShaderStage} storage buffers per shader`)
    return null
  }
  return { model: "birefnet", device: "webgpu", dtype: adapter.features.has("shader-f16") ? "fp16" : "fp32" }
}

function onProgress(p: ProgressInfo) {
  if (p.status === "progress_total") post({ type: "progress", progress: p.progress, loaded: p.loaded, total: p.total })
}

async function create(option: Option): Promise<Remover> {
  const { model, device, dtype } = option
  post({ type: "loading", device, model })
  const pipe = await pipeline("background-removal", MODELS[model].id, { device, dtype, progress_callback: onProgress })
  post({ type: "ready", device, model })
  return { ...option, run: (image) => pipe(image) as Promise<RawImage> }
}

function load() {
  remover ??= (async () => {
    const gpu = await gpuOption()
    if (!gpu) return create(CPU)
    try {
      return await create(gpu)
    } catch (err) {
      console.warn("WebGPU failed to start, using the CPU model", err)
      return create(CPU)
    }
  })().catch((err) => {
    remover = null
    throw err
  })
  return remover
}

/** Returns the cutout and how long inference took, not counting the one-time model download and startup. */
async function removeBackground(input: RawImage): Promise<{ out: RawImage; ms: number }> {
  const current = await load()
  let started = performance.now()
  try {
    return { out: await current.run(input), ms: performance.now() - started }
  } catch (err) {
    // Some GPUs load the model but can't run it; fall back to the CPU model and retry once.
    if (current.device !== "webgpu") throw err
    console.warn("WebGPU run failed, using the CPU model", err)
    remover = create(CPU)
    const cpu = await remover
    started = performance.now()
    return { out: await cpu.run(input), ms: performance.now() - started }
  }
}

// Process one image at a time; model sessions don't like concurrent runs.
let queue: Promise<unknown> = Promise.resolve()

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.type === "load") {
    load().catch((err) => post({ type: "error", message: String(err?.message ?? err) }))
    return
  }

  queue = queue.then(async () => {
    try {
      const input = await RawImage.fromBlob(msg.file)
      const result = await removeBackground(input)
      const out = result.out.rgba()
      post(
        { type: "result", id: msg.id, width: out.width, height: out.height, data: out.data as Uint8ClampedArray, ms: result.ms },
        [out.data.buffer as ArrayBuffer]
      )
    } catch (err) {
      post({ type: "failed", id: msg.id, message: String((err as Error)?.message ?? err) })
    }
  })
}
