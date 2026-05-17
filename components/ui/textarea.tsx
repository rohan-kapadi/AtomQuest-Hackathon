import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-3 text-sm text-white transition-[border-color,box-shadow,background-color] outline-none placeholder:text-slate-500 focus-visible:border-violet-500/60 focus-visible:ring-2 focus-visible:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
