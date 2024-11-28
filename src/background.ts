import { Storage } from "@plasmohq/storage"
import { initTRPC } from '@trpc/server';
import { createChromeHandler } from 'trpc-chrome/adapter';
import { z } from 'zod';
import { AnalyticsEvent } from "~analytics";
import { db, type JobPosting, type KeywordCount } from "~db";

/**
 * On install, generate a random client ID and store it in sync storage.
 * This is used to identify unique users.
 */
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason == "install") {
        // Generate a random client ID.
        let clientId;

        if (process.env.NODE_ENV == 'development') {
            clientId = 'development'
        } else {
            clientId = self.crypto.randomUUID()
        }

        // Storing in sync so that the client ID is synced across a user's devices.
        const storage = new Storage({
            area: "sync"
        })

        await storage.set("clientId", clientId)

        const platform = await chrome.runtime.getPlatformInfo()
        const locale = await chrome.i18n.getUILanguage()
        // Send a new_install event to Google Analytics.
        await AnalyticsEvent([
            {
                name: "new_install",
                params: {
                    operating_system: platform.os,
                    locale: locale
                }
            }
        ])
    }
})


const t = initTRPC.create({
    isServer: false,
    allowOutsideOfServer: true,
});

const appRouter = t.router({
    refreshJobs: t.procedure
        .query(async () => {
            try {
                await AnalyticsEvent([
                    {
                        name: "refresh_jobs",
                        params: {
                            operating_system: (await chrome.runtime.getPlatformInfo()).os,
                            locale: await chrome.i18n.getUILanguage()
                        }
                    }
                ])
                const jobs = await getJobsFromAllCollections();

                // select keywordCounts from db to get sorted by count
                const keywordCounts = await getSavedKeywordCounts()
                const viewedJobs = await getSavedViewedJobs()
                
                return { jobs, keywordCounts, viewedJobs };
            } catch (error) {
                console.error('Error fetching jobs:', error);
                throw new Error('Failed to fetch jobs');
            }
        }),
    getSavedJobs: t.procedure
        .query(async () => {
            return { jobs: await getSavedJobs(), keywordCounts: await getSavedKeywordCounts(), viewedJobs: await getSavedViewedJobs() };
        }),
    saveViewedJob: t.procedure
        .input(z.object({ jobId: z.string() }))
        .mutation(async ({ input }) => {
            await saveViewedJob(input.jobId)
        }), 
    submitFeedback: t.procedure
        .input(z.object({
            feedback: z.object({
                type: z.string(),
                email: z.string(),
                subject: z.string(),
                description: z.string()
            })
        }))
        .mutation(async ({ input }) => {
            try {
                await AnalyticsEvent([
                    {
                        name: "submit_feedback",
                        params: {
                            feedback_type: input.feedback.type,
                            has_email: !!input.feedback.email,
                            description: input.feedback.description,
                            operating_system: (await chrome.runtime.getPlatformInfo()).os,
                            locale: await chrome.i18n.getUILanguage()
                        }
                    }
                ])
                return { success: true }
            } catch (error) {
                console.error('Error submitting feedback:', error)
                throw new Error('Failed to submit feedback')
            }
        }),
});

export type AppRouter = typeof appRouter;

createChromeHandler({
    router: appRouter,
});


console.log("Background Script Initialized")

const jobCollectionSlugs = [
    "recommended",
    "remote-jobs",
    "unicorn-companies",
    "work-life-balance",
    "education",
    "apparel-and-fashion",
    "government",
    "it-services-and-it-consulting",
    "top-tech",
    "future-of-work",
    "hospitals-and-healthcare",
    "e-sports",
    "metaverse",
    "top-companies",
    "pro-sport-teams-and-leagues",
    "education-benefits",
    "easy-apply",
    "social-impact",
    "top-healthcare",
    "top-startups",
    "hybrid",
    "family-friendly",
    "gaming",
    "media",
    "non-profits",
    "small-business",
    "k-12-edu",
    "parental-leave",
    "career-growth",
    "female-founded",
    "transportation-and-logistics",
    "pharmaceuticals",
    "hospitality",
    "student-loan-assist",
    "publishing",
    "beauty",
    "climate-and-cleantech",
    "unlimited-vacation",
    "biotechnology",
    "entertainment",
    "yc-funded",
    "early-stage-startups",
    "gen-ai"
]


chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
    const storage = new Storage()
    const headers = details.requestHeaders
    storage.get('linkedin-token-last-updated').then(async (result) => {
        const last_updated = parseInt(result)
        const expired = (!result || Date.now() - last_updated > 32000)
        if (expired) {
            let csrfToken = ''

            // Check the 6th element first
            if (headers[6] && headers[6].name.toLowerCase() === 'csrf-token') {
                csrfToken = headers[6].value
            } else {
                // If not found, search the entire array
                const csrfHeader = headers.find(header => header.name.toLowerCase() === 'csrf-token')
                if (csrfHeader) {
                    csrfToken = csrfHeader.value
                }
            }

            if (csrfToken) {
                console.log("Setting token...")
                await storage.set('linkedin-token', csrfToken)
                await storage.set('linkedin-token-last-updated', Date.now().toString())
            }
        }
    })
}, {
    urls: [
        "https://www.linkedin.com/voyager/api/*", // us
    ],
}, ["requestHeaders", "extraHeaders"]);




interface JobFetchParams {
    count?: number;
    start?: number;
    jobCollectionSlug?: string;
}


async function fetchLinkedInJobsList({ count = 50, start = 0, jobCollectionSlug = "recommended" }: JobFetchParams): Promise<any> {
    const storage = new Storage()
    const token = await storage.get('linkedin-token')
    const origin = "GENERIC_JOB_COLLECTIONS_LANDING"
    const url = `https://www.linkedin.com/voyager/api/graphql?variables=(count:${count},jobCollectionSlug:${jobCollectionSlug},query:(origin:${origin}),start:${start})&queryId=voyagerJobsDashJobCards.a18f4e75c4ec13a6acae19909e362b3b`;

    const headers = {
        "accept": "application/vnd.linkedin.normalized+json+2.1",
        "accept-language": "en-US,en;q=0.9",
        "csrf-token": token,
        "priority": "u=1, i",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Google Chrome\";v=\"128\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-li-lang": "en_US",
        //"x-li-page-instance": liPageInstance,
        "x-li-pem-metadata": "Voyager - Careers - Job Collections=job-collection-pagination-fetch",
        "x-li-prefetch": "1",
        "x-li-track": "{\"clientVersion\":\"1.13.23011\",\"mpVersion\":\"1.13.23011\",\"osName\":\"web\",\"timezoneOffset\":-4,\"timezone\":\"America/New_York\",\"deviceFormFactor\":\"DESKTOP\",\"mpName\":\"voyager-web\",\"displayDensity\":1.25,\"displayWidth\":3200,\"displayHeight\":1800}",
        "x-restli-protocol-version": "2.0.0"
    };

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); 
        return data.included;
    } catch (error) {
        console.error('Error fetching job list :', error);
        throw error;
    }
}


function getJobId(urn: string) {
    return urn.match(/\b\d+\b/gm)[0]
}

async function getJobsFromCollection(jobCollectionSlug?: string, runId?: number) {
    let rawData: any = []
    let allJobPostings: JobPosting[] = []
    const count = 50 // jobs per page
    const repostedJobIds = new Set<string>()
    const pagesToFetch = 2

    for (let page = 0; page < pagesToFetch; page++) {
        const start = page * count
        try {
            // Fetch the current page of jobs
            rawData = await fetchLinkedInJobsList({ 
                jobCollectionSlug,
                start,
                count
            });
            
            if (jobCollectionSlug == 'recommended') console.log(rawData)

            // If no job postings are found, break early
            const hasJobPostings = rawData.some((entry: any) => entry['preDashNormalizedJobPostingUrn'])
            if (!hasJobPostings) {
                break
            }

            // Process the current page
            const jobPostings: JobPosting[] = []

            // each posting should have a jobPosting entity with additional info
            rawData.forEach((entry: any) => {
                const posting: string = entry['preDashNormalizedJobPostingUrn']
                const reposted: boolean = entry.repostedJob
                if (reposted) {
                    repostedJobIds.add(getJobId(entry.entityUrn))
                }
                if (posting) {
                    try {
                        let applicantCount = '?'
                        let listingDate
                        let promoted = false
                        let easyApply = false
                        entry.footerItems.forEach((item) => {
                            if (item.type == "LISTED_DATE") {
                                listingDate = item.timeAt
                            }
                            if (item.type == "APPLICANT_COUNT_TEXT") {
                                applicantCount = item?.text?.text.split(" ")[0]
                                if (applicantCount.toLowerCase() == 'be') {
                                    applicantCount = '<25'
                                }
                            }
                            if (item.type === "PROMOTED") {
                                promoted = (item?.text?.text === "Promoted")
                            }
                            if (item.type === "EASY_APPLY_TEXT") {
                                easyApply = (item?.text?.text === "Easy Apply")
                            }
                        })
                        
                        let companyLink = entry.logo?.actionTarget

                        let salary: string = entry.tertiaryDescription?.text?.split("·")[0]
                        if (salary && salary[0] !== '$') {
                            salary = 'Not Sepcified'
                        }

                        const primaryDescription: string[] = entry.primaryDescription?.text.split("·")
                        const company = primaryDescription.at(0)
                        const location = primaryDescription.at(1)

                        const jobId = getJobId(entry.entityUrn)

                        jobPostings.push({
                            urn: entry.entityUrn,
                            jobId: jobId,
                            jobCollectionSlug: jobCollectionSlug,
                            runId: runId.toString(),
                            title: entry.title?.text,
                            company: company,
                            companyLink: companyLink,
                            salary: salary,
                            location: location,
                            remote: entry.secondaryDescription?.text.toLowerCase().includes("remote"),
                            listingDate,
                            reposted: repostedJobIds.has(jobId),
                            applicantCount,
                            promoted: promoted,
                            easyApply: easyApply
                        });

                    } catch (error: any) {
                        console.log("Error with this job posting:", jobCollectionSlug, entry)
                        throw error
                    }
                }
            });

            // Add the current page's jobs to our collection
            allJobPostings = [...allJobPostings, ...jobPostings]

        } catch (error) {
            console.log(`Error fetching jobs from collection ${jobCollectionSlug} at start=${start}:`, error);
            break
        }
    }

    console.log(`Fetched ${allJobPostings.length} jobs from ${jobCollectionSlug}`)
    return allJobPostings;
}

