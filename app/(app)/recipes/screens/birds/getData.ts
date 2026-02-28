import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

export interface BirdRecord {
	Date: string;
	Time: string;
	Sci_Name: string;
	Com_Name: string;
	Confidence: number;
	Lat?: number;
	Lon?: number;
	Cutoff?: number;
	Week?: number;
	Sens?: number;
	Overlap?: number;
	File_Name?: string;
}

export interface BirdData {
	items: BirdRecord[];
}

const BIRD_API: string =
	process.env.BIRDNET_URL || "http://192.168.20.15:3000/latest";
const BIRD_API_LIMIT = 100;

const buildBirdApiUrl = () => {
	const url = new URL(BIRD_API);
	url.searchParams.set("limit", String(BIRD_API_LIMIT));
	return url.toString();
};

type NextRequestInit = RequestInit & {
	next?: {
		revalidate?: number;
	};
};

async function fetchBirdsNoCache(): Promise<BirdData> {
	try {
		const requestInit: NextRequestInit = {
			headers: { Accept: "application/json" },
			cache: "no-store",
			next: { revalidate: 0 },
		};
		const res = await fetch(buildBirdApiUrl(), requestInit);
		if (!res.ok) throw new Error(`Bird API responded: ${res.status}`);
		const data = await res.json();
		if (!Array.isArray(data)) return { items: [] };
		return { items: data as BirdRecord[] };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (
			msg.includes("prerender") ||
			msg.includes("HANGING_PROMISE_REJECTION") ||
			msg.includes("prerender is complete")
		) {
			return { items: [] };
		}
		console.error("Error fetching bird data:", error);
		return { items: [] };
	}
}

const getCachedBirds = unstable_cache(
	async (): Promise<BirdData> => {
		const data = await fetchBirdsNoCache();
		if (!data || !Array.isArray(data.items))
			throw new Error("Empty or invalid data - skip caching");
		return data;
	},
	["birds-data"],
	{ tags: ["birds"], revalidate: 60 },
);

export default async function getData(): Promise<BirdData> {
	try {
		return await getCachedBirds();
	} catch (error) {
		console.log("Cache skipped for birds, fallback:", error);
		return fetchBirdsNoCache();
	}
}
