import { Storage } from "@plasmohq/storage"

if (!process.env.PLASMO_PUBLIC_GTAG_ID) {
    console.warn("PLASMO_PUBLIC_GTAG_ID environment variable not set.")
}

if (!process.env.PLASMO_PUBLIC_GOOGLE_SECRET) {
    console.warn("PLASMO_PUBLIC_GOOGLE_SECRET environment variable not set.")
}

const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect"
const gtagId = process.env.PLASMO_PUBLIC_GTAG_ID
const secretApiKey = process.env.PLASMO_PUBLIC_GOOGLE_SECRET

// https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events
type CollectEventPayload = {
    name: string
    params?: any
}

/**
 * This function sends events to Google Analytics using the Measurement Protocol.
 * https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events
 *
 * @param events The events to send to Google Analytics.
 */
export const AnalyticsEvent = async (events: CollectEventPayload[]) => {
    const storage = new Storage({
        area: "sync"
    })

    let clientId = undefined

    if (process.env.NODE_ENV == 'development') {
        clientId = 'development'
    } else {
        clientId = await storage.get("clientId")
    }

    // Just incase the client ID was not set on install.
    if (!clientId) {
        clientId = self.crypto.randomUUID()
        await storage.set("clientId", clientId)
    }

    console.log("Sending event.")
    const fetched = await fetch(
        `${GA_ENDPOINT}?measurement_id=${gtagId}&api_secret=${secretApiKey}`,
        {
            method: "POST",
            body: JSON.stringify({
                client_id: clientId,
                events
            })
        }
    )

    return fetched
}