interface JobDetailResponse {
    numApplicants?: string;
    description?: string;
    applyUrl?: string;
    error?: string;
}

interface BatchJobDetailsResponse {
    [jobId: string]: JobDetailResponse;
}

async function fetchJobDetailsBatch(jobPostings: JobPosting[], url: string, batchSize = 20, retries = 0, delay = 1000) {
    // Group jobs that need details
    const jobsNeedingDetails = jobPostings.filter(job => job.applicantCount === '?');

    // Split into batches of batchSize
    const batches = [];
    for (let i = 0; i < jobsNeedingDetails.length; i += batchSize) {
        batches.push(jobsNeedingDetails.slice(i, i + batchSize));
    }

    // Process each batch concurrently
    const processBatch = async (batch: JobPosting[], attemptNum = 0): Promise<void> => {
        try {
            const jobIds = batch.map(job => job.jobId);
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ jobIds })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: BatchJobDetailsResponse = await response.json();

            // Update each job in the batch with its details
            for (const job of batch) {
                const jobDetails = data[job.jobId];
                if (jobDetails?.numApplicants) {
                    job.applicantCount = jobDetails.numApplicants;
                } else if (jobDetails?.error) {
                    // console.warn(`Error fetching details for job ${job.jobId}:`, jobDetails.error);
                }
                if (jobDetails?.applyUrl) {
                    const applyUrl = (jobDetails.applyUrl.replace(/&amp;/g, '&')).replace(' & urlHash', '')
                    job.applyUrl = decodeURIComponent(applyUrl)
                }
            }

            // Log progress
            // console.log(`Processed batch of ${batch.length} jobs. Success: ${Object.values(data).filter(d => d.numApplicants).length
            //     }, Failed: ${Object.values(data).filter(d => d.error).length
            //     }`);

        } catch (error) {
            if (attemptNum < retries) {
                const nextDelay = delay * Math.pow(2, attemptNum); // Exponential backoff
                console.log(`Batch retry in ${nextDelay / 1000} seconds... (${retries - attemptNum} retries left)`);
                await new Promise(resolve => setTimeout(resolve, nextDelay));
                // Retry this specific batch
                return processBatch(batch, attemptNum + 1);
            }
            throw error; // Re-throw if out of retries
        }
    };

    try {
        await Promise.all(batches.map(batch => processBatch(batch)));
    } catch (error) {
        console.error('Error fetching batch job details after all retries:', error);
    }
}

