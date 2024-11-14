import { Button } from "~components/ui/button"
import { createTRPCProxyClient } from "@trpc/client"
import cssText from "data-text:~style.css"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  RefreshCcw,
  MessageCircleMoreIcon
} from "lucide-react"
import type { PlasmoCSConfig } from "plasmo"
import React, { useCallback, useEffect, useState } from "react"
import { chromeLink } from "trpc-chrome/link"

import { useStorage } from "@plasmohq/storage/hook"

import type { JobPosting } from "~db"
import { FilterSection } from "~components/sidebar/FilterSection"
import { JobList } from "~components/sidebar/JobList"
import { formatListingDate } from "~components/sidebar/utils"
import { FeedbackForm } from "~components/sidebar/FeedbackForm"

import type { AppRouter } from "./background"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~components/ui/tooltip"

const port = chrome.runtime.connect()
export const chromeClient = createTRPCProxyClient<AppRouter>({
  links: [chromeLink({ port })]
})

export const config: PlasmoCSConfig = {
  matches: ["https://*.linkedin.com/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function App() {
  const [isOpen, setIsOpen] = useStorage("earlybird-isOpen", (v) =>
    v === undefined ? false : v
  )
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeKeywords, setIncludeKeywords] = useStorage<string[]>("earlybird-includeKeywords", [])
  const [excludeKeywords, setExcludeKeywords] = useStorage<string[]>("earlybird-excludeKeywords", [])
  const [filterOptions, setFilterOptions] = useStorage("earlybird-filterOptions", {
    companies: [],
    locations: [],
    excludePromoted: false,
    showReposted: false,
    showEasyApply: true,
    showExternal: true
  })
  const [isFiltersExpanded, setIsFiltersExpanded] = useStorage("earlybird-isFiltersExpanded", false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const toggleSidebar = useCallback(
    () => setIsOpen(!isOpen),
    [isOpen, setIsOpen]
  )

  useEffect(() => {
    const fetchJobs = async () => {
      setJobs((await chromeClient.getSavedJobs.query()) as JobPosting[])
    }
    fetchJobs()
  }, [])

  const refreshJobs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const fetchedJobs = await chromeClient.refreshJobs.query()
      setJobs(fetchedJobs as JobPosting[])
    } catch (err) {
      setError("Failed to fetch jobs. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleFeedbackSubmit = async (feedback: {
    type: string
    email: string
    subject: string
    description: string
  }) => {
    try {
      await chromeClient.submitFeedback.mutate({ feedback })
    } catch (error) {
      console.error("Failed to submit feedback:", error)
    }
  }

  return (
    <div
      className={`fixed bg-bg border-l-8 border-black inset-y-0 right-0 w-full max-w-[34%] min-w-[40rem] drop-shadow-2xl flex flex-col transition-transform duration-200 ease-in-out p-1 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>
      <Button
      className="absolute -left-28 top-[3%] h-20 bg-main"
        onClick={toggleSidebar}>
        {isOpen ? (
          <ChevronRight className="h-10 w-10" />
        ) : (
          <ChevronLeft className="h-10 w-10" />
        )}
      </Button>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 py-2 border-b bg-gradient-to-r from-primary to-primary-foreground text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold">EarlyBird Job Finder</h2>
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => setIsFeedbackOpen(true)}
                    className="h-8 w-8 justify-self-start fill-white">
                    <MessageCircleMoreIcon className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
            <TooltipContent className="text-[1rem] ml-44">
                <p>Give some feedback!</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {isFiltersExpanded ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Button onClick={refreshJobs} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Refresh Jobs
                </>
              )}
            </Button>
            {jobs && jobs.length > 0 && (
              <p className="text-xs text-primary-foreground/80 mt-2">
                Last refreshed: {formatListingDate(jobs[0].runId).text}
              </p>
            )}
          </div>
        </div>
        <div className={`overflow-auto earlybird-job-finder transition-all duration-300 ease-in-out ${isFiltersExpanded ? 'max-h-[600px]' : 'max-h-0'}`}>
          <FilterSection
            filterOptions={filterOptions}
            setFilterOptions={setFilterOptions}
            includeKeywords={includeKeywords}
            setIncludeKeywords={setIncludeKeywords}
            jobs={jobs}
            onCollapse={() => setIsFiltersExpanded(false)}
            isExpanded={isFiltersExpanded}
          />
        </div>
        <JobList
          jobs={jobs}
          filterOptions={{
            ...filterOptions,
            excludeKeywords,
            includeKeywords
          }}
          error={error}
          onFilterClick={() => setIsFiltersExpanded(true)}
        />
      </div>
      <FeedbackForm
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  )
}
