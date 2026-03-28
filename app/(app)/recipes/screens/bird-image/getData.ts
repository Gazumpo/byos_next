import { unstable_cache } from "next/cache";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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

const MIME_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".bmp": "image/bmp",
};

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

const normalizeBirdName = (value?: string) =>
	(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const scientificNameToFileStem = (value?: string) =>
	(value || "")
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^\w-]+/g, "");

const buildImageCandidates = (bird: BirdRecord | null) => {
	const scientificStem = scientificNameToFileStem(bird?.Sci_Name);
	if (!scientificStem) return [];

	const normalizedStem = normalizeBirdName(bird?.Sci_Name);
	return Array.from(
		new Set([scientificStem, normalizedStem].filter(Boolean)),
	);
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

async function findBirdImage(
	candidates: string[],
): Promise<{ imageSrc: string | null; imageFileName: string | null }> {
	if (candidates.length === 0) {
		return { imageSrc: null, imageFileName: null };
	}

	try {
		const entries = await readdir(IMAGE_DIRECTORY, { withFileTypes: true });
		const files = entries
			.filter((entry) => entry.isFile())
			.map((entry) => {
				const extension = path.extname(entry.name).toLowerCase();
				const basename = path.basename(entry.name, extension);
				return {
					name: entry.name,
					extension,
					fullPath: path.join(IMAGE_DIRECTORY, entry.name),
					basename,
					normalizedBase: normalizeBirdName(basename),
				};
			})
			.filter((file) => MIME_TYPES[file.extension]);

		const exactMatch =
			files.find((file) => candidates.includes(file.basename)) ||
			files.find((file) => candidates.includes(file.normalizedBase));
		const markMatch =
			exactMatch ||
			files.find((file) =>
				candidates.some((candidate) => file.basename === `${candidate}_mark`),
			) ||
			files.find((file) =>
				candidates.some((candidate) =>
					file.normalizedBase === `${candidate}-mark`,
				),
			);

		if (!markMatch) {
			return { imageSrc: null, imageFileName: null };
		}

		const buffer = await readFile(markMatch.fullPath);
		const mimeType = MIME_TYPES[markMatch.extension];
		return {
			imageSrc: `data:${mimeType};base64,${buffer.toString("base64")}`,
			imageFileName: markMatch.name,
		};
	} catch (error) {
		console.error("Error loading bird image:", error);
		return { imageSrc: null, imageFileName: null };
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
		const imageCandidates = buildImageCandidates(latestBird);
		const { imageSrc, imageFileName } = await findBirdImage(imageCandidates);

		return {
			latestBird,
			imageSrc,
			imageFileName,
			imageCandidates,
		};
	} catch (error) {
		console.log("Cache skipped for bird-image, fallback:", error);
		const latestBird = await fetchLatestBirdNoCache();
		const imageCandidates = buildImageCandidates(latestBird);
		const { imageSrc, imageFileName } = await findBirdImage(imageCandidates);

		return {
			latestBird,
			imageSrc,
			imageFileName,
			imageCandidates,
		};
	}
}
