import type { JobPosting } from "~db"

const calculateEarlyBirdScore = (job: JobPosting): number => {
    let score = 0

    // 1. Date posted scoring (max 100 points)
    const now = new Date().getTime()
    const postedDate = new Date(parseInt(job.listingDate)).getTime()
    const hoursSincePosted = (now - postedDate) / (1000 * 60 * 60)
    
    if (hoursSincePosted < 24) {
        // Full 100 points for < 24 hours, scaling down to 50 points at 24 hours
        score += 100 - (hoursSincePosted * (50/24))
        // Extra boost for reposted jobs that are recent
        if (job.reposted) {
            score += 30
        }
    } else if (hoursSincePosted < 168) { // 7 days
        // 50 points at 24 hours, scaling down to 0 at 7 days
        score += 50 - ((hoursSincePosted - 24) * (50/144))
    }

    // 2. Connection count scoring (max 80 points)
    const connectionCount = parseInt(job.connections?.toString() || "0")
    score += Math.min(connectionCount * 4, 80) // 20 connections = max score

    // 3. Alumni scoring (max 60 points)
    // Company alumni worth more than school alumni
    const companyAlumni = job.companyAlumni || 0
    const schoolAlumni = job.schoolAlumni || 0
    score += Math.min(companyAlumni * 3, 40) // 13+ company alumni = max score
    score += Math.min(schoolAlumni * 2, 20) // 10+ school alumni = max score

    // 4. Applicant count scoring (max 100 points)
    if (job.applicantCount) {
        const applicantCount = job.applicantCount === '<25' ? 24 : parseInt(job.applicantCount)
        if (!isNaN(applicantCount)) {
            if (applicantCount < 25) {
                score += 100 // Maximum boost for very low applicants
            } else if (applicantCount < 50) {
                score += 75
            } else if (applicantCount < 100) {
                score += 50
            } else if (applicantCount < 200) {
                score += 25
            }
        }
    }

    return score
}

export const formatListingDate = (listingDate: string) => {
    const now = new Date()
    const postedDate = new Date(parseInt(listingDate))
    const diffMinutes = Math.floor(
        (now.getTime() - postedDate.getTime()) / (1000 * 60)
    )
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 60) {
        return {
            text: `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`,
            isRecent: true
        }
    } else if (diffHours < 24) {
        return {
            text: `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`,
            isRecent: true
        }
    } else if (diffDays < 7) {
        return {
            text: `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`,
            isRecent: false
        }
    } else {
        return { text: postedDate.toLocaleDateString(), isRecent: false }
    }
}

export const sortJobs = (
    jobs: JobPosting[],
    sortBy: string,
    direction: "asc" | "desc"
) => {
    return [...jobs].sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
            case "earlyBirdScore":
                comparison = calculateEarlyBirdScore(b) - calculateEarlyBirdScore(a)
                break
            case "listingDate":
                comparison =
                    new Date(b.listingDate).getTime() -
                    new Date(a.listingDate).getTime()
                break
            case "applicantCount":
                const aIsUnknown = a.applicantCount === "?"
                const bIsUnknown = b.applicantCount === "?"

                const parseCount = (count: string) => {
                    if (count === "?") return Infinity
                    if (count === "<25") return 24
                    return parseInt(count, 10)
                }

                const aCount = parseCount(a.applicantCount)
                const bCount = parseCount(b.applicantCount)

                // Sort '?' values to the end
                if (aIsUnknown && !bIsUnknown) return direction === "asc" ? 1 : -1
                if (!aIsUnknown && bIsUnknown) return direction === "asc" ? -1 : 1

                // Regular comparison for applicant count
                comparison = aCount - bCount // This is intentionally a-b for applicant count
                break
            case "salary":
                const getSalaryValue = (salary: string) => {
                    const match = salary?.match(/\$(\d+),?(\d+)?/)
                    return match ? parseInt(match[1] + (match[2] || ""), 10) : 0
                }
                comparison = getSalaryValue(b.salary) - getSalaryValue(a.salary)
                break
            case "networking":
                const getNetworkingScore = (job: JobPosting) => {
                    return (job.schoolAlumni || 0) + (job.companyAlumni || 0) + (parseInt(job.connections?.toString() || "0") || 0)
                }
                comparison = getNetworkingScore(b) - getNetworkingScore(a)
                break
            default:
                return 0
        }
        // For applicant count, we want ascending to show lower numbers first
        if (sortBy === "applicantCount") {
            return direction === "asc" ? comparison : -comparison
        }
        // For all other sorts, we want descending to show higher numbers first
        return direction === "desc" ? comparison : -comparison
    })
}