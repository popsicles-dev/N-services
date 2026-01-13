import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Custom hook for scroll-driven timeline animations
 * Creates a parallax effect where sections stack and animate based on scroll position
 */
export function useScrollTimeline(sectionCount = 5) {
    const containerRef = useRef(null)
    const [activeSection, setActiveSection] = useState(0)
    const [scrollProgress, setScrollProgress] = useState(0)
    const [sectionProgress, setSectionProgress] = useState(Array(sectionCount).fill(0))

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            const scrollTop = window.scrollY
            const docHeight = document.documentElement.scrollHeight - window.innerHeight
            const totalProgress = Math.min(scrollTop / docHeight, 1)
            setScrollProgress(totalProgress)

            // Calculate which section we're in and the progress within that section
            const sectionHeight = docHeight / sectionCount
            const currentSection = Math.min(Math.floor(scrollTop / sectionHeight), sectionCount - 1)
            setActiveSection(currentSection)

            // Calculate individual section progress (0-1 for each section)
            const newSectionProgress = Array(sectionCount).fill(0).map((_, index) => {
                const sectionStart = index * sectionHeight
                const sectionEnd = (index + 1) * sectionHeight
                
                if (scrollTop < sectionStart) return 0
                if (scrollTop > sectionEnd) return 1
                return (scrollTop - sectionStart) / sectionHeight
            })
            setSectionProgress(newSectionProgress)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Initial call

        return () => window.removeEventListener('scroll', handleScroll)
    }, [sectionCount])

    return {
        containerRef,
        activeSection,
        scrollProgress,
        sectionProgress
    }
}

/**
 * Hook for individual section scroll-based animations
 * Returns transform and opacity values based on scroll position
 */
export function useSectionAnimation(sectionIndex, totalSections = 5) {
    const sectionRef = useRef(null)
    const [animState, setAnimState] = useState({
        opacity: 0,
        translateY: 100,
        scale: 0.95,
        isVisible: false,
        isActive: false,
        progress: 0
    })

    useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        const handleScroll = () => {
            const rect = section.getBoundingClientRect()
            const windowHeight = window.innerHeight
            const sectionTop = rect.top
            const sectionHeight = rect.height

            // Calculate visibility progress (0 = not visible, 1 = fully visible)
            // Section enters from bottom, exits to top
            const enterStart = windowHeight
            const enterEnd = windowHeight * 0.3
            const exitStart = windowHeight * 0.1
            const exitEnd = -sectionHeight * 0.5

            let progress = 0
            let opacity = 0
            let translateY = 100
            let scale = 0.95
            let isVisible = false
            let isActive = false

            if (sectionTop <= enterStart && sectionTop > enterEnd) {
                // Entering phase (scrolling into view)
                progress = 1 - (sectionTop - enterEnd) / (enterStart - enterEnd)
                opacity = Math.min(progress * 1.5, 1)
                translateY = (1 - progress) * 60
                scale = 0.95 + (progress * 0.05)
                isVisible = true
            } else if (sectionTop <= enterEnd && sectionTop > exitStart) {
                // Active/visible phase
                progress = 1
                opacity = 1
                translateY = 0
                scale = 1
                isVisible = true
                isActive = true
            } else if (sectionTop <= exitStart && sectionTop > exitEnd) {
                // Exiting phase (scrolling out of view)
                progress = (sectionTop - exitEnd) / (exitStart - exitEnd)
                opacity = progress
                translateY = (1 - progress) * -30
                scale = 1 - ((1 - progress) * 0.05)
                isVisible = true
            }

            setAnimState({ opacity, translateY, scale, isVisible, isActive, progress })
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [sectionIndex, totalSections])

    return { sectionRef, ...animState }
}

/**
 * Hook for parallax background effects
 */
export function useParallaxBackground(speed = 0.5) {
    const [offset, setOffset] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            setOffset(window.scrollY * speed)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [speed])

    return offset
}

/**
 * Hook for scroll-triggered stagger animations on child elements
 */
export function useStaggerReveal(containerRef, delay = 100) {
    const [revealed, setRevealed] = useState(false)

    useEffect(() => {
        const container = containerRef?.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !revealed) {
                        setRevealed(true)
                        const children = container.querySelectorAll('[data-stagger]')
                        children.forEach((child, index) => {
                            setTimeout(() => {
                                child.classList.add('stagger-visible')
                            }, index * delay)
                        })
                    }
                })
            },
            { threshold: 0.2 }
        )

        observer.observe(container)
        return () => observer.disconnect()
    }, [containerRef, delay, revealed])

    return revealed
}
