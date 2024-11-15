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
import { MultiSelector, MultiSelectorTrigger, MultiSelectorInput, MultiSelectorContent, MultiSelectorList, MultiSelectorItem } from "~components/ui/multiselect"

interface KeywordCount {
  keyword: string
  count: number
}

interface FilterSectionProps {
  filterOptions: {
    companies: string[] 
    locations: string[]
    excludePromoted: boolean
    showReposted: boolean
    showEasyApply: boolean
    showExternal: boolean
  }
  setFilterOptions: React.Dispatch<
    React.SetStateAction<{
      companies: string[]
      locations: string[]
      excludePromoted: boolean
      showReposted: boolean
      showEasyApply: boolean
      showExternal: boolean
    }>
  >
  includeKeywords: string[]
  setIncludeKeywords: React.Dispatch<React.SetStateAction<string[]>>
  excludeKeywords: string[]
  setExcludeKeywords: React.Dispatch<React.SetStateAction<string[]>>
  jobs: JobPosting[]
  onCollapse: () => void
  isExpanded: boolean
  keywordCounts: KeywordCount[]
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  filterOptions,
  setFilterOptions,
  includeKeywords,
  setIncludeKeywords,
  excludeKeywords,
  setExcludeKeywords,
  jobs,
  onCollapse,
  isExpanded,
  keywordCounts
}) => {
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

  const toggleShowEasyApply = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      showEasyApply: checked
    }))
  }

  const toggleShowExternal = (checked: boolean) => {
    setFilterOptions((prev) => ({
      ...prev,
      showExternal: checked
    }))
  }

  const addExcludeKeyword = (inputValue: string) => {
    if (inputValue.trim() && !excludeKeywords.includes(inputValue.trim())) {
      setExcludeKeywords(prev => [...prev, inputValue.trim()]);
      // Clear the input by accessing the MultiSelector context
      const input = document.querySelector('.multiselect-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
  <div className={`p-6 pt-2 gap-1 border-2 border-black space-y-2 relative ${isExpanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
      <Button
        onClick={onCollapse}
        className="absolute top-2 right-2 p-1"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <div>
        <Label htmlFor="include-keywords" className="text-base">Include Keywords:</Label>
        <MultiSelector 
          values={includeKeywords} 
          onValuesChange={setIncludeKeywords} 
          loop={false}
          buttonProps={{
            className: "bg-green-200 text-green-800 hover:bg-green-300"
          }}
          badgeProps={{
            className: "bg-green-100 text-green-800 hover:bg-green-200"
          }}
        >
          <MultiSelectorTrigger>
            <MultiSelectorInput 
              className="multiselect-input-include"
              placeholder="Enter keyword to include in job title or company name"
              onAdd={() => {
                const input = document.querySelector('.multiselect-input-include') as HTMLInputElement;
                if (input && input.value.trim() && !includeKeywords.includes(input.value.trim())) {
                  setIncludeKeywords(prev => [...prev, input.value.trim()]);
                  input.value = '';
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (!includeKeywords.includes(value)) {
                    setIncludeKeywords(prev => [...prev, value]);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
          </MultiSelectorTrigger>
          <MultiSelectorContent>
            <MultiSelectorList>
              {keywordCounts?.map((option) => (
                <MultiSelectorItem key={option.keyword} value={option.keyword}>
                  {`${option.keyword} (${option.count})`}
                </MultiSelectorItem>
              ))}
            </MultiSelectorList>
          </MultiSelectorContent>
        </MultiSelector>
      </div>
      <div>
        <Label htmlFor="exclude-keywords" className="text-base">Exclude Keywords:</Label>
        <MultiSelector 
          values={excludeKeywords} 
          onValuesChange={setExcludeKeywords} 
          loop={false}
          buttonProps={{
            className: "bg-red-200 text-red-800 hover:bg-red-300"
          }}
          badgeProps={{
            className: "bg-red-100 text-red-800 hover:bg-red-200"
          }}
        >
          <MultiSelectorTrigger>
            <MultiSelectorInput 
              className="multiselect-input"
              placeholder="Enter keyword to exclude from job title or company name"
              onAdd={() => {
                const input = document.querySelector('.multiselect-input') as HTMLInputElement;
                if (input) {
                  addExcludeKeyword(input.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  addExcludeKeyword(e.currentTarget.value);
                }
              }}
            />
          </MultiSelectorTrigger>
          <MultiSelectorContent>
            <MultiSelectorList>
              {keywordCounts?.map((option) => (
                <MultiSelectorItem key={option.keyword} value={option.keyword}>
                  {`${option.keyword} (${option.count})`}
                </MultiSelectorItem>
              ))}
            </MultiSelectorList>
          </MultiSelectorContent>
        </MultiSelector>
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <Checkbox
          id="exclude-promoted"
          checked={filterOptions.excludePromoted}
          onCheckedChange={toggleExcludePromoted}
        />
        <Label htmlFor="exclude-promoted" className="text-sm mt-2">
          Exclude promoted jobs
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-reposted"
          checked={filterOptions.showReposted}
          onCheckedChange={toggleShowReposted}
        />
        <Label htmlFor="show-reposted" className="text-sm">
          Only show reposted jobs
        </Label>
      </div>
      <div>
        <Label className="text-base mb-1 block">Apply Method:</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-easy-apply"
              checked={filterOptions.showEasyApply}
              onCheckedChange={toggleShowEasyApply}
            />
            <Label htmlFor="show-easy-apply" className="text-sm">
              Easy Apply
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-external"
              checked={filterOptions.showExternal}
              onCheckedChange={toggleShowExternal}
            />
            <Label htmlFor="show-external" className="text-sm">
              External Application
            </Label>
          </div>
        </div>
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
              <label htmlFor={`company-${company}`} className="text-sm">
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
