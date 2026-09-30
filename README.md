# Clearcut

**Remove image backgrounds right in your browser. Free, private, no uploads.**

Drop in a photo and get a clean cutout in seconds. An open-source AI model runs on your own device, so your images never leave your computer. No sign-up, no watermark, no limits.

**▶ Try it:** https://clearcut.vercel.app _(link updated after the first deploy)_

Built with **Next.js**, **shadcn/ui** and **[Transformers.js](https://github.com/huggingface/transformers.js)**.

---

## Features

- **Private by design:** the model runs in a Web Worker in your browser. Nothing is uploaded.
- **Drag and drop, paste, or pick files,** and process as many images as you like in a queue.
- **Before/after slider** to check the edges.
- **Swap the background:** transparent, a solid colour (presets or any custom colour), or a blurred version of the original photo for a portrait-mode look.
- **Full-resolution PNG download,** one at a time or all at once.
- **Works offline after the first visit:** the model is cached by the browser.
- **Uses your GPU when it can** (WebGPU) and falls back to the CPU (WebAssembly) when it can't.
- Light and dark mode.

## How it works

1. **Picking a model.** When the first image arrives, a Web Worker checks the GPU.
   - If WebGPU is available and the GPU allows enough storage buffers per shader, it loads **[BiRefNet lite](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX)** (MIT, 115 MB in fp16), which gives the best edges.
   - Otherwise it loads **[ormbg](https://huggingface.co/onnx-community/ormbg-ONNX)** (Apache-2.0, 44 MB quantized) on the CPU. BiRefNet works at 1024×1024 and runs out of WebAssembly memory on the CPU, so the lighter model is used there.
   - If the GPU loads the model but then fails to run it, the worker switches to the CPU model and retries automatically.
2. **Removing the background.** Transformers.js runs the `background-removal` pipeline, which predicts an alpha mask and applies it to the original image at full resolution.
3. **Compositing.** The main thread draws the cutout over the chosen background on a canvas, which is used for both the preview and the download.

Images are processed one at a time so the model session is never shared between runs.

## Tech stack

| | |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| UI | [shadcn/ui](https://ui.shadcn.com) on Base UI: Button, Card, Toggle Group, Slider, Progress, Badge, Tooltip, Sonner |
| AI | [Transformers.js](https://github.com/huggingface/transformers.js) + ONNX Runtime Web (WebGPU / WebAssembly) |
| Models | BiRefNet lite (MIT), ormbg (Apache-2.0) |
| Styling | Tailwind CSS v4 |

## Project structure

```
app/
  layout.tsx              fonts, theme provider, toaster
  page.tsx                renders <ClearcutApp />
components/
  clearcut-app.tsx        upload, image list, background options, downloads
  compare-view.tsx        before/after slider
  model-status.tsx        download progress and GPU/CPU badge
  ui/                     shadcn/ui components
lib/
  remover.worker.ts       loads and runs the model off the main thread
  use-remover.ts          React hook around the worker and image queue
  compose.ts              draws the cutout over a background, exports PNGs
  remover-types.ts        shared types and the model list
```

## Run it locally

```bash
git clone https://github.com/jackthecoder17/clearcut.git
cd clearcut
npm install
npm run dev
```

Open http://localhost:3000. The first image triggers a one-time model download.

## Deploy

Import the repo at [vercel.com/new](https://vercel.com/new). No settings or environment variables are needed.

## License

MIT for this code. The models keep their own licenses: BiRefNet lite is MIT and ormbg is Apache-2.0.
