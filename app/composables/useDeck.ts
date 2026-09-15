import type { LOCALE } from '~~/shared/janulus'

/**
 * Mazo ANKI simplificado: cada entrada ES una card con ambos idiomas.
 * Flip 3D con CSS al hacer click. Bidireccional con un botón.
 */
export function useDeck(defaultFront: LOCALE = 'pt', defaultBack: LOCALE = 'es') {
  const frontLang = useState<LOCALE>('janulus-deck-front', () => defaultFront)
  const backLang = useState<LOCALE>('janulus-deck-back', () => defaultBack)
  const flipped = useState<string[]>('janulus-deck-flipped', () => [])

  function isFlipped(id: string): boolean {
    return flipped.value.includes(id)
  }

  function toggleFlip(id: string): void {
    flipped.value = isFlipped(id)
      ? flipped.value.filter(f => f !== id)
      : [...flipped.value, id]
  }

  function swapDirection(): void {
    const f = frontLang.value
    frontLang.value = backLang.value
    backLang.value = f
    flipped.value = []
  }

  function setDirection(front: LOCALE, back: LOCALE): void {
    frontLang.value = front
    backLang.value = back
    flipped.value = []
  }

  return { frontLang, backLang, flipped, isFlipped, toggleFlip, swapDirection, setDirection }
}