async function getJobsFromAllCollections(): Promise<JobPosting[]> {
    try {
        const storage = new Storage()
        const runId = Date.now()
        storage.set('last-time-refereshed', runId)

        const allJobPromises = jobCollectionSlugs.map(slug => getJobsFromCollection(slug, runId));
        const allJobsNested = await Promise.all(allJobPromises);

        const allJobs = allJobsNested.flat();

        // dedupe
        const uniqueJobs = Array.from(new Map(allJobs.map(job => [job.jobId, job])).values());

        const url = `${process.env.PLASMO_PUBLIC_BASE_API_URL}/api/linkedin-jobdetails-bulk`;

        console.log("Total jobs:", uniqueJobs.length);
        console.log("Initial applicant counts:", uniqueJobs.filter(job => job.applicantCount !== "?").length);

        // fetch details for all jobs in batches
        await fetchJobDetailsBatch(uniqueJobs, url);

        console.log("Final applicant counts:", uniqueJobs.filter(job => job.applicantCount !== "?").length);
        
        const keywordCounts: KeywordCount[] = [];
        const aggregatedKeywords = new Map<string, number>();

        // process each job title and aggregate keyword counts
        uniqueJobs.forEach(job => {
            const jobKeywords = extractKeywords(job.title);
            jobKeywords.forEach((count, keyword) => {
                aggregatedKeywords.set(
                    keyword, 
                    (aggregatedKeywords.get(keyword) || 0) + count
                );
            });
        });

        // convert the aggregated counts to KeywordCount objects
        aggregatedKeywords.forEach((count, keyword) => {
            keywordCounts.push({
                keyword,
                count
            });
        });

        try {
            await db.transaction('rw', db.jobPostings, db.keywordCounts, async () => {
                await db.jobPostings.clear();
                await db.keywordCounts.clear();
                
                await db.jobPostings.bulkAdd(uniqueJobs);
                await db.keywordCounts.bulkAdd(keywordCounts);
            });
        } catch (error) {
            console.error('Error saving jobs and keywords to IndexedDB:', error);
        }

        return uniqueJobs;
    } catch (error) {
        console.error('Error fetching jobs from all collections:', error);
        throw error;
    }
}

function cleanApplicantCount(inputString) {
    // Remove any non-digit characters from the beginning of the string
    let cleaned = inputString.replace(/^[^\d]+/, '');

    // Extract the first number found
    let match = cleaned.match(/\d+/);
    if (match) {
        let number = parseInt(match[0]);

        // Check for specific cases
        if (inputString.toLowerCase().includes('over') || inputString.toLowerCase().includes('more than')) {
            return `${number}+`;
        } else if (inputString.toLowerCase().includes('first') || inputString.toLowerCase().includes('be among')) {
            return `<${number}`;
        } else {
            return number.toString();
        }
    }

    // If no number is found, return the original string
    return inputString;
}

async function getSavedJobs() {
    try {
        return db.jobPostings.toArray()
    } catch (error) {
        console.error('Error fetching saved jobs from IndexedDB', error);
        throw error
    }
}

async function getSavedKeywordCounts() {
    try {
        return db.keywordCounts.orderBy('count').reverse().toArray()
    } catch (error) {
        console.error('Error fetching saved keyword counts from IndexedDB', error);
    }
}

async function getSavedViewedJobs() {
    try {
        const result = await db.viewedJobs.toArray()
        return result.map(job => job.jobId)
    } catch (error) {
        console.error('Error fetching saved viewed jobs from IndexedDB', error);
    }
}

async function saveViewedJob(jobId: string) {
    try {
        await db.viewedJobs.add({ jobId, viewedAt: new Date().toISOString() })
    } catch (error) {
        console.error('Error saving viewed job to IndexedDB', error);
    }
}


function extractKeywords(title: string): Map<string, number> {
    const keywords = new Map<string, number>();
    
    // Convert to lowercase and remove special characters
    const cleanTitle = title.toLowerCase().replace(/[^\w\s]/g, '').trim();
    
    // Single words
    const words = cleanTitle.split(/\s+/);
    words.forEach(word => {
        if (word.length >= 2) { // Only count words with 2 or more characters
            keywords.set(word, (keywords.get(word) || 0) + 1);
        }
    });
    
    // // Phrases (2-3 words)
    // for (let i = 0; i < words.length - 1; i++) {
    //     // Two-word phrases
    //     const phrase2 = words.slice(i, i + 2).join(' ');
    //     keywords.set(phrase2, (keywords.get(phrase2) || 0) + 1);
        
    //     // Three-word phrases
    //     if (i < words.length - 2) {
    //         const phrase3 = words.slice(i, i + 3).join(' ');
    //         keywords.set(phrase3, (keywords.get(phrase3) || 0) + 1);
    //     }
    // }
    
    return keywords;
}

