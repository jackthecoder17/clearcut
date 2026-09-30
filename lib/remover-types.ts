export const MODELS = {
  birefnet: { id: "onnx-community/BiRefNet_lite-ONNX", name: "BiRefNet lite", license: "MIT" },
  ormbg: { id: "onnx-community/ormbg-ONNX", name: "ormbg", license: "Apache-2.0" },
} as const

export type ModelKey = keyof typeof MODELS

export type WorkerRequest = { type: "load" } | { type: "remove"; id: string; file: Blob }

export type WorkerResponse =
  | { type: "loading"; device: "webgpu" | "wasm"; model: ModelKey }
  | { type: "progress"; progress: number; loaded: number; total: number }
  | { type: "ready"; device: "webgpu" | "wasm"; model: ModelKey }
  | { type: "error"; message: string }
  | { type: "result"; id: string; width: number; height: number; data: Uint8ClampedArray; ms: number }
  | { type: "failed"; id: string; message: string }

export type ModelState =
  | { status: "idle" }
  | { status: "loading"; device?: "webgpu" | "wasm"; model?: ModelKey; progress: number; loaded: number; total: number }
  | { status: "ready"; device: "webgpu" | "wasm"; model: ModelKey }
  | { status: "error"; message: string }

export type ImageItem = {
  id: string
  name: string
  file: Blob
  originalUrl: string
  status: "queued" | "processing" | "done" | "error"
  cutout?: ImageData
  ms?: number
  error?: string
}

export type Background =
  | { kind: "transparent" }
  | { kind: "color"; color: string }
  | { kind: "blur"; amount: number }
