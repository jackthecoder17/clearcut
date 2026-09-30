import { CpuIcon, TriangleAlertIcon, ZapIcon } from "lucide-react"

import { MODELS, type ModelState } from "@/lib/remover-types"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const mb = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

export function ModelStatus({ model }: { model: ModelState }) {
  if (model.status === "idle") return null

  if (model.status === "loading") {
    return (
      <div className="flex w-full flex-col gap-2 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            {model.progress >= 100 || !model.total ? "Starting the AI model…" : "Downloading the AI model (one time only)"}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {model.total ? `${mb(model.loaded)} of ${mb(model.total)}` : ""}
          </span>
        </div>
        <Progress value={Math.round(model.progress)} aria-label="Model download progress" />
        <p className="text-xs text-muted-foreground">
          After this it&apos;s cached in your browser, so next time it starts instantly and even works offline.
        </p>
      </div>
    )
  }

  if (model.status === "error") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <span>
          The AI model couldn&apos;t start in this browser. Try the latest Chrome, Edge or Safari. ({model.message})
        </span>
      </div>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      {model.device === "webgpu" ? <ZapIcon /> : <CpuIcon />}
      {model.device === "webgpu" ? "Your GPU" : "Your CPU"} · {MODELS[model.model]?.name ?? "AI model"}
    </Badge>
  )
}
