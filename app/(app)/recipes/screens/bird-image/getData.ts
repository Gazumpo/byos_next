import { unstable_cache } from "next/cache";
import path from "node:path";
import {
	buildImageCandidates,
	findBirdImageForCandidates,
} from "../bird-image-utils";
import type { BirdRecord } from "../birds/getData";

export const dynamic = "force-dynamic";

export interface BirdImageData {
	latestBird: BirdRecord | null;
	imageSrc: string | null;
	imageFileName: string | null;
	imageCandidates: string[];
}

const BIRD_API: string =
	process.env.BIRDNET_URL || "http://192.168.20.15:3000/latest";
const BIRD_API_LIMIT = 1;
const IMAGE_DIRECTORY = path.join(
	process.cwd(),
	"app",
	"(app)",
	"recipes",
	"screens",
	"bird-image",
	"images",
);

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

const getDateKey = (value?: string) => {
	if (!value) return "";

	const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
	}

	const dmyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
	if (dmyMatch) {
		return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "";

	return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const getBirdTimestamp = (bird: BirdRecord) => {
	const dateKey = getDateKey(bird.Date);
	if (!dateKey) return Number.NEGATIVE_INFINITY;

	const timeValue =
		typeof bird.Time === "string" && bird.Time.trim().length > 0
			? bird.Time.trim()
			: "00:00:00";
	const timeKey = /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)
		? timeValue.length === 5
			? `${timeValue}:00`
			: timeValue
		: "00:00:00";

	return new Date(`${dateKey}T${timeKey}`).getTime();
};

async function fetchLatestBirdNoCache(): Promise<BirdRecord | null> {
	try {
		const requestInit: NextRequestInit = {
			headers: { Accept: "application/json" },
			cache: "no-store",
			next: { revalidate: 0 },
		};
		const res = await fetch(buildBirdApiUrl(), requestInit);
		if (!res.ok) throw new Error(`Bird API responded: ${res.status}`);

		const data = await res.json();
		if (!Array.isArray(data) || data.length === 0) return null;

		return (data as BirdRecord[]).reduce<BirdRecord | null>((latest, bird) => {
			if (!latest) return bird;
			return getBirdTimestamp(bird) >= getBirdTimestamp(latest) ? bird : latest;
		}, null);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (
			msg.includes("prerender") ||
			msg.includes("HANGING_PROMISE_REJECTION") ||
			msg.includes("prerender is complete")
		) {
			return null;
		}
		console.error("Error fetching latest bird data:", error);
		return null;
	}
}

const getCachedLatestBird = unstable_cache(
	async (): Promise<BirdRecord | null> => fetchLatestBirdNoCache(),
	["bird-image-latest-bird"],
	{ tags: ["birds", "bird-image"], revalidate: 60 },
);

export default async function getData(): Promise<BirdImageData> {
	try {
		const latestBird = await getCachedLatestBird();
		const imageCandidates = buildImageCandidates(latestBird?.Sci_Name);
		const { imageSrc, imageFileName } = await findBirdImageForCandidates(
			imageCandidates,
			IMAGE_DIRECTORY,
		);

		return {
			latestBird,
			imageSrc,
			imageFileName,
			imageCandidates,
		};
	} catch (error) {
		console.log("Cache skipped for bird-image, fallback:", error);
		const latestBird = await fetchLatestBirdNoCache();
		const imageCandidates = buildImageCandidates(latestBird?.Sci_Name);
		const { imageSrc, imageFileName } = await findBirdImageForCandidates(
			imageCandidates,
			IMAGE_DIRECTORY,
		);

		return {
			latestBird,
			imageSrc,
			imageFileName,
			imageCandidates,
		};
	}
}
