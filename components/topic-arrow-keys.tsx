'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { isTypingTarget } from '@/components/search/search-trigger'

/**
 * Pfeiltasten wechseln zum vorherigen bzw. nächsten Thema derselben Kategorie.
 * Nur auf Themenseiten aktiv - und nie, während jemand tippt.
 */
export function TopicArrowKeys({ prevSlug, nextSlug }: { prevSlug?: string; nextSlug?: string }) {
  const router = useRouter()

  useEffect(() => {
    if (!prevSlug && !nextSlug) return

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (event.key === 'ArrowLeft' && prevSlug) {
        router.push(`/thema/${prevSlug}`)
      } else if (event.key === 'ArrowRight' && nextSlug) {
        router.push(`/thema/${nextSlug}`)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevSlug, nextSlug, router])

  return null
}
