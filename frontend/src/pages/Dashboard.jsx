import { useState, useEffect, useMemo, useRef } from 'react'
import LeadService from '../services/LeadService'
import AuditService from '../services/AuditService'
import { useScrollAnimation, useScrollProgress } from '../hooks/useScrollAnimation'
import { useSectionAnimation, useParallaxBackground } from '../hooks/useScrollTimeline'

export default function Dashboard() {
    // ============ LEAD GENERATION STATE ============
    const [keyword, setKeyword] = useState('')
    const [location, setLocation] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [results, setResults] = useState(null)
    const [jobId, setJobId] = useState(null)
    const [error, setError] = useState(null)
    const [csvData, setCsvData] = useState({ headers: [], rows: [] })
    const [enriching, setEnriching] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState(0)
    const [isEnriched, setIsEnriched] = useState(false)
    const [ranking, setRanking] = useState(false)
    const [rankProgress, setRankProgress] = useState(0)
    const [isRanked, setIsRanked] = useState(false)
    const [filterText, setFilterText] = useState('')
    const [activeColumnFilters, setActiveColumnFilters] = useState(new Set())
    const [selectedIds, setSelectedIds] = useState(new Set())
    const isMounted = useRef(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

    // ============ SEO AUDIT STATE ============
    const [auditFile, setAuditFile] = useState(null)
    const [auditLoading, setAuditLoading] = useState(false)
    const [auditProgress, setAuditProgress] = useState(0)
    const [auditResults, setAuditResults] = useState(null)
    const [auditJobId, setAuditJobId] = useState(null)
    const [auditCsvData, setAuditCsvData] = useState({ headers: [], rows: [] })
    const [auditError, setAuditError] = useState(null)

    // Refs for scrolling
    const leadSectionRef = useRef(null)
    const auditSectionRef = useRef(null)

    // Scroll animation refs - bidirectional (animate in AND out)
    // Scroll animation refs - bidirectional with focus area
    const heroRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const leadHeaderRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const leadFormRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const leadResultsRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const auditHeaderRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const auditCardRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const emailHeaderRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const emailCardRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const sendingHeaderRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })
    const sendingCardRef = useScrollAnimation({ triggerOnce: false, rootMargin: '-15% 0px -15% 0px' })

    // Parallax background offset
    const parallaxOffset = useParallaxBackground(0.3)

    // Scroll to section function
    const scrollToSection = (ref) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    // ============ LEAD GENERATION FUNCTIONS ============
    const handleSearch = async () => {
        if (!keyword || !location) return

        setLoading(true)
        setError(null)
        setProgress(10)
        setResults(null)
        setCsvData({ headers: [], rows: [] })
        setSelectedIds(new Set())
        setIsEnriched(false)

        try {
            const data = await LeadService.extractUrls(keyword, location)
            setJobId(data.job_id)
            setProgress(50)
            pollJobStatus(data.job_id)
        } catch (err) {
            setError('Failed to start extraction: ' + (err.response?.data?.detail || err.message))
            setLoading(false)
        }
    }

    const handleEnrich = async () => {
        if (!results || !results.result_file) return

        setEnriching(true)
        setError(null)
        setEnrichProgress(5)

        try {
            let filenameToUse = results.result_file

            if (selectedIds.size > 0) {
                const selectedRows = csvData.rows
                    .filter(row => selectedIds.has(row.id))
                    .map(row => row.data)

                const csv = LeadService.generateCsv(csvData.headers, selectedRows)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const file = new File([blob], `selected_leads_enrich_${Date.now()}.csv`, { type: 'text/csv' })

                const uploadData = await AuditService.uploadFile(file)
                filenameToUse = uploadData.filename
            }

            const data = await LeadService.enrichContacts(filenameToUse)
            pollEnrichStatus(data.job_id)
        } catch (err) {
            setError('Failed to start enrichment: ' + (err.response?.data?.detail || err.message))
            setEnriching(false)
        }
    }

    const pollJobStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const job = await LeadService.getJobStatus(id)

                if (job.status === 'completed') {
                    clearInterval(interval)
                    setLoading(false)
                    setProgress(100)
                    setResults(job)
                    fetchCsvPreview(id)
                } else if (job.status === 'failed') {
                    clearInterval(interval)
                    setLoading(false)
                    setError('Job failed: ' + job.error)
                } else {
                    setProgress(prev => Math.min(prev + 5, 90))
                }
            } catch (err) {
                clearInterval(interval)
                setLoading(false)
                setError('Error checking status')
            }
        }, 2000)
    }

    const pollEnrichStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const job = await LeadService.getJobStatus(id)

                if (job.status === 'completed') {
                    clearInterval(interval)
                    setEnriching(false)
                    setEnrichProgress(100)
                    setIsEnriched(true)
                    setResults(prev => ({ ...prev, result_file: job.result_file }))
                    fetchCsvPreview(id)
                    setJobId(id)
                } else if (job.status === 'failed') {
                    clearInterval(interval)
                    setEnriching(false)
                    setError('Enrichment failed: ' + job.error)
                } else {
                    setEnrichProgress(prev => Math.min(prev + 2, 95))
                }
            } catch (err) {
                clearInterval(interval)
                setEnriching(false)
                setError('Error checking enrichment status')
            }
        }, 2000)
    }

    const fetchCsvPreview = async (id) => {
        try {
            const data = await LeadService.fetchCsvPreview(id)
            setCsvData(data)
            setSelectedIds(new Set())
        } catch (err) {
            console.error("Failed to fetch CSV preview", err)
        }
    }

    const filteredRows = useMemo(() => {
        if (csvData.rows.length === 0) return []

        return csvData.rows.filter(row => {
            const matchesSearch = filterText === '' || row.data.some(cell =>
                cell && cell.toString().toLowerCase().includes(filterText.toLowerCase())
            )

            let matchesColumns = true
            if (activeColumnFilters.size > 0) {
                for (let colIndex of activeColumnFilters) {
                    const cellValue = row.data[colIndex]
                    if (!cellValue || cellValue.trim() === '' || cellValue.trim().toUpperCase() === 'N/A') {
                        matchesColumns = false
                        break
                    }
                }
            }

            return matchesSearch && matchesColumns
        })
    }, [csvData, filterText, activeColumnFilters])

    const stats = useMemo(() => {
        if (!csvData.headers || filteredRows.length === 0) return { emails: 0, phones: 0, facebook: 0, instagram: 0, twitter: 0, linkedin: 0 }

        const emailIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('email'))
        const phoneIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('phone'))
        const fbIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('facebook'))
        const instaIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('instagram'))
        const twitterIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('twitter'))
        const linkedinIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('linkedin'))

        let emails = 0, phones = 0, facebook = 0, instagram = 0, twitter = 0, linkedin = 0

        filteredRows.forEach(row => {
            const hasValue = (idx) => idx !== -1 && row.data[idx] && row.data[idx].trim() !== '' && row.data[idx] !== 'N/A'
            if (hasValue(emailIdx)) emails++
            if (hasValue(phoneIdx)) phones++
            if (hasValue(fbIdx)) facebook++
            if (hasValue(instaIdx)) instagram++
            if (hasValue(twitterIdx)) twitter++
            if (hasValue(linkedinIdx)) linkedin++
        })

        return { emails, phones, facebook, instagram, twitter, linkedin }
    }, [csvData, filteredRows])

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        const allFilteredIds = filteredRows.map(row => row.id)
        const allSelected = allFilteredIds.every(id => selectedIds.has(id))
        const newSelected = new Set(selectedIds)

        if (allSelected) allFilteredIds.forEach(id => newSelected.delete(id))
        else allFilteredIds.forEach(id => newSelected.add(id))
        setSelectedIds(newSelected)
    }

    const isAllFilteredSelected = filteredRows.length > 0 && filteredRows.every(row => selectedIds.has(row.id))
    const isSomeFilteredSelected = filteredRows.length > 0 && filteredRows.some(row => selectedIds.has(row.id)) && !isAllFilteredSelected

    const handleExport = (count = null) => {
        if (csvData.rows.length === 0) return
        let rowsToExport = []

        if (count === 'selected') rowsToExport = csvData.rows.filter(row => selectedIds.has(row.id)).map(row => row.data)
        else if (count === 'all' || count === null) rowsToExport = csvData.rows.map(row => row.data)
        else rowsToExport = csvData.rows.slice(0, count).map(row => row.data)

        if (rowsToExport.length === 0) return
        const csv = LeadService.generateCsv(csvData.headers, rowsToExport)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `leads_export_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setShowExportMenu(false)
    }

    // ============ SEO AUDIT FUNCTIONS ============
    const handleProceedToAudit = async () => {
        if (!results) return

        let filenameToUse = results.result_file

        if (selectedIds.size > 0) {
            try {
                const selectedRows = csvData.rows
                    .filter(row => selectedIds.has(row.id))
                    .map(row => row.data)

                const csv = LeadService.generateCsv(csvData.headers, selectedRows)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const file = new File([blob], `selected_leads_${Date.now()}.csv`, { type: 'text/csv' })

                const data = await AuditService.uploadFile(file)
                filenameToUse = data.filename
            } catch (err) {
                setError("Failed to prepare selected leads for audit.")
                return
            }
        }

        setAuditFile(filenameToUse)
        scrollToSection(auditSectionRef)
    }

    const handleStartAudit = async () => {
        if (!auditFile) return

        setAuditLoading(true)
        setAuditError(null)
        setAuditProgress(5)

        try {
            const data = await AuditService.runAudit(auditFile, 100)
            setAuditJobId(data.job_id)
            pollAuditStatus(data.job_id)
        } catch (err) {
            setAuditError('Failed to start audit: ' + (err.response?.data?.detail || err.message))
            setAuditLoading(false)
        }
    }

    const pollAuditStatus = async (id) => {
        const interval = setInterval(async () => {
            try {
                const job = await AuditService.getAuditStatus(id)

                if (job.status === 'completed') {
                    clearInterval(interval)
                    setAuditLoading(false)
                    setAuditProgress(100)
                    setAuditResults(job)
                    fetchAuditCsvPreview(id)
                } else if (job.status === 'failed') {
                    clearInterval(interval)
                    setAuditLoading(false)
                    setAuditError('Audit failed: ' + job.error_message)
                } else {
                    if (job.total_items > 0) {
                        const percent = Math.min((job.processed_items / job.total_items) * 100, 95)
                        setAuditProgress(Math.round(percent))
                    } else {
                        setAuditProgress(prev => Math.min(prev + 2, 95))
                    }
                }
            } catch (err) {
                clearInterval(interval)
                setAuditLoading(false)
                setAuditError('Error checking audit status')
            }
        }, 3000)
    }

    const fetchAuditCsvPreview = async (id) => {
        try {
            const data = await AuditService.fetchAuditPreview(id)
            setAuditCsvData(data)
        } catch (err) {
            console.error("Failed to fetch audit CSV preview", err)
        }
    }

    // Dummy data for previews
    const DUMMY_HEADERS = ["Business Name", "Phone", "Email", "Website", "Instagram", "Facebook"]
    const DUMMY_ROWS = [
        ["Example Plumbing", "555-0123", "contact@example.com", "example.com", "@example", "fb.com/example"],
        ["City Bakery", "555-0987", "info@citybakery.com", "citybakery.com", "@citybakery", "fb.com/citybakery"],
        ["Tech Solutions", "555-4567", "hello@techsol.io", "techsol.io", "N/A", "fb.com/techsol"]
    ]

    const currentStats = results ? stats : { emails: 0, phones: 0, facebook: 0, instagram: 0, twitter: 0, linkedin: 0 }

    return (
        <div className="min-h-screen">
            {/* ============ HERO SECTION ============ */}
            <section ref={heroRef} className="fade-in-view relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 pt-28">
                {/* Floating Social Icons with Parallax */}
                <div
                    className="absolute inset-0 overflow-hidden pointer-events-none parallax-bg"
                    style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
                >
                    <div className="absolute top-[20%] left-[10%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-float">
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                    </div>
                    <div className="absolute top-[30%] right-[15%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-float animation-delay-500">
                        <svg className="w-6 h-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
                    </div>
                    <div className="absolute bottom-[30%] left-[8%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-float animation-delay-1000">
                        <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path></svg>
                    </div>
                    <div className="absolute bottom-[25%] right-[10%] w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-float animation-delay-700">
                        <svg className="w-6 h-6 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                    </div>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-6 animation-delay-200">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                    Instant Lead Generation
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 max-w-4xl leading-tight animation-delay-300">
                    Discover, Analyze, and Convert <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">High-Intent Leads</span> with Ease
                </h1>

                {/* Subheadline */}
                <p className="text-lg text-gray-500 max-w-2xl mb-10 animation-delay-400">
                    Get real-time insights on business prospects, audit their SEO performance, and identify the best opportunities—all in one place.
                </p>

                {/* CTA Button */}
                <button
                    onClick={() => scrollToSection(leadSectionRef)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all hover:scale-105 active:scale-95 animation-delay-500"
                >
                    Start Extracting Leads
                </button>
            </section>

            {/* ============ LEAD EXTRACTION SECTION ============ */}
            <section id="lead-extraction" ref={leadSectionRef} className="py-20 px-6 scroll-mt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div ref={leadHeaderRef} className="fade-in-view text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-sm font-medium mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            Step 1
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Lead Extraction</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Enter a keyword and location to discover potential business leads from across the web.</p>
                    </div>

                    {/* Search Form Card */}
                    <div ref={leadFormRef} className="fade-in-view bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8 hover-lift">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Keyword</label>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="e.g., 'plumbers', 'lawyers', 'dentists'"
                                    type="text"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
                                <input
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="e.g., 'Dallas, TX', 'London, UK'"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={loading || enriching || !keyword || !location}
                            className={`w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all ${(loading || enriching || !keyword || !location) ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                        >
                            {loading ? 'Scraping Leads...' : 'Scrape Leads'}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Progress Bars */}
                    {loading && (
                        <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-gray-700">Scraping in progress...</p>
                                <p className="text-sm font-bold text-blue-600">{progress}%</p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {enriching && (
                        <div className="mb-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-gray-700">Enriching contacts...</p>
                                <p className="text-sm font-bold text-purple-600">{enrichProgress}%</p>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-400 h-3 rounded-full transition-all duration-500" style={{ width: `${enrichProgress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {/* Results Card */}
                    <div ref={leadResultsRef} className="fade-in-view bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover-lift">
                        {/* Stats Header */}
                        <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {results ? `${results.total_items} Leads Found` : "Example Output"}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {results ? `${results.processed_items} businesses processed` : "This is how your leads will appear"}
                                </p>
                            </div>

                            {/* Clickable Filter Badges */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    {
                                        key: 'email',
                                        label: 'Emails',
                                        count: currentStats.emails,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                            </svg>
                                        ),
                                        activeClass: 'bg-green-500 text-white ring-2 ring-green-300 shadow-lg',
                                        inactiveClass: 'bg-green-50 text-green-600 hover:bg-green-100'
                                    },
                                    {
                                        key: 'phone',
                                        label: 'Phones',
                                        count: currentStats.phones,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                            </svg>
                                        ),
                                        activeClass: 'bg-blue-500 text-white ring-2 ring-blue-300 shadow-lg',
                                        inactiveClass: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                    },
                                    {
                                        key: 'facebook',
                                        label: 'Facebook',
                                        count: currentStats.facebook,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                                            </svg>
                                        ),
                                        activeClass: 'bg-indigo-500 text-white ring-2 ring-indigo-300 shadow-lg',
                                        inactiveClass: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    },
                                    {
                                        key: 'instagram',
                                        label: 'Instagram',
                                        count: currentStats.instagram,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect>
                                                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path>
                                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2" strokeLinecap="round"></line>
                                            </svg>
                                        ),
                                        activeClass: 'bg-pink-500 text-white ring-2 ring-pink-300 shadow-lg',
                                        inactiveClass: 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                                    },
                                    {
                                        key: 'linkedin',
                                        label: 'LinkedIn',
                                        count: currentStats.linkedin,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
                                                <circle cx="4" cy="4" r="2"></circle>
                                            </svg>
                                        ),
                                        activeClass: 'bg-sky-500 text-white ring-2 ring-sky-300 shadow-lg',
                                        inactiveClass: 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                                    },
                                    {
                                        key: 'twitter',
                                        label: 'Twitter',
                                        count: currentStats.twitter,
                                        icon: (
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                                            </svg>
                                        ),
                                        activeClass: 'bg-cyan-500 text-white ring-2 ring-cyan-300 shadow-lg',
                                        inactiveClass: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
                                    },
                                ].map(({ key, label, count, icon, activeClass, inactiveClass }) => {
                                    const colIdx = csvData.headers.findIndex(h => h.toLowerCase().includes(key))
                                    const isActive = colIdx !== -1 && activeColumnFilters.has(colIdx)
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                if (colIdx === -1) return
                                                const newFilters = new Set(activeColumnFilters)
                                                if (newFilters.has(colIdx)) newFilters.delete(colIdx)
                                                else newFilters.add(colIdx)
                                                setActiveColumnFilters(newFilters)
                                            }}
                                            disabled={colIdx === -1}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                                                ${isActive ? activeClass : inactiveClass}
                                                ${colIdx === -1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {icon}
                                            {count} {label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                {/* Upload for Enrichment */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={async (e) => {
                                            const file = e.target.files[0]
                                            if (!file) return

                                            setError(null)
                                            setEnriching(true)
                                            setEnrichProgress(5)

                                            try {
                                                // Validate CSV first (same validator as audit)
                                                const validation = await AuditService.validateCSV(file)

                                                if (!validation.valid) {
                                                    setError(validation.error + (validation.suggestions ? `\n\nFound columns: ${validation.found_headers?.join(', ')}` : ''))
                                                    setEnriching(false)
                                                    return
                                                }

                                                // Upload file
                                                const uploadData = await AuditService.uploadFile(file)

                                                // Start enrichment
                                                const data = await LeadService.enrichContacts(uploadData.filename)
                                                pollEnrichStatus(data.job_id)
                                            } catch (err) {
                                                setError('Failed to upload file for enrichment: ' + (err.response?.data?.detail || err.message))
                                                setEnriching(false)
                                            }
                                        }}
                                        className="hidden"
                                        id="enrich-upload"
                                    />
                                    <label
                                        htmlFor="enrich-upload"
                                        className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all cursor-pointer ${enriching ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                        </svg>
                                        Upload to Enrich
                                    </label>
                                </div>

                                {/* Enrich Extracted Leads */}
                                <button
                                    onClick={handleEnrich}
                                    disabled={!results || loading || enriching || isEnriched}
                                    className={`px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all ${(!results || loading || enriching || isEnriched) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    {isEnriched ? '✓ Enriched' : (selectedIds.size > 0 ? `Enrich (${selectedIds.size})` : 'Enrich All')}
                                </button>
                            </div>
                        </div>

                        {/* Search Filter */}
                        {results && csvData.headers.length > 0 && (
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <div className="relative max-w-md">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        placeholder="Search leads..."
                                        value={filterText}
                                        onChange={(e) => setFilterText(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            {results ? (
                                csvData.rows.length > 0 ? (
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-4 bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={isAllFilteredSelected}
                                                        ref={input => { if (input) input.indeterminate = isSomeFilteredSelected }}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                {csvData.headers.map((header, index) => (
                                                    <th key={index} className="px-6 py-4 whitespace-nowrap bg-gray-50 font-semibold">{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredRows.map((row) => (
                                                <tr key={row.id} className={`hover:bg-blue-50/50 transition-colors ${selectedIds.has(row.id) ? 'bg-blue-50' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            checked={selectedIds.has(row.id)}
                                                            onChange={() => toggleSelect(row.id)}
                                                        />
                                                    </td>
                                                    {row.data.map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="px-6 py-4 text-gray-600 whitespace-nowrap">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="p-12 text-center text-gray-400">Loading preview...</div>
                                )
                            ) : (
                                <table className="w-full text-sm text-left opacity-50">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4"><input type="checkbox" disabled className="rounded border-gray-300" /></th>
                                            {DUMMY_HEADERS.map((h, i) => <th key={i} className="px-6 py-4 whitespace-nowrap">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {DUMMY_ROWS.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-6 py-4"><input type="checkbox" disabled className="rounded border-gray-300" /></td>
                                                {row.map((cell, j) => <td key={j} className="px-6 py-4 text-gray-400 whitespace-nowrap">{cell}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleExport(selectedIds.size > 0 ? 'selected' : 'all')}
                                    disabled={!results}
                                    className={`px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors ${!results ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Export CSV
                                </button>
                                {results && <span className="text-xs text-gray-500">{filteredRows.length} of {csvData.rows.length} rows</span>}
                            </div>

                            <button
                                onClick={handleProceedToAudit}
                                disabled={!results || loading || enriching}
                                className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all ${(!results || loading || enriching) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                            >
                                {selectedIds.size > 0 ? `Audit Selected (${selectedIds.size}) →` : 'Proceed to SEO Audit →'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ SEO AUDIT SECTION ============ */}
            <section id="seo-audit" ref={auditSectionRef} className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white scroll-mt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div ref={auditHeaderRef} className="fade-in-view text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-sm font-medium mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            Step 2
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">SEO Audit</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Analyze the SEO performance of your leads and identify the best opportunities to convert.</p>
                    </div>

                    {/* Audit Card */}
                    <div ref={auditCardRef} className="fade-in-view bg-white rounded-3xl shadow-xl border border-gray-100 p-8 hover-lift">
                        {!auditFile ? (
                            <div className="space-y-8">
                                {/* Upload or Select Options */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Upload File */}
                                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload CSV File</h3>
                                        <p className="text-sm text-gray-500 mb-4">Drag and drop or click to browse</p>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={async (e) => {
                                                const file = e.target.files[0]
                                                if (!file) return

                                                setAuditError(null)
                                                setAuditLoading(true)

                                                try {
                                                    // Validate CSV first
                                                    const validation = await AuditService.validateCSV(file)

                                                    if (!validation.valid) {
                                                        setAuditError(validation.error + (validation.suggestions ? `\n\nFound columns: ${validation.found_headers?.join(', ')}` : ''))
                                                        setAuditLoading(false)
                                                        return
                                                    }

                                                    // Upload file
                                                    const data = await AuditService.uploadFile(file)
                                                    setAuditFile(data.filename)
                                                    setAuditLoading(false)
                                                } catch (err) {
                                                    setAuditError('Failed to upload file: ' + (err.response?.data?.detail || err.message))
                                                    setAuditLoading(false)
                                                }
                                            }}
                                            className="hidden"
                                            id="csv-upload"
                                        />
                                        <label
                                            htmlFor="csv-upload"
                                            className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 cursor-pointer transition-colors"
                                        >
                                            Choose File
                                        </label>
                                        <p className="text-xs text-gray-400 mt-3">Required: Business Name & Website URL columns</p>
                                    </div>

                                    {/* Select from Database */}
                                    <div className="border-2 border-gray-200 rounded-2xl p-8 text-center hover:border-green-400 transition-colors">
                                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Use Extracted Leads</h3>
                                        <p className="text-sm text-gray-500 mb-4">Select from previously extracted files</p>
                                        <button
                                            onClick={() => scrollToSection(leadSectionRef)}
                                            className="px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                                        >
                                            Go to Lead Extraction
                                        </button>
                                        <p className="text-xs text-gray-400 mt-3">Or use "Proceed to SEO Audit" button above</p>
                                    </div>
                                </div>

                                {/* Validation Error */}
                                {auditError && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 whitespace-pre-line">
                                        <div className="flex items-start gap-3">
                                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                                            </svg>
                                            <div>
                                                <p className="font-semibold mb-1">Invalid CSV File</p>
                                                <p className="text-sm">{auditError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Info Box */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                                        </svg>
                                        <div className="text-sm text-blue-700">
                                            <p className="font-semibold mb-1">CSV Format Requirements</p>
                                            <ul className="list-disc list-inside space-y-1 text-blue-600">
                                                <li>Must include a column for <strong>Business Names</strong></li>
                                                <li>Must include a column for <strong>Website URLs</strong></li>
                                                <li>Column names can be: "Business Name", "Name", "Company", etc.</li>
                                                <li>URL columns can be: "Website", "URL", "Link", "Web Address", etc.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Leads Ready for Audit</p>
                                            <p className="text-sm text-gray-500">{auditFile}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStartAudit}
                                        disabled={auditLoading}
                                        className={`px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all ${auditLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                    >
                                        {auditLoading ? 'Auditing...' : 'Start SEO Audit'}
                                    </button>
                                </div>

                                {/* Audit Error */}
                                {auditError && (
                                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                                        {auditError}
                                    </div>
                                )}

                                {/* Audit Progress */}
                                {auditLoading && (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-sm font-medium text-gray-700">Auditing websites...</p>
                                            <p className="text-sm font-bold text-orange-600">{auditProgress}%</p>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="bg-gradient-to-r from-orange-500 to-amber-400 h-3 rounded-full transition-all duration-500" style={{ width: `${auditProgress}%` }}></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">⏱️ This may take 4-5 seconds per lead</p>
                                    </div>
                                )}

                                {/* Audit Results */}
                                {auditResults && auditCsvData.rows.length > 0 && (
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                                    <tr>
                                                        {auditCsvData.headers.map((header, index) => (
                                                            <th key={index} className="px-6 py-4 whitespace-nowrap bg-gray-50 font-semibold">{header}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {auditCsvData.rows.map((row) => (
                                                        <tr key={row.id} className="hover:bg-orange-50/50 transition-colors">
                                                            {row.data.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="px-6 py-4 text-gray-600 whitespace-nowrap">{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                                            <button
                                                onClick={() => window.open(AuditService.getDownloadUrl(auditJobId), '_blank')}
                                                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                Download Audit Report
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ============ EMAIL GENERATION SECTION ============ */}
            <section id="email-generation" className="py-20 px-6 scroll-mt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div ref={emailHeaderRef} className="fade-in-view text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-medium mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                            Step 3
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Email Generation</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Generate personalized outreach emails powered by AI to engage your leads effectively.</p>
                    </div>

                    {/* Coming Soon Card */}
                    <div ref={emailCardRef} className="fade-in-view bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center hover-lift">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">AI-Powered Email Templates</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Create compelling, personalized emails that convert. Our AI analyzes your leads' SEO data to craft the perfect message.
                        </p>
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-medium">
                            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Coming Soon
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ SENDING SECTION ============ */}
            <section id="sending" className="py-20 px-6 bg-gradient-to-b from-gray-50 to-white scroll-mt-24">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div ref={sendingHeaderRef} className="fade-in-view text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-full text-sm font-medium mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            Step 4
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Email Sending</h2>
                        <p className="text-gray-500 max-w-xl mx-auto">Send your personalized emails at scale with automated follow-ups and tracking.</p>
                    </div>

                    {/* Coming Soon Card */}
                    <div ref={sendingCardRef} className="fade-in-view bg-white rounded-3xl shadow-xl border border-gray-100 p-12 text-center hover-lift">
                        <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4"></path>
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">Automated Email Campaigns</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Schedule and send email campaigns with smart follow-ups. Track opens, clicks, and responses in real-time.
                        </p>
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-100 text-teal-700 rounded-xl font-medium">
                            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Coming Soon
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ TRUSTED BY / FOOTER ============ */}
            <section className="py-16 px-6 border-t border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-sm text-gray-400 mb-6">Trusted by leading agencies and marketers</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
                        <span className="text-xl font-bold text-gray-300">Polymath</span>
                        <span className="text-xl font-bold text-gray-300">Epicurious</span>
                        <span className="text-xl font-bold text-gray-300">Acme Corp</span>
                        <span className="text-xl font-bold text-gray-300">Boltshift</span>
                    </div>
                </div>
            </section>
        </div>
    )
}
