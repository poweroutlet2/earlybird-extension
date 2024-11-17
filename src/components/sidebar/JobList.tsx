import { Button } from "~components/ui/button"
import { Label } from "~components/ui/label"
import Select from "~components/ui/select"
import { ArrowDown, ArrowUp, Filter } from "lucide-react"
import React, { useCallback, useMemo, useRef, useState } from "react"
import AutoSizer from "react-virtualized-auto-sizer"
import { VariableSizeList as List } from "react-window"

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

export const JobList: React.FC<JobListProps> = ({
  jobs,
  viewedJobs,
  filterOptions,
  error,
  onFilterClick
}) => {
  const [sortBy, setSortBy] = useStorage<string>("earlybird-sortBy", (v) =>
    v === undefined ? "listingDate" : v
  )
  const [sortDirection, setSortDirection] = useStorage<"asc" | "desc">(
    "earlybird-sort",
    (v) => (v === undefined ? "asc" : v)
  )

  const [hiddenJobs, setHiddenJobs] = useStorage<string[]>("earlybird-hiddenJobs", [])
  const listRef = useRef<List>(null)
  const rowHeights = useRef<{ [key: number]: number }>({})

  const sortByItems = useMemo(
    () => [
      { label: "Listing Date", value: "listingDate" },
      { label: "Salary", value: "salary" },
      { label: "Applicant Count", value: "applicantCount" }
    ],
    []
  )

  const handleSort = useCallback(
    (value: string) => {
      if (value === sortBy) {
        setSortDirection(sortDirection === "desc" ? "asc" : "desc")
      } else {
        setSortBy(value)
        setSortDirection("desc")
      }
    },
    [sortBy, sortDirection, setSortBy, setSortDirection]
  )

  const handleHideJob = useCallback((jobId: string) => {
    setHiddenJobs((prev) => [...prev, jobId])
  }, [setHiddenJobs])

  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs.filter((job) => {
      if (hiddenJobs.includes(job.jobId)) {
        return false
      }

      const isNotViewed = !filterOptions.excludeViewed || !viewedJobs.has(job.jobId);

      const matchesIncludeKeywords = filterOptions.includeKeywords.length === 0 || 
        filterOptions.includeKeywords.some(keyword =>
          job.title?.toLowerCase().includes(keyword.toLowerCase()) ||
          job.company?.toLowerCase().includes(keyword.toLowerCase()) ||
          job.description?.toLowerCase().includes(keyword.toLowerCase())
        );

      const hasExcludedKeyword = filterOptions.excludeKeywords.some(keyword =>
        job.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        job.company?.toLowerCase().includes(keyword.toLowerCase()) ||
        job.description?.toLowerCase().includes(keyword.toLowerCase())
      );

      const matchesCompany = filterOptions.companies.length === 0 || 
        filterOptions.companies.includes(job.company);

      const matchesLocation = filterOptions.locations.length === 0 ||
        filterOptions.locations.includes(job.location) ||
        (filterOptions.locations.includes("Remote") && job.remote);

      const isNotPromoted = !filterOptions.excludePromoted || !job.promoted;

      const matchesReposted = !filterOptions.showReposted || job.reposted;

      const matchesApplyMethod = 
        (job.easyApply && filterOptions.showEasyApply) || 
        (!job.easyApply && filterOptions.showExternal);

      return matchesIncludeKeywords && !hasExcludedKeyword && matchesCompany && 
        matchesLocation && isNotPromoted && matchesReposted && matchesApplyMethod && isNotViewed;
    });

    return sortJobs(filtered, sortBy, sortDirection);
  }, [jobs, filterOptions, hiddenJobs, sortBy, sortDirection, viewedJobs]);

  const getRowHeight = useCallback((index: number) => {
    return (rowHeights.current[index] || 200) + 16 // Add 16px for the bottom margin
  }, [])

  const setRowHeight = useCallback((index: number, size: number) => {
    listRef.current?.resetAfterIndex(0)
    rowHeights.current = { ...rowHeights.current, [index]: size }
  }, [])

  const renderJob = useCallback(
    ({ index, style }) => (
      <div style={{ ...style, paddingRight: "16px", paddingBottom: "16px" }}>
        <div
          ref={(el) => {
            if (
              el &&
              el.getBoundingClientRect().height !== rowHeights.current[index]
            ) {
              setRowHeight(index, el.getBoundingClientRect().height)
            }
          }}>
          <JobCard job={filteredAndSortedJobs[index]} viewed={viewedJobs.has(filteredAndSortedJobs[index].jobId)} onHide={handleHideJob} />
        </div>
      </div>
    ),
    [filteredAndSortedJobs, setRowHeight, handleHideJob]
  )

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
          <Select items={sortByItems} onSelect={handleSort} value={sortBy} />
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
