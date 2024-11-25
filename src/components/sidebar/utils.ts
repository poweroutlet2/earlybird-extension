import type { JobPosting } from "~db"

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
                if (aIsUnknown && !bIsUnknown) return 1
                if (!aIsUnknown && bIsUnknown) return -1

                // Regular comparison
                comparison = aCount - bCount
                break
            case "salary":
                const getSalaryValue = (salary: string) => {
                    const match = salary?.match(/\$(\d+),?(\d+)?/)
                    return match ? parseInt(match[1] + (match[2] || ""), 10) : 0
                }
                comparison = getSalaryValue(b.salary) - getSalaryValue(a.salary)
                break
            default:
                return 0
        }
        return direction === "asc" ? comparison : -comparison
    })
}