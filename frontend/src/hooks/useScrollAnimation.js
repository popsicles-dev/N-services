import { useEffect, useRef, useState } from 'react'

/**
 * Custom hook for scroll-triggered animations
 * Adds 'visible' class when element enters viewport
 * Removes 'visible' class when element exits viewport (if triggerOnce is false)
 */
export function useScrollAnimation(options = {}) {
    const elementRef = useRef(null)
    const {
        threshold = 0.1,
        rootMargin = '0px 0px -50px 0px', // Start animation slightly before element is fully in view
        triggerOnce = false // Changed default to false for bidirectional animations
    } = options

    useEffect(() => {
        const element = elementRef.current
        if (!element) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                        if (triggerOnce) {
                            observer.unobserve(entry.target)
                        }
                    } else if (!triggerOnce) {
                        entry.target.classList.remove('visible')
                    }
                })
            },
            {
                threshold,
                rootMargin
            }
        )

        observer.observe(element)

        return () => {
            if (element) {
                observer.unobserve(element)
            }
        }
    }, [threshold, rootMargin, triggerOnce])

    return elementRef
}

/**
 * Custom hook for stagger animations on list items
 * Children with .stagger-item class will animate in sequence
 */
export function useStaggerAnimation(itemCount, delay = 100) {
    const containerRef = useRef(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const items = container.querySelectorAll('.stagger-item')

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Array.from(items).indexOf(entry.target)
                        setTimeout(() => {
                            entry.target.classList.add('visible')
                        }, index * delay)
                        observer.unobserve(entry.target)
                    }
                })
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -30px 0px'
            }
        )

        items.forEach((item) => observer.observe(item))

        return () => {
            items.forEach((item) => observer.unobserve(item))
        }
    }, [itemCount, delay])

    return containerRef
}

/**
 * Hook for scroll progress within an element
 * Returns a value from 0 to 1 based on how far through the element the user has scrolled
 */
export function useScrollProgress() {
    const elementRef = useRef(null)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const element = elementRef.current
        if (!element) return

        const handleScroll = () => {
            const rect = element.getBoundingClientRect()
            const windowHeight = window.innerHeight
            const elementHeight = rect.height

            // Calculate how far through the element we've scrolled
            // 0 = element just entered viewport from bottom
            // 1 = element has fully exited viewport from top
            const start = windowHeight
            const end = -elementHeight
            const current = rect.top
            const range = start - end
            const scrolled = start - current

            const newProgress = Math.max(0, Math.min(1, scrolled / range))
            setProgress(newProgress)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Initial call

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return { elementRef, progress }
}
