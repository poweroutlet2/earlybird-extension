import { Badge } from "~components/ui/badge"
import { Button } from "~components/ui/button"
import { Checkbox } from "~components/ui/checkbox"
import { Input } from "~components/ui/input"
import { Label } from "~components/ui/label"
import { ScrollArea } from "~components/ui/scroll-area"
import React, { useMemo, useState, useCallback } from "react"
import { Switch } from "~components/ui/switch"
import { ChevronUp } from "lucide-react"
import { useStorage } from "@plasmohq/storage/hook"

import type { JobPosting } from "~db"

interface FilterSectionProps {
  filterOptions: {
    companies: string[] 
    locations: string[]
    excludePromoted: boolean
    showReposted: boolean
  }
  setFilterOptions: React.Dispatch<
    React.SetStateAction<{
      companies: string[]
      locations: string[]
      excludePromoted: boolean
      showReposted: boolean
    }>
  >
  includeKeywords: string[]
  setIncludeKeywords: React.Dispatch<React.SetStateAction<string[]>>
  jobs: JobPosting[]
  onCollapse: () => void
  isExpanded: boolean
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  filterOptions,
  setFilterOptions,
  includeKeywords,
  setIncludeKeywords,
  jobs,
  onCollapse,
  isExpanded
}) => {
  const [includeKeyword, setIncludeKeyword] = useState("")
  const [excludeKeyword, setExcludeKeyword] = useState("")
  const [excludeKeywords, setExcludeKeywords] = useStorage<string[]>("earlybird-excludeKeywords", [])

  const addIncludeKeyword = () => {
    if (includeKeyword.trim()) {
      setIncludeKeywords((prev) => [...prev, includeKeyword.trim()])
      setIncludeKeyword("")
    }
  }

  const removeIncludeKeyword = (keyword: string) => {
    setIncludeKeywords((prev) => prev.filter((k) => k !== keyword))
  }

  const handleIncludeKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addIncludeKeyword()
    }
  }

  const addExcludeKeyword = () => {
    if (excludeKeyword.trim()) {
      setExcludeKeywords((prev) => [...prev, excludeKeyword.trim()])
      setExcludeKeyword("")
    }
  }

  // Add this new function to handle key press
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addExcludeKeyword()
    }
  }

  const removeExcludeKeyword = (keyword: string) => {
    setExcludeKeywords((prev) => prev.filter((k) => k !== keyword))
  }

  const toggleCompanyFilter = (company: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      companies: prev.companies.includes(company)
        ? prev.companies.filter((c) => c !== company)
        : [...prev.companies, company]
    }))
  }

  const toggleLocationFilter = (location: string) => {
    setFilterOptions((prev) => ({
      ...prev,
      locations: prev.locations.includes(location)
        ? prev.locations.filter((l) => l !== location)
        : [...prev.locations, location]
    }))
  }

  // Memoize the filtered jobs to avoid recalculating for each count
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesExcludeKeywords = !excludeKeywords.some(keyword =>
        job.title?.toLowerCase().includes(keyword.toLowerCase()) ||
        job.company?.toLowerCase().includes(keyword.toLowerCase()) ||
        job.description?.toLowerCase().includes(keyword.toLowerCase())
      );
      const matchesPromoted = !filterOptions.excludePromoted || !job.promoted;
      return matchesExcludeKeywords && matchesPromoted;
    });
  }, [jobs, excludeKeywords, filterOptions.excludePromoted]);

  // Optimize getFilteredCount to use the memoized filteredJobs
  const getFilteredCount = useCallback((type: 'company' | 'location', value: string) => {
    return filteredJobs.filter(job => {
      if (type === 'company') {
        const matchesLocation = filterOptions.locations.length === 0 ||
          filterOptions.locations.includes(job.location) ||
          (filterOptions.locations.includes("Remote") && job.remote);
        return job.company === value && matchesLocation;
      } else {
        const matchesCompany = filterOptions.companies.length === 0 ||
          filterOptions.companies.includes(job.company);
        const matchesThisLocation = 
          (job.location === value) || 
          (value === 'Remote' && job.location.toLowerCase().includes('remote'));
        return matchesThisLocation && matchesCompany;
      }
    }).length;
  }, [filteredJobs, filterOptions.companies, filterOptions.locations]);

  const companyOptions = useMemo(() => {
    const companies = new Map<string, number>();
    for (const job of filteredJobs) {
      if (!companies.has(job.company)) {
        companies.set(job.company, getFilteredCount('company', job.company));
      }
    }
    return Array.from(companies.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredJobs, getFilteredCount]);

  const locationOptions = useMemo(() => {
    const locations = new Map<string, number>();
    for (const job of filteredJobs) {
      const locationKey = job.location.toLowerCase().includes('remote') ? 'Remote' : job.location;
      if (!locations.has(locationKey)) {
        locations.set(locationKey, getFilteredCount('location', locationKey));
      }
    }
    return Array.from(locations.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredJobs, getFilteredCount]);

  const toggleAllCompanies = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      companies: checked ? companyOptions.map(({ company }) => company) : []
    }))
  }

  const toggleAllLocations = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      locations: checked ? locationOptions.map(({ location }) => location) : []
    }))
  }

  // Add this new function to handle the excludePromoted checkbox
  const toggleExcludePromoted = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      excludePromoted: checked
    }))
  }

  // Add this new function to handle the showReposted checkbox
  const toggleShowReposted = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      showReposted: checked
    }))
  }

  return (
    <div className={`p-6 pt-0 border-2 border-black space-y-4 relative ${isExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      <Button
        onClick={onCollapse}
        className="absolute top-2 right-2 p-1"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <div>
        <Label htmlFor="include-keywords" className="text-base">Include Keywords:</Label>
        <div className="flex space-x-2">
          <Input
            id="include-keywords"
            placeholder="Enter keyword to include in job title, company name, or description"
            value={includeKeyword}
            onChange={(e) => setIncludeKeyword(e.target.value)}
            onKeyPress={handleIncludeKeyPress}
          />
          <Button 
            onClick={addIncludeKeyword}
            className="bg-green-200 text-green-800 hover:bg-green-300"
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {includeKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="bg-green-200 text-green-800">
              {keyword}
              <button
                className="ml-1 text-xs"
                onClick={() => removeIncludeKeyword(keyword)}>
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="exclude-keywords" className="text-base">Exclude Keywords:</Label>
        <div className="flex space-x-2">
          <Input
            id="exclude-keywords"
            placeholder="Enter keyword to exclude from job title or company name"
            value={excludeKeyword}
            onChange={(e) => setExcludeKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button 
            onClick={addExcludeKeyword}
            className="bg-red-200 text-red-800 hover:bg-red-300"
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {excludeKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="bg-red-200 text-red-800">
              {keyword}
              <button
                className="ml-1 text-xs"
                onClick={() => removeExcludeKeyword(keyword)}>
                ×
              </button>
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="exclude-promoted"
          checked={filterOptions.excludePromoted}
          onCheckedChange={toggleExcludePromoted}
        />
        <Label htmlFor="exclude-promoted" className="text-base">
          Exclude promoted jobs
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-reposted"
          checked={filterOptions.showReposted}
          onCheckedChange={toggleShowReposted}
        />
        <Label htmlFor="show-reposted" className="text-base">
          Only show reposted jobs
        </Label>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-base">Companies:</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="toggle-all-companies"
              checked={filterOptions.companies.length === companyOptions.length}
              onCheckedChange={toggleAllCompanies}
            />
            <Label htmlFor="toggle-all-companies" className="text-sm">Toggle All</Label>
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          {companyOptions.map(({ company, count }) => (
            <div key={company} className="flex items-center space-x-2">
              <Checkbox
                id={`company-${company}`}
                checked={filterOptions.companies.includes(company)}
                onCheckedChange={() => toggleCompanyFilter(company)}
              />
              <label htmlFor={`company-${company}`} className="text-base">
                {company} ({count})
              </label>
            </div>
          ))}
        </ScrollArea>
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label className="text-base">Locations:</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="toggle-all-locations"
              checked={filterOptions.locations.length === locationOptions.length}
              onCheckedChange={toggleAllLocations}
            />
            <Label htmlFor="toggle-all-locations" className="text-sm">Toggle All</Label>
          </div>
        </div>
        <ScrollArea className="h-[200px]">
          {locationOptions.map(({ location, count }) => (
            <div key={location} className="flex items-center space-x-2">
              <Checkbox
                id={`location-${location}`}
                checked={filterOptions.locations.includes(location)}
                onCheckedChange={() => toggleLocationFilter(location)}
              />
              <label htmlFor={`location-${location}`} className="text-base">
                {location} ({count})
              </label>
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  )
}
