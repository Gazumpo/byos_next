import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".bmp": "image/bmp",
};

type BirdImageMatch = {
	imageSrc: string | null;
	imageFileName: string | null;
};

type BirdImageFile = {
	name: string;
	extension: string;
	fullPath: string;
	basename: string;
	normalizedBase: string;
};

export const normalizeBirdName = (value?: string) =>
	(value || "")
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

export const scientificNameToFileStem = (value?: string) =>
	(value || "")
		.trim()
		.replace(/\s+/g, "_")
		.replace(/[^\w-]+/g, "");

export const buildImageCandidates = (scientificName?: string) => {
	const scientificStem = scientificNameToFileStem(scientificName);
	if (!scientificStem) return [];

	const normalizedStem = normalizeBirdName(scientificName);
	return Array.from(
		new Set([scientificStem, normalizedStem].filter(Boolean)),
	);
};

const readBirdImageDirectory = async (
	imageDirectory: string,
): Promise<BirdImageFile[]> => {
	const entries = await readdir(imageDirectory, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => {
			const extension = path.extname(entry.name).toLowerCase();
			const basename = path.basename(entry.name, extension);
			return {
				name: entry.name,
				extension,
				fullPath: path.join(imageDirectory, entry.name),
				basename,
				normalizedBase: normalizeBirdName(basename),
			};
		})
		.filter((file) => MIME_TYPES[file.extension]);
};

const findMatchingBirdFile = (
	files: BirdImageFile[],
	candidates: string[],
): BirdImageFile | undefined =>
	files.find((file) => candidates.includes(file.basename)) ||
	files.find((file) => candidates.includes(file.normalizedBase)) ||
	files.find((file) =>
		candidates.some((candidate) => file.basename === `${candidate}_mark`),
	) ||
	files.find((file) =>
		candidates.some((candidate) => file.normalizedBase === `${candidate}-mark`),
	);

const toImageMatch = async (
	file: BirdImageFile | undefined,
): Promise<BirdImageMatch> => {
	if (!file) {
		return { imageSrc: null, imageFileName: null };
	}

	const buffer = await readFile(file.fullPath);
	const mimeType = MIME_TYPES[file.extension];
	return {
		imageSrc: `data:${mimeType};base64,${buffer.toString("base64")}`,
		imageFileName: file.name,
	};
};

export async function findBirdImageForCandidates(
	candidates: string[],
	imageDirectory: string,
): Promise<BirdImageMatch> {
	if (candidates.length === 0) {
		return { imageSrc: null, imageFileName: null };
	}

	try {
		const files = await readBirdImageDirectory(imageDirectory);
		return toImageMatch(findMatchingBirdFile(files, candidates));
	} catch (error) {
		console.error("Error loading bird image:", error);
		return { imageSrc: null, imageFileName: null };
	}
}

export async function findBirdImagesForScientificNames(
	scientificNames: string[],
	imageDirectory: string,
): Promise<Map<string, BirdImageMatch>> {
	const uniqueScientificNames = Array.from(
		new Set(scientificNames.filter((value) => value.trim().length > 0)),
	);

	if (uniqueScientificNames.length === 0) {
		return new Map();
	}

	try {
		const files = await readBirdImageDirectory(imageDirectory);
		const imageMatches = await Promise.all(
			uniqueScientificNames.map(async (scientificName) => {
				const candidates = buildImageCandidates(scientificName);
				const match = await toImageMatch(
					findMatchingBirdFile(files, candidates),
				);
				return [scientificName, match] as const;
			}),
		);

		return new Map(imageMatches);
	} catch (error) {
		console.error("Error loading bird images:", error);
		return new Map();
	}
}
