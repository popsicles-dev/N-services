import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LeadService from '../services/LeadService'
import AuditService from '../services/AuditService'

export default function LeadGeneration() {
    const navigate = useNavigate()
    const [keyword, setKeyword] = useState('')
    const [location, setLocation] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [results, setResults] = useState(null)
    const [jobId, setJobId] = useState(null)
    const [error, setError] = useState(null)

    // Data State: { headers: [], rows: [{id: 0, data: [...]}] }
    const [csvData, setCsvData] = useState({ headers: [], rows: [] })

    const [enriching, setEnriching] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState(0)
    const [isEnriched, setIsEnriched] = useState(false)

    // Filtering State
    const [filterText, setFilterText] = useState('')
    const [activeColumnFilters, setActiveColumnFilters] = useState(new Set())

    // Selection State
    const [selectedIds, setSelectedIds] = useState(new Set())
    const isMounted = useRef(false)

    // State Persistence
    useEffect(() => {
        const savedState = sessionStorage.getItem('leadGenState')
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState)
                setKeyword(parsed.keyword || '')
                setLocation(parsed.location || '')
                setResults(parsed.results || null)
                // Don't restore csvData directly, re-fetch it if jobId exists
                // setCsvData(parsed.csvData || { headers: [], rows: [] }) 
                setSelectedIds(new Set(parsed.selectedIds || []))
                setIsEnriched(parsed.isEnriched || false)
                setFilterText(parsed.filterText || '')
                setActiveColumnFilters(new Set(parsed.activeColumnFilters || []))

                if (parsed.jobId) {
                    setJobId(parsed.jobId)
                    // Re-fetch CSV data
                    LeadService.fetchCsvPreview(parsed.jobId).then(data => {
                        setCsvData(data)
                    }).catch(err => console.error("Failed to restore CSV data", err))
                }
            } catch (e) {
                console.error("Failed to restore state", e)
            }
        }
    }, [])

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true
            return
        }

        const stateToSave = {
            keyword,
            location,
            results,
            // csvData, // Too large, don't save
            selectedIds: Array.from(selectedIds),
            isEnriched,
            filterText,
            activeColumnFilters: Array.from(activeColumnFilters),
            jobId
        }
        try {
            sessionStorage.setItem('leadGenState', JSON.stringify(stateToSave))
        } catch (e) {
            console.error("Failed to save state", e)
        }
    }, [keyword, location, results, selectedIds, isEnriched, filterText, activeColumnFilters, jobId])

    const handleSearch = async () => {
        if (!keyword || !location) return

        setLoading(true)
        setError(null)
        setProgress(10)
        setResults(null)
        setCsvData({ headers: [], rows: [] })
        setResults(null)
        setCsvData({ headers: [], rows: [] })
        setSelectedIds(new Set())
        setIsEnriched(false)

        try {
            // Start extraction job
            const data = await LeadService.extractUrls(keyword, location)

            setJobId(data.job_id)
            setProgress(50)

            // Poll for results
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

            // If leads are selected, create a partial CSV and upload it
            if (selectedIds.size > 0) {
                const selectedRows = csvData.rows
                    .filter(row => selectedIds.has(row.id))
                    .map(row => row.data)

                const csv = LeadService.generateCsv(csvData.headers, selectedRows)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const file = new File([blob], `selected_leads_enrich_${Date.now()}.csv`, { type: 'text/csv' })

                // Reuse upload logic
                const uploadData = await AuditService.uploadFile(file)
                filenameToUse = uploadData.filename
            }

            const data = await LeadService.enrichContacts(filenameToUse)

            const enrichJobId = data.job_id
            pollEnrichStatus(enrichJobId)

        } catch (err) {
            setError('Failed to start enrichment: ' + (err.response?.data?.detail || err.message))
            setEnriching(false)
        }
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

                    // Update results with new file
                    setResults(prev => ({
                        ...prev,
                        result_file: job.result_file
                    }))

                    // Refresh preview with enriched data
                    fetchCsvPreview(id)

                    // Update the main job ID for download button to point to the enriched file
                    setJobId(id)

                } else if (job.status === 'failed') {
                    clearInterval(interval)
                    setEnriching(false)
                    setError('Enrichment failed: ' + job.error)
                } else {
                    // Fake progress
                    setEnrichProgress(prev => Math.min(prev + 2, 95))
                }
            } catch (err) {
                clearInterval(interval)
                setEnriching(false)
                setError('Error checking enrichment status')
            }
        }, 2000)
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
                    // Fake progress increment while waiting
                    setProgress(prev => Math.min(prev + 5, 90))
                }
            } catch (err) {
                clearInterval(interval)
                setLoading(false)
                setError('Error checking status')
            }
        }, 2000)
    }

    const handleDownload = () => {
        if (jobId) {
            window.open(LeadService.getDownloadUrl(jobId), '_blank')
        }
    }

    const handleDownloadSelected = () => {
        if (selectedIds.size === 0 || csvData.rows.length === 0) return

        // Filter rows
        const selectedRows = csvData.rows
            .filter(row => selectedIds.has(row.id))
            .map(row => row.data)

        // Generate CSV string
        const csv = LeadService.generateCsv(csvData.headers, selectedRows)

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `selected_leads_${new Date().getTime()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const fetchCsvPreview = async (id) => {
        try {
            const data = await LeadService.fetchCsvPreview(id)
            setCsvData(data)
            setSelectedIds(new Set()) // Reset selection on new data
        } catch (err) {
            console.error("Failed to fetch CSV preview", err)
        }
    }

    // Filter Logic


    const filteredRows = useMemo(() => {
        if (csvData.rows.length === 0) return []

        return csvData.rows.filter(row => {
            // 1. Global Search
            const matchesSearch = filterText === '' || row.data.some(cell =>
                cell && cell.toString().toLowerCase().includes(filterText.toLowerCase())
            )

            // 2. Multi-Column Filter (AND Logic)
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

    // Stats Calculation
    const stats = useMemo(() => {
        if (!csvData.headers || filteredRows.length === 0) return { emails: 0, phones: 0, facebook: 0, instagram: 0, twitter: 0, linkedin: 0 }

        const emailIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('email'))
        const phoneIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('phone'))

        const fbIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('facebook'))
        const instaIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('instagram'))
        const twitterIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('twitter'))
        const linkedinIdx = csvData.headers.findIndex(h => h.toLowerCase().includes('linkedin'))

        let emails = 0
        let phones = 0
        let facebook = 0
        let instagram = 0
        let twitter = 0
        let linkedin = 0

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

    const DUMMY_STATS = { emails: 0, phones: 0, facebook: 0, instagram: 0, twitter: 0, linkedin: 0 }
    const currentStats = results ? stats : DUMMY_STATS

    const toggleColumnFilter = (index) => {
        const newFilters = new Set(activeColumnFilters)
        if (newFilters.has(index)) {
            newFilters.delete(index)
        } else {
            newFilters.add(index)
        }
        setActiveColumnFilters(newFilters)
    }

    // Selection Logic
    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const toggleSelectAll = () => {
        const allFilteredIds = filteredRows.map(row => row.id)
        const allSelected = allFilteredIds.every(id => selectedIds.has(id))
        const newSelected = new Set(selectedIds)

        if (allSelected) {
            allFilteredIds.forEach(id => newSelected.delete(id))
        } else {
            allFilteredIds.forEach(id => newSelected.add(id))
        }
        setSelectedIds(newSelected)
    }

    const isAllFilteredSelected = filteredRows.length > 0 && filteredRows.every(row => selectedIds.has(row.id))
    const isSomeFilteredSelected = filteredRows.length > 0 && filteredRows.some(row => selectedIds.has(row.id)) && !isAllFilteredSelected

    // Dummy Data
    const DUMMY_HEADERS = ["Business Name", "Phone", "Email", "Website", "Instagram", "Facebook", "Twitter", "LinkedIn"]
    const DUMMY_ROWS = [
        ["Example Plumbing", "555-0123", "contact@example.com", "example.com", "@example", "fb.com/example", "N/A", "linkedin.com/company/example"],
        ["City Bakery", "555-0987", "info@citybakery.com", "citybakery.com", "@citybakery", "fb.com/citybakery", "@citybakery_tweets", "N/A"],
        ["Tech Solutions", "555-4567", "hello@techsol.io", "techsol.io", "N/A", "fb.com/techsol", "@techsol", "linkedin.com/company/techsol"]
    ]

    // Export Logic
    const [showExportMenu, setShowExportMenu] = useState(false)

    const handleExport = (count = null) => {
        if (csvData.rows.length === 0) return
        let rowsToExport = []

        if (count === 'selected') {
            rowsToExport = csvData.rows.filter(row => selectedIds.has(row.id)).map(row => row.data)
        } else if (count === 'all' || count === null) {
            rowsToExport = csvData.rows.map(row => row.data)
        } else {
            rowsToExport = csvData.rows.slice(0, count).map(row => row.data)
        }

        if (rowsToExport.length === 0) return
        if (rowsToExport.length === 0) return
        const csv = LeadService.generateCsv(csvData.headers, rowsToExport)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `leads_export_${new Date().getTime()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setShowExportMenu(false)
    }

    return (
        <div className="max-w-screen-2xl mx-auto pb-20" >
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Discover high-intent prospects and audit their websites in one click.</h2>
            </div>

            {/* Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8" >
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="keyword">Keyword</label>
                    <input
                        className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-primary focus:border-primary transition p-2.5"
                        id="keyword"
                        placeholder="e.g., 'plumbers'"
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="location">Location</label>
                    <input
                        className="form-input w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-primary focus:border-primary transition p-2.5"
                        id="location"
                        placeholder="e.g., 'Dallas, TX'"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>
            </div >

            {/* Top Action Bar */}
            < div className="mb-8" >
                <button
                    onClick={handleSearch}
                    disabled={loading || enriching}
                    className={`flex items-center justify-center rounded-lg h-11 px-8 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm ${loading || enriching ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    <span className="truncate">{loading ? 'Scraping...' : 'Scrape Leads'}</span>
                </button>
            </div >

            {/* Error Message */}
            {
                error && (
                    <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                        {error}
                    </div>
                )
            }

            {/* Progress Bars */}
            {
                loading && (
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Scraping in progress...</p>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{progress}%</p>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )
            }
            {
                enriching && (
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Enriching contacts...</p>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{enrichProgress}%</p>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${enrichProgress}%` }}></div>
                        </div>
                    </div>
                )
            }

            {/* Unified Results Container */}
            <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl shadow-sm overflow-hidden mb-8 backdrop-blur-sm flex flex-col min-h-[500px]">

                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {results ? "Results Found" : "Example Output"}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {results
                                    ? `Found ${results.total_items} businesses (${results.processed_items} processed)`
                                    : "This is how your leads will look."
                                }
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2 mr-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    {currentStats.emails}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                    {currentStats.phones}
                                </div>
                                {/* Socials */}
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800" title="Facebook">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                                    {currentStats.facebook}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-lg text-xs font-bold border border-pink-200 dark:border-pink-800" title="Instagram">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" strokeWidth="2"></rect><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" strokeWidth="2"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeWidth="2"></line></svg>
                                    {currentStats.instagram}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700" title="Twitter/X">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path></svg>
                                    {currentStats.twitter}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800" title="LinkedIn">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                    {currentStats.linkedin}
                                </div>
                            </div>
                            <button
                                onClick={handleEnrich}
                                disabled={!results || loading || enriching || isEnriched}
                                className={`flex items-center justify-center rounded-lg h-10 px-6 bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-sm ${(!results || loading || enriching || isEnriched) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                <span className="truncate">{isEnriched ? 'Enriched' : (selectedIds.size > 0 ? `Enrich Selected (${selectedIds.size})` : 'Enrich Leads')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    {results && csvData.headers.length > 0 && (
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                    placeholder="Search contacts..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                />
                            </div>
                            {activeColumnFilters.size > 0 && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                                    <span>Filtering by: <strong>{Array.from(activeColumnFilters).map(i => csvData.headers[i]).join(', ')}</strong></span>
                                    <button onClick={() => setActiveColumnFilters(new Set())} className="hover:text-blue-800 dark:hover:text-blue-300 ml-1">
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto flex-1 overflow-y-auto">
                    {results ? (
                        csvData.rows.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50/50 dark:bg-gray-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 bg-gray-50 dark:bg-gray-800 w-10">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={isAllFilteredSelected}
                                                ref={input => {
                                                    if (input) input.indeterminate = isSomeFilteredSelected
                                                }}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        {csvData.headers.map((header, index) => (
                                            <th
                                                key={index}
                                                className={`px-6 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group select-none ${activeColumnFilters.has(index) ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                onClick={() => toggleColumnFilter(index)}
                                                title="Click to filter rows with values in this column"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {header}
                                                    <svg className={`h-3 w-3 transition-opacity ${activeColumnFilters.has(index) ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.length > 0 ? (
                                        filteredRows.map((row) => (
                                            <tr key={row.id} className={`border-b dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 ${selectedIds.has(row.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                                <td className="px-6 py-4 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        checked={selectedIds.has(row.id)}
                                                        onChange={() => toggleSelect(row.id)}
                                                    />
                                                </td>
                                                {row.data.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="px-6 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={csvData.headers.length + 1} className="px-6 py-8 text-center text-gray-500">
                                                No results match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                <p>Download the CSV to view full details and enrich contacts.</p>
                            </div>
                        )
                    ) : (
                        /* Dummy Table */
                        <table className="w-full text-sm text-left opacity-60">
                            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50/50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 w-10">
                                        <input type="checkbox" disabled className="rounded border-gray-300 text-gray-400 cursor-not-allowed" />
                                    </th>
                                    {DUMMY_HEADERS.map((header, index) => (
                                        <th key={index} className="px-6 py-3 whitespace-nowrap bg-gray-50 dark:bg-gray-800 text-gray-400">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DUMMY_ROWS.map((row, i) => (
                                    <tr key={i} className="border-b dark:border-gray-800">
                                        <td className="px-6 py-4 w-10">
                                            <input type="checkbox" disabled className="rounded border-gray-300 text-gray-400 cursor-not-allowed" />
                                        </td>
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-6 py-4 text-gray-400 whitespace-nowrap">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 3. Footer Action Bar */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center sticky bottom-0">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                disabled={!results}
                                className={`flex items-center justify-center rounded-lg h-10 px-4 text-sm font-bold transition-colors bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm ${!results ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                <span>{selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export CSV'}</span>
                                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showExportMenu && results && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                    <div className="py-1" role="menu">
                                        <button
                                            onClick={() => handleExport('selected')}
                                            disabled={selectedIds.size === 0}
                                            className={`block w-full text-left px-4 py-2 text-sm ${selectedIds.size === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                            role="menuitem"
                                        >
                                            Export Selected ({selectedIds.size})
                                        </button>
                                        <button
                                            onClick={() => handleExport(10)}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            role="menuitem"
                                        >
                                            Export Top 10
                                        </button>
                                        <button
                                            onClick={() => handleExport(50)}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            role="menuitem"
                                        >
                                            Export Top 50
                                        </button>
                                        <button
                                            onClick={() => handleExport('all')}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            role="menuitem"
                                        >
                                            Export All
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {results && (
                            <p className="text-xs text-gray-500">Showing {filteredRows.length} of {csvData.rows.length} rows.</p>
                        )}
                    </div>

                    <button
                        onClick={async () => {
                            if (!results) return

                            let filenameToUse = results.result_file

                            // If leads are selected, create a partial CSV and upload it
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
                                    console.error("Failed to upload selected leads", err)
                                    setError("Failed to prepare selected leads for audit.")
                                    return
                                }
                            }

                            navigate('/seo-audit', { state: { filename: filenameToUse } })
                        }}
                        disabled={!results || loading || enriching}
                        className={`flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm ${(!results || loading || enriching) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <span className="truncate">{selectedIds.size > 0 ? `Audit Selected (${selectedIds.size})` : 'Proceed to SEO Audit'}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
