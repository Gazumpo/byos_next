import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

interface TrainItem {
	origin: string;
	destination: string;
	time: string;
	platform?: string;
	status?: string;
}

interface TrainData {
	trains: TrainItem[];
	stationName: string;
	lastUpdated?: string;
}

type LiveStatusResponse = {
	result: string;
	data?: {
		Station?: string;
		LastUpdated?: string;
		StatusDetailList?: Array<{
			Departure?: string;
			Destination?: string;
			Platform?: string;
			StatusDetail?: string;
		}>;
	};
};

type StatusDetailItem = NonNullable<
	NonNullable<LiveStatusResponse["data"]>["StatusDetailList"]
>[number];

const LIVE_STATUS_FRE_URL =
	"https://www.transperth.wa.gov.au/API/TrainLiveTimes/LiveStatus/Fremantle%20Line/Claremont%20Stn";
const LIVE_STATUS_AIR_URL =
	"https://www.transperth.wa.gov.au/API/TrainLiveTimes/LiveStatus/Airport%20Line/Claremont%20Stn";

const REQUEST_HEADERS = {
	ModuleId: "5111",
	TabId: "248",
};

async function fetchLiveStatus(): Promise<TrainData> {
	try {
		const statusItems: StatusDetailItem[] = [];
		let stationName = "Claremont Stn";
		let lastUpdated: string | undefined;

		for (const url of [LIVE_STATUS_FRE_URL, LIVE_STATUS_AIR_URL]) {
			try {
				const response = await fetch(url, {
					headers: REQUEST_HEADERS,
					next: { revalidate: 0 },
				});

				if (!response.ok) {
					throw new Error(`Transperth API responded with ${response.status}`);
				}

				const payload = (await response.json()) as LiveStatusResponse;

				if (payload.result !== "success" || !payload.data) {
					throw new Error("Transperth API returned an error result");
				}

				stationName = payload.data.Station || stationName;
				lastUpdated = payload.data.LastUpdated || lastUpdated;

				const list = payload.data.StatusDetailList;
				if (Array.isArray(list)) {
					statusItems.push(...list);
				}
			} catch (error) {
				console.error(`Error fetching Transperth live data for ${url}:`, error);
			}
		}
		const departureKey = (value?: string): number => {
			if (!value) {
				return Number.POSITIVE_INFINITY;
			}

			const trimmed = value
				.replace(/[\u200B-\u200D\uFEFF]/g, "")
				.replace(/\uFF1A/g, ":")
				.trim()
				.toLowerCase();
			if (trimmed === "due" || trimmed === "now") {
				return -1;
			}

			const matches = Array.from(trimmed.matchAll(/(\d{1,2})\s*:\s*(\d{2})/g));
			const match = matches.at(-1);
			if (!match) {
				return Number.POSITIVE_INFINITY;
			}

			const hour = Number(match[1]);
			const minute = Number(match[2]);
			if (
				Number.isNaN(hour) ||
				Number.isNaN(minute) ||
				hour < 0 ||
				hour > 23 ||
				minute < 0 ||
				minute > 59
			) {
				return Number.POSITIVE_INFINITY;
			}

			return hour * 60 + minute;
		};

		statusItems.sort(
			(a, b) => departureKey(a.Departure) - departureKey(b.Departure),
		);

		console.log("Sorted Transperth live status items:", statusItems);

		const trains = statusItems.map((item) => {
			const destinationRaw = item.Destination || "Service";
			const destination = destinationRaw.trim();
			const finalDestination =
				destination.toLowerCase() === "fremantle" ? "Freo" : destination;

			return {
				origin: stationName,
				destination: finalDestination,
				time: item.Departure || "--:--",
				platform: item.Platform,
				status: item.StatusDetail,
			};
		});

		return {
			trains,
			stationName,
			lastUpdated,
		};
	} catch (error) {
		console.error("Error fetching Transperth live data:", error);
		return {
			trains: [],
			stationName: "Claremont Stn",
		};
	}
}

const getCachedLiveStatus = unstable_cache(
	async (): Promise<TrainData> => {
		const data = await fetchLiveStatus();
		if (!data || !Array.isArray(data.trains)) {
			throw new Error("Empty or invalid data - skip caching");
		}
		return data;
	},
	["transperth-live-status", "claremont"],
	{
		revalidate: 30,
		tags: ["transperth", "train-live"],
	},
);

export default async function getData(): Promise<TrainData> {
	try {
		return await getCachedLiveStatus();
	} catch (error) {
		console.log("Cache skipped or error:", error);
		return fetchLiveStatus();
	}
}
