import { Button } from "~components/ui/button"
import { Label } from "~components/ui/label"
import Select from "~components/ui/select"
import { ArrowDown, ArrowUp, Filter } from "lucide-react"
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { VariableSizeList as List } from "react-window"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~components/ui/tooltip"
import debounce from "lodash/debounce"

import { useStorage } from "@plasmohq/storage/hook"

import type { JobPosting } from "~db"

import { JobCard } from "./JobCard"
import { sortJobs } from "./utils"

interface JobListProps {
  jobs: JobPosting[]
  viewedJobs: Set<string>
  filterOptions: {
    excludeKeywords: string[]
    includeKeywords: string[]
    companies: string[]
    locations: string[]
    excludePromoted: boolean
    excludeViewed: boolean
    showReposted: boolean
    showEasyApply: boolean
    showExternal: boolean
  }
  error: string | null
  onFilterClick?: () => void
}

// Memoize row height calculations
const ESTIMATED_ROW_HEIGHT = 216;
const getEstimatedRowHeight = (index: number) => ESTIMATED_ROW_HEIGHT;

export const JobList: React.FC<JobListProps> = ({
  jobs,
  viewedJobs,
  filterOptions,
  error,
  onFilterClick
}) => {
  const [sortBy, setSortBy] = useStorage<string>("earlybird-sortBy", (v) =>
    v === undefined ? "earlyBirdScore" : v
  )
  const [sortDirection, setSortDirection] = useStorage<"asc" | "desc">(
    "earlybird-sort",
    (v) => {
      if (v === undefined) {
        // Set initial direction based on sort type
        return sortBy === "applicantCount" ? "asc" : "desc"
      }
      return v
    }
  )

  const [hiddenJobs, setHiddenJobs] = useStorage<string[]>("earlybird-hiddenJobs", [])
  const [scrollPosition, setScrollPosition] = useStorage<number>("earlybird-scrollPosition", 0)
  const listRef = useRef<List>(null)
  const rowHeights = useRef<{ [key: number]: number }>({})
  const isInitialMount = useRef(true)

  // Cleanup function to clear refs and caches
  useEffect(() => {
    return () => {
      rowHeights.current = {}
      isInitialMount.current = false
    }
  }, [])

  // Restore scroll position when component mounts or jobs change
  useEffect(() => {
    if (!listRef.current || !jobs.length || !isInitialMount.current || scrollPosition <= 0) return;

    const timeoutId = setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTo(scrollPosition)
        isInitialMount.current = false
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [jobs, scrollPosition])

  // Reset scroll position when filters or sort changes
  useEffect(() => {
    if (!isInitialMount.current) {
      setScrollPosition(0)
      if (listRef.current) {
        listRef.current.scrollTo(0)
        listRef.current.resetAfterIndex(0)
      }
    }
  }, [filterOptions, sortBy, sortDirection])

  // Optimize scroll handler with throttling instead of debouncing
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    // Only update if scroll position changed significantly (more than 100px)
    if (Math.abs(scrollOffset - scrollPosition) > 100) {
      setScrollPosition(scrollOffset)
    }
  }, [scrollPosition, setScrollPosition])

  const sortByItems = useMemo(
    () => [
      { label: "EarlyBird Score", value: "earlyBirdScore" },
      { label: "Listing Date", value: "listingDate" },
      { label: "Salary", value: "salary" },
      { label: "Applicant Count", value: "applicantCount" },
      { label: "Networking", value: "networking" }
    ],
    []
  )

  const handleSort = useCallback(
    (value: string) => {
      if (value === sortBy) {
        setSortDirection(sortDirection === "desc" ? "asc" : "desc")
      } else {
        setSortBy(value)
        // Default to ascending for applicant count, descending for everything else
        setSortDirection(value === "applicantCount" ? "asc" : "desc")
      }
    },
    [sortBy, sortDirection, setSortBy, setSortDirection]
  )

  const handleHideJob = useCallback((jobId: string) => {
    setHiddenJobs((prev) => [...prev, jobId])
  }, [setHiddenJobs])

  // Optimize filtering and sorting with better memoization
  const filteredAndSortedJobs = useMemo(() => {
    const hiddenJobsSet = new Set(hiddenJobs)
    const includeKeywordsLower = filterOptions.includeKeywords.map(k => k.toLowerCase())
    const excludeKeywordsLower = filterOptions.excludeKeywords.map(k => k.toLowerCase())
    const companiesSet = new Set(filterOptions.companies)
    const locationsSet = new Set(filterOptions.locations)

    const filtered = jobs.filter((job) => {
      if (hiddenJobsSet.has(job.jobId)) return false
      if (filterOptions.excludeViewed && viewedJobs.has(job.jobId)) return false
      if (filterOptions.excludePromoted && job.promoted) return false
      if (!filterOptions.showReposted && job.reposted) return false
      if (job.easyApply && !filterOptions.showEasyApply) return false
      if (!job.easyApply && !filterOptions.showExternal) return false

      const jobTextLower = `${job.title?.toLowerCase() || ''} ${job.company?.toLowerCase() || ''} ${job.description?.toLowerCase() || ''}`

      if (includeKeywordsLower.length && !includeKeywordsLower.some(k => jobTextLower.includes(k))) {
        return false
      }

      if (excludeKeywordsLower.some(k => jobTextLower.includes(k))) {
        return false
      }

      if (companiesSet.size && !companiesSet.has(job.company)) {
        return false
      }

      if (locationsSet.size && !locationsSet.has(job.location) && !(locationsSet.has("Remote") && job.remote)) {
        return false
      }

      return true
    })

    return sortJobs(filtered, sortBy, sortDirection)
  }, [jobs, hiddenJobs, filterOptions, sortBy, sortDirection, viewedJobs])

  const getRowHeight = useCallback((index: number) => {
    return (rowHeights.current[index] || ESTIMATED_ROW_HEIGHT) + 8 // Add margin to height calculation
  }, [])

  const setRowHeight = useCallback((index: number, size: number) => {
    if (rowHeights.current[index] !== size) {
      rowHeights.current[index] = size
      listRef.current?.resetAfterIndex(index)
    }
  }, [])

  // Memoize the job renderer to prevent unnecessary re-renders
  const renderJob = useMemo(() => {
    return ({ index, style }) => (
      <div style={{ 
        ...style, 
        paddingRight: "16px",
        paddingBottom: "16px",
        marginBottom: "8px"
      }}>
        <div
          ref={(el) => {
            if (el) {
              const height = el.getBoundingClientRect().height
              if (height !== rowHeights.current[index]) {
                setRowHeight(index, height)
              }
            }
          }}>
          <JobCard 
            job={filteredAndSortedJobs[index]} 
            viewed={viewedJobs.has(filteredAndSortedJobs[index].jobId)} 
            onHide={handleHideJob} 
          />
        </div>
      </div>
    )
  }, [filteredAndSortedJobs, viewedJobs, handleHideJob, setRowHeight])

  const isFiltered = filterOptions.includeKeywords.length > 0 || 
    filterOptions.excludeKeywords.length > 0 || 
    filterOptions.companies.length > 0 || 
    filterOptions.locations.length > 0 ||
    filterOptions.excludePromoted ||
    filterOptions.excludeViewed ||
    filterOptions.showReposted ||
    !filterOptions.showEasyApply ||
    !filterOptions.showExternal;

  return (
    <div className="earlybird-job-finder flex-1 overflow-y-hidden py-6 pl-6">
      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-lg">Recommended Jobs</h3>
            <span className="text-sm text-muted-foreground">
              ({filteredAndSortedJobs.length})
            </span>
          </div>
          {isFiltered && (
            <button 
              onClick={onFilterClick}
              className="flex items-center mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="h-4 w-4 mr-1" />
              <span>Filters applied</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="sort-by" className="text-sm font-medium">
            Sort by:
          </Label>
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <div>
                  <Select items={sortByItems} onSelect={handleSort} value={sortBy} />
                </div>
              </TooltipTrigger>
              {sortBy === "earlyBirdScore" && (
                <TooltipContent className="text-[1rem] ml-24 mt-10 max-w-[300px]">
                  <p>The EarlyBird score takes into account the posting date, applicant count, and number of networking opportunities at the company.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            size="icon"
            onClick={() =>
              setSortDirection(sortDirection === "desc" ? "asc" : "desc")
            }>
            {sortDirection === "desc" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-[calc(100vh-150px)] overflow-hidden">
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                itemCount={filteredAndSortedJobs.length}
                itemSize={getRowHeight}
                width={width}
                onScroll={handleScroll}
                initialScrollOffset={scrollPosition}
                className="earlybird-job-finder scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                {renderJob}
              </List>
            )}
          </AutoSizer>
        </div>
        {!jobs ||
          (jobs.length === 0 && (
            <div
              className="bg-red-100 text-base border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert">
              <span className="block sm:inline">
                No results found. Make sure you have "Open to Work" turned on in
                your LinkedIn preferences. This allows EarlyBird find jobs and
                can be set to be visible to recruiters only.
                <br />
                <br />
                <a
                  className="underline"
                  href="https://www.linkedin.com/help/linkedin/feature-launcher/urn:li:helpCenterArticle:(507508,LITHOGRAPH)?trk=search_feature_launcher">
                  Click here to go to the settings page
                </a>
                <br />
                <br />
                <a
                  className="underline"
                  href="https://www.linkedin.com/help/linkedin/answer/a507508/let-recruiters-know-you-re-open-to-work?lang=en#:~:text=All%20LinkedIn%20Members,complete%20privacy.">
                  Click here to learn more about "Open to Work"
                </a>
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}
