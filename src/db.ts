import Dexie, { type Table } from 'dexie';

export type JobPosting = {
    id?: number,
    runId?: string,
    jobCollectionSlug: string,
    urn: string,
    jobId: string,
    title: string,
    listingDate: string,
    reposted: boolean,
    applicantCount?: string,
    views?: number,
    company: string,
    location: string,
    remote: boolean,
    salary: string,
    description?: string,

    // db version 2:
    promoted?: boolean,
    companyLink?: string,

    // db version 3:
    easyApply?: boolean

    // db version 6:
    applyUrl?: string

    // db version 7:
    companyAlumni?: number
    schoolAlumni?: number
    connections?: number
}

// db version 4:
export type KeywordCount = {
    id?: number,
    keyword: string,
    count: number
}

// db version 5:
export type viewedJob = {
    jobId: string,
    viewedAt: string
}

export class DexieDB extends Dexie {
    // tables are added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    jobPostings!: Table<JobPosting>;
    keywordCounts!: Table<KeywordCount>;
    viewedJobs!: Table<viewedJob>;
    constructor() {
        super('EarlyBird');
        // these are the indexed columns, must update version number whenever making changes here
        this.version(parseInt(process.env.PLASMO_PUBLIC_DB_VERSION)).stores({
            jobPostings: '++id, runId, jobCollectionSlug, jobId, location, applicantCount, views, listingDate, promoted, easyApply',
            keywordCounts: '++id, keyword, count',
            viewedJobs: 'jobId, viewedAt'
        });
    }
}

export const db = new DexieDB();
