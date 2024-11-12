import { Card, CardContent, CardHeader } from "~components/ui/card"
import { Calendar, DollarSign, MapPin, Users, Minus } from "lucide-react"
import React from "react"
import { Button } from "~components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~components/ui/tooltip"

import type { JobPosting } from "~db"

import { formatListingDate } from "./utils"

interface JobCardProps {
  job: JobPosting
  onHide: (jobId: string) => void
}

export const JobCard: React.FC<JobCardProps> = React.memo(({ job, onHide }) => (
  <Card className="hover:shadow-md transition-shadow bg-[#f5f6fb] mb-4 relative">
    <TooltipProvider>
      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>
          <Button
            className="absolute top-2 right-2 bg-black p-0 hover:bg-gray-800 w-10 h-5"
            onClick={() => onHide(job.jobId)}
          >
            <div className="w-5 h-1 bg-[#f5f6fb]"></div>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="mr-10">
          <p>Hide job from EarlyBird</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold text-lg text-primary hover:underline">
          <a href={`https://www.linkedin.com/jobs/view/${job.jobId}`}>
            {job.title}
          </a>
        </h4>
        <a href={job.companyLink} className="text-sm text-right font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full hover:underline">
          {job.company}
        </a>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div className="flex items-center text-muted-foreground">
          <DollarSign className="h-4 w-4 mr-2 text-primary" />
          <span>{job.salary || "Not specified"}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2 text-primary" />
          <span>{job.location}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2 text-primary" />
          {(() => {
            const { text, isRecent } = formatListingDate(job.listingDate)
            return (
              <span
                className={isRecent ? "text-green-600" : ""}
                title={new Date(job.listingDate).toLocaleString()}>
                {job.reposted ? (
                  <span className="font-bold">Reposted</span>
                ) : (
                  "Posted"
                )}{" "}
                {text}
              </span>
            )
          })()}
        </div>
        {job.applicantCount !== undefined && (
          <div className="flex items-center text-muted-foreground">
            <Users className="h-4 w-4 mr-2 text-primary" />
            <span className={job.applicantCount === "<25" || Number(job.applicantCount) <= 25 ? "text-green-600" : ""}>
              {job.applicantCount}{" "}
              applicants
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-row gap-2 mb-2">
        {job.remote && (
          <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
            Remote
          </span>
        )}
        {job.promoted &&
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger asChild>
                <span className="inline-block bg-gray-300 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Promoted
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-[1rem] ml-44">
                <p>This job is marked Promoted on LinkedIn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
        {job.easyApply &&
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger asChild>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  Easy Apply
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-[1rem] ml-44">
                <p>You can EasyApply to this posting through LinkedIn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      </div>
    </CardContent>
  </Card>
))
