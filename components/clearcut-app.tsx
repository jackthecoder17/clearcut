"use client"

import * as React from "react"
import {
  CheckIcon,
  DownloadIcon,
  ImageUpIcon,
  Loader2Icon,
  PlusIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { composeBlob, downloadBlob, outputName } from "@/lib/compose"
import type { Background, ImageItem } from "@/lib/remover-types"
import { useRemover } from "@/lib/use-remover"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CompareView } from "@/components/compare-view"
import { ModelStatus } from "@/components/model-status"
import { ThemeToggle } from "@/components/theme-toggle"

const SAMPLE_BASE = "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main"
const SAMPLES = [
  { file: "portrait-of-woman_small.jpg", label: "Portrait" },
  { file: "tiger.jpg", label: "Tiger" },
  { file: "astronaut.png", label: "Astronaut" },
  { file: "beetle.png", label: "Car" },
]

const COLORS = ["#ffffff", "#111111", "#f4efe6", "#ffd8e1", "#cfe6ff", "#d6f5e2"]

const GITHUB_URL = "https://github.com/jackthecoder17/clearcut"

function filesFrom(list: FileList | File[] | null | undefined) {
  return Array.from(list ?? []).map((file) => ({ file, name: file.name || "pasted-image.png" }))
}

export function ClearcutApp() {
  const { model, items, add, retry, remove } = useRemover()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [bgKind, setBgKind] = React.useState<Background["kind"]>("transparent")
  const [color, setColor] = React.useState("#ffffff")
  const [blur, setBlur] = React.useState(12)
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const background = React.useMemo<Background>(
    () => (bgKind === "color" ? { kind: "color", color } : bgKind === "blur" ? { kind: "blur", amount: blur } : { kind: "transparent" }),
    [bgKind, color, blur]
  )

  const selected = items.find((i) => i.id === selectedId) ?? items[items.length - 1] ?? null
  const doneItems = items.filter((i) => i.status === "done")

  const addFiles = React.useCallback(
    (files: { file: Blob; name: string }[]) => {
      const created = add(files)
      if (created.length) setSelectedId(created[0].id)
      else if (files.length) toast.error("That file isn't an image. Try a JPG, PNG or WebP.")
    },
    [add]
  )

  // Paste an image from anywhere on the page, and drop files anywhere on the window.
  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = filesFrom(e.clipboardData?.files)
      if (files.length) addFiles(files)
    }
    let depth = 0
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return
      depth++
      setDragging(true)
    }
    const onLeave = () => {
      depth = Math.max(0, depth - 1)
      if (!depth) setDragging(false)
    }
    const onOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      depth = 0
      setDragging(false)
      addFiles(filesFrom(e.dataTransfer?.files))
    }
    window.addEventListener("paste", onPaste)
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("dragover", onOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("paste", onPaste)
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [addFiles])

  async function trySample(file: string) {
    try {
      const res = await fetch(`${SAMPLE_BASE}/${file}`)
      if (!res.ok) throw new Error(String(res.status))
      addFiles([{ file: await res.blob(), name: file }])
    } catch {
      toast.error("Couldn't load the sample image. Check your connection and try again.")
    }
  }

  async function download(item: ImageItem) {
    if (!item.cutout) return
    try {
      downloadBlob(await composeBlob(item.cutout, item.originalUrl, background), outputName(item.name))
    } catch {
      toast.error("Couldn't save the image. Try again.")
    }
  }

  async function downloadAll() {
    for (const item of doneItems) {
      await download(item)
      await new Promise((r) => setTimeout(r, 350))
    }
    toast.success(`Saved ${doneItems.length} image${doneItems.length === 1 ? "" : "s"}`)
  }

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      hidden
      onChange={(e) => {
        addFiles(filesFrom(e.target.files))
        e.target.value = ""
      }}
    />
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <a href="#" className="mr-auto flex items-center gap-2" aria-label="Clearcut home">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ScissorsIcon className="size-4" />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">Clearcut</span>
          </a>
          <ModelStatusBadge model={model} />
          <Button variant="ghost" size="sm" nativeButton={false} render={<a href={GITHUB_URL} target="_blank" rel="noreferrer" />}>
            <GithubMark />
            <span className="hidden sm:inline">GitHub</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {picker}

      {items.length === 0 ? (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-4 py-12 sm:py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheckIcon className="size-3.5 text-primary" />
              Your photos never leave your device
            </span>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Remove image backgrounds right in your browser
            </h1>
            <p className="max-w-xl text-base text-balance text-muted-foreground sm:text-lg">
              Free, no sign-up, no watermark. An open-source AI model runs on your own computer, so nothing gets uploaded.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors",
              "hover:border-primary/60 hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none",
              dragging && "border-primary bg-primary/5"
            )}
          >
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <ImageUpIcon className="size-6" />
            </span>
            <span className="text-lg font-semibold">Drop images here or click to choose</span>
            <span className="text-sm text-muted-foreground">You can also paste with ⌘V / Ctrl+V. JPG, PNG and WebP, as many as you like.</span>
          </button>

          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-muted-foreground">No image handy? Try one of these:</span>
            <div className="flex flex-wrap justify-center gap-3">
              {SAMPLES.map((s) => (
                <button
                  key={s.file}
                  type="button"
                  onClick={() => trySample(s.file)}
                  className="group relative size-20 overflow-hidden rounded-xl border bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label={`Try the ${s.label.toLowerCase()} sample`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote sample thumbnails */}
                  <img src={`${SAMPLE_BASE}/${s.file}`} alt="" className="size-full object-cover transition-transform group-hover:scale-105" />
                </button>
              ))}
            </div>
          </div>

          <ModelStatus model={model} />
        </main>
      ) : (
        <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-4">
            {model.status !== "ready" && <ModelStatus model={model} />}
            {selected && <CompareView item={selected} background={background} onRetry={() => retry(selected.id)} />}
            {selected?.status === "done" && (
              <p className="text-center text-xs text-muted-foreground">
                Drag across the image to compare. Done in {((selected.ms ?? 0) / 1000).toFixed(1)}s on your device.
              </p>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Background</Label>
                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    className="w-full"
                    value={[bgKind]}
                    onValueChange={(v) => v[0] && setBgKind(v[0] as Background["kind"])}
                  >
                    <ToggleGroupItem value="transparent" className="flex-1 aria-pressed:bg-foreground aria-pressed:text-background">
                      None
                    </ToggleGroupItem>
                    <ToggleGroupItem value="color" className="flex-1 aria-pressed:bg-foreground aria-pressed:text-background">
                      Colour
                    </ToggleGroupItem>
                    <ToggleGroupItem value="blur" className="flex-1 aria-pressed:bg-foreground aria-pressed:text-background">
                      Blur
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {bgKind === "color" && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          aria-label={`Background colour ${c}`}
                          aria-pressed={color === c}
                          className="size-7 rounded-full border shadow-xs aria-pressed:ring-2 aria-pressed:ring-primary aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
                          style={{ background: c }}
                        />
                      ))}
                      <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]">
                        <span className="sr-only">Custom colour</span>
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                      </label>
                    </div>
                  )}

                  {bgKind === "blur" && (
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Blur strength</span>
                        <span className="tabular-nums">{blur}</span>
                      </div>
                      <Slider aria-label="Blur strength" min={2} max={40} value={blur} onValueChange={(v) => setBlur(v as number)} />
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Button size="lg" disabled={selected?.status !== "done"} onClick={() => selected && download(selected)}>
                    <DownloadIcon data-icon="inline-start" />
                    Download PNG
                  </Button>
                  {doneItems.length > 1 && (
                    <Button variant="outline" size="lg" onClick={downloadAll}>
                      Download all ({doneItems.length})
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Images ({items.length})
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                    <PlusIcon data-icon="inline-start" />
                    Add
                  </Button>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {items.map((it) => (
                    <li key={it.id}>
                      <div
                        className={cn(
                          "group flex items-center gap-3 rounded-lg p-1.5 pr-2 transition-colors hover:bg-muted",
                          selected?.id === it.id && "bg-muted"
                        )}
                      >
                        <button type="button" onClick={() => setSelectedId(it.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
                          <img src={it.originalUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{it.name}</span>
                            <span className="text-xs text-muted-foreground">{statusLabel(it)}</span>
                          </span>
                          <StatusIcon status={it.status} />
                        </button>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" aria-label={`Remove ${it.name}`} onClick={() => remove(it.id)} />
                            }
                          >
                            <XIcon />
                          </TooltipTrigger>
                          <TooltipContent>Remove from list</TooltipContent>
                        </Tooltip>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </aside>
        </main>
      )}

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground">
          <span>
            Runs{" "}
            <a className="underline underline-offset-2 hover:text-foreground" href="https://huggingface.co/onnx-community/BiRefNet_lite-ONNX" target="_blank" rel="noreferrer">BiRefNet lite</a>{" "}
            (MIT) on capable GPUs and{" "}
            <a className="underline underline-offset-2 hover:text-foreground" href="https://huggingface.co/onnx-community/ormbg-ONNX" target="_blank" rel="noreferrer">ormbg</a>{" "}
            (Apache-2.0) everywhere else, in your browser with{" "}
            <a className="underline underline-offset-2 hover:text-foreground" href="https://github.com/huggingface/transformers.js" target="_blank" rel="noreferrer">Transformers.js</a>.
          </span>
          <a className="underline underline-offset-2 hover:text-foreground" href={GITHUB_URL} target="_blank" rel="noreferrer">
            Open source on GitHub
          </a>
        </div>
      </footer>

      {dragging && items.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-primary/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-primary bg-background px-8 py-6 text-lg font-semibold shadow-xl">
            Drop to remove backgrounds
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(it: ImageItem) {
  switch (it.status) {
    case "queued":
      return "Waiting"
    case "processing":
      return "Removing background…"
    case "done":
      return `Done in ${((it.ms ?? 0) / 1000).toFixed(1)}s`
    case "error":
      return "Couldn't process"
  }
}

function StatusIcon({ status }: { status: ImageItem["status"] }) {
  if (status === "done") return <CheckIcon className="size-4 text-primary" />
  if (status === "error") return <TriangleAlertIcon className="size-4 text-destructive" />
  if (status === "processing") return <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
  return <span className="size-2 rounded-full bg-muted-foreground/40" />
}

function ModelStatusBadge({ model }: { model: ReturnType<typeof useRemover>["model"] }) {
  if (model.status !== "ready") return null
  return (
    <span className="hidden sm:block">
      <ModelStatus model={model} />
    </span>
  )
}

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}
