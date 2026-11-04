import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ContrastMode = 'normal' | 'high'
export type PaletteMode = 'classic' | 'cvd'
export type TextMode = 'normal' | 'large'

export interface DisplayState {
  contrast: ContrastMode
  palette: PaletteMode
  text: TextMode
  setContrast: (contrast: ContrastMode) => void
  setPalette: (palette: PaletteMode) => void
  setText: (text: TextMode) => void
}

export const displayStore = createStore<DisplayState>()(
  persist(
    (set) => ({
      contrast: 'normal',
      palette: 'classic',
      text: 'normal',
      setContrast: (contrast) => set({ contrast }),
      setPalette: (palette) => set({ palette }),
      setText: (text) => set({ text }),
    }),
    {
      name: 'afterword-display',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ contrast: s.contrast, palette: s.palette, text: s.text }) as DisplayState,
    },
  ),
)

// Reflect settings as data-* attributes on <html> so display.css token overrides apply.
// Runs at module load (post-rehydrate, pre-render → no flash) and on every change.
// Store-level (not a React effect) → StrictMode double-mount can't double-apply.
function applyAttrs(s: Pick<DisplayState, 'contrast' | 'palette' | 'text'>): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  const on: Array<[string, string | null]> = [
    ['data-contrast', s.contrast === 'high' ? 'high' : null],
    ['data-palette', s.palette === 'cvd' ? 'cvd' : null],
    ['data-text', s.text === 'large' ? 'large' : null],
  ]
  for (const [attr, value] of on) {
    if (value) el.setAttribute(attr, value)
    else el.removeAttribute(attr)
  }
}
applyAttrs(displayStore.getState())
displayStore.subscribe(applyAttrs)

export function useDisplayStore<T>(selector: (s: DisplayState) => T): T {
  return useStore(displayStore, selector)
}
