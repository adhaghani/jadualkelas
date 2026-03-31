/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

export type ExportOptions = { scale?: number; background?: string | null }

/**
 * Capture an element as PNG and trigger a download.
 * Uses dynamic import of `dom-to-image-more` so this module can be imported
 * from client-only components without affecting server builds.
 */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename = "timetable.png",
  opts?: ExportOptions
): Promise<void> {
  if (!element) throw new Error("No element provided to downloadElementAsPng")

  const mod = await import("dom-to-image-more")
  const domToImage: any = (mod as any).default ?? mod
  const defaultScale =
    (typeof window !== "undefined" && window.devicePixelRatio) || 3
  const scale = opts?.scale ?? defaultScale
  const background = opts?.background ?? "#ffffff"

  // Wait for fonts to be ready to avoid fallback fonts in capture
  try {
    if ((document as any).fonts && (document as any).fonts.ready) {
      // @ts-ignore
      await (document as any).fonts.ready
    }
  } catch (e) {
    void e
  }

  const hideSelector = "[data-no-export], .no-export"
  const hidden = Array.from(
    element.querySelectorAll(hideSelector)
  ) as HTMLElement[]
  const prevDisplays = hidden.map((el) => el.style.display)
  hidden.forEach((el) => (el.style.display = "none"))

  try {
    const blob: Blob = await domToImage.toBlob(element, {
      bgcolor: background === null ? undefined : background,
      scale,
      filter: (node: Node) => {
        if (node instanceof Element) {
          if (
            (node as Element).closest &&
            (node as Element).closest(hideSelector)
          )
            return false
        }
        return true
      },
      cacheBust: true,
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } finally {
    hidden.forEach((el, i) => (el.style.display = prevDisplays[i] ?? ""))
  }
}

export async function captureElementAsBlob(
  element: HTMLElement,
  opts?: ExportOptions
): Promise<Blob> {
  const mod = await import("dom-to-image-more")
  const domToImage: any = (mod as any).default ?? mod
  const defaultScale =
    (typeof window !== "undefined" && window.devicePixelRatio) || 1
  const scale = opts?.scale ?? defaultScale
  const background = opts?.background ?? "#ffffff"
  return domToImage.toBlob(element, {
    bgcolor: background === null ? undefined : background,
    scale,
    cacheBust: true,
  })
}
