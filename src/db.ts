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
}

// db version 4:
export type KeywordCount = {
    id?: number,
    keyword: string,
    count: number
}

export class DexieDB extends Dexie {
    // tables are added by dexie when declaring the stores()
    // We just tell the typing system this is the case
    jobPostings!: Table<JobPosting>;
    keywordCounts!: Table<KeywordCount>;

    constructor() {
        super('EarlyBird');
        // these are the indexed columns, must update version number whenever making changes here
        this.version(parseInt(process.env.PLASMO_PUBLIC_DB_VERSION)).stores({
            jobPostings: '++id, runId, jobCollectionSlug, jobId, location, applicantCount, views, listingDate, promoted, easyApply',
            keywordCounts: '++id, keyword, count'
        });
    }
}

export const db = new DexieDB();
