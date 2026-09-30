"use client"

import * as React from "react"
import { Loader2Icon, TriangleAlertIcon } from "lucide-react"

import { compose } from "@/lib/compose"
import type { Background, ImageItem } from "@/lib/remover-types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type Props = {
  item: ImageItem
  background: Background
  onRetry: () => void
}

export function CompareView({ item, background, onRetry }: Props) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null)
  const [pos, setPos] = React.useState(50)

  React.useEffect(() => {
    if (item.cutout && canvasRef.current) compose(canvasRef.current, item.cutout, item.originalUrl, background)
  }, [item.cutout, item.originalUrl, background])

  const ratio = size ? size.w / size.h : 4 / 3
  const done = item.status === "done" && item.cutout

  return (
    <div className="flex w-full justify-center">
      <div
        className="relative overflow-hidden rounded-xl bg-muted select-none"
        style={{ aspectRatio: `${ratio}`, width: `min(100%, calc(68svh * ${ratio}))` }}
      >
        {/* Before */}
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL */}
        <img
          src={item.originalUrl}
          alt={`Original: ${item.name}`}
          className="absolute inset-0 size-full object-contain"
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          draggable={false}
        />

        {/* After, revealed from the left edge up to the handle */}
        <div
          className={cn("absolute inset-0 transition-opacity duration-500", done ? "opacity-100" : "opacity-0")}
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <div className={cn("absolute inset-0", background.kind === "transparent" && "checkerboard")} />
          <canvas ref={canvasRef} className="absolute inset-0 size-full object-contain" aria-label={`Result: ${item.name}`} />
        </div>

        {done && (
          <>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]" style={{ left: `${pos}%` }}>
              <div className="absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
                </svg>
              </div>
            </div>
            <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">After</span>
            <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/55 px-2 py-1 text-xs font-medium text-white backdrop-blur">Before</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Compare before and after"
              className="absolute inset-0 size-full cursor-ew-resize opacity-0"
            />
          </>
        )}

        {(item.status === "queued" || item.status === "processing") && (
          <div className="scan absolute inset-0 grid place-items-center bg-black/25">
            <div className="flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow-lg backdrop-blur">
              <Loader2Icon className="size-4 animate-spin" />
              {item.status === "processing" ? "Removing background…" : "Waiting for the AI model…"}
            </div>
          </div>
        )}

        {item.status === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-black/50 p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl bg-background p-5 text-center shadow-lg">
              <TriangleAlertIcon className="size-5 text-destructive" />
              <p className="text-sm">This image couldn&apos;t be processed.</p>
              {item.error && <p className="line-clamp-3 text-xs break-all text-muted-foreground">{item.error}</p>}
              <Button size="sm" onClick={onRetry}>
                Try again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
