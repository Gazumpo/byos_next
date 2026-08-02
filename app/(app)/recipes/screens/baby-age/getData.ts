import { unstable_cache } from "next/cache";
import { generateJSON } from "@/lib/ai/gemini";
import {
	DEFAULT_BABY_NAME,
	diffInDays,
	formatBabyAge,
	formatBirthDate,
	getDateKey,
	getDevelopmentStage,
	getFallbackNote,
	getTodayInTimeZone,
	parseBirthDate,
	parseTimeZone,
} from "./babyAge";

export const dynamic = "force-dynamic";

type BabyAgeParams = {
	babyName?: unknown;
	birthDate?: unknown;
	timeZone?: unknown;
};

export type BabyAgeData = {
	babyName: string;
	birthDateLabel: string;
	ageLabel: string;
	dailyNote: string;
};

const DAILY_NOTE_CATEGORIES = [
	"what a parent might notice or expect around this age",
	"an emerging developmental ability, clearly described as something that may happen within a broad range",
	"one simple, low-pressure play or connection idea",
	"how to understand the child's cues, behaviour or emotions",
	"one broadly accepted, age-appropriate care or safety reminder",
	"an interesting fact about the child's body, senses, learning or development",
	"warm reassurance for a parent about normal variation or a commonly challenging phase",
];

async function generateDailyNote(
	ageDays: number,
	dateKey: string,
	category: string,
) {
	const stage = getDevelopmentStage(ageDays);
	const prompt = `Write one warm, practical, evidence-aligned daily note for the parent of a baby or young child who is ${ageDays} days old (development stage: ${stage}). Use this private content category: "${category}". The category is guidance only: do not name it, add a heading, or mention a topic. Describe abilities as possibilities within a broad range, not deadlines. Avoid diagnosis, medical advice, feeding quantities, medicine, and rigid feeding or sleep schedules. Use Australian English and keep the note under 180 characters. Date seed: ${dateKey}. Return only JSON in this exact shape: {"note":"..."}`;

	try {
		const result = await generateJSON<{ note?: unknown }>(prompt, {
			temperature: 0.8,
			maxOutputTokens: 100,
		});
		if (typeof result?.note !== "string" || !result.note.trim()) {
			return null;
		}

		const note = result.note.replace(/\s+/g, " ").trim();
		return note.length <= 200 ? note : `${note.slice(0, 199).trimEnd()}…`;
	} catch (error) {
		console.error("[Baby Age AI] Unable to generate daily note:", error);
		return null;
	}
}

function getCachedDailyNote(
	ageDays: number,
	dateKey: string,
	category: string,
) {
	return unstable_cache(
		() => generateDailyNote(ageDays, dateKey, category),
		["baby-age-daily-note-v2", String(ageDays), dateKey, category],
		{
			revalidate: 60 * 60 * 24,
			tags: ["baby-age-daily-note"],
		},
	)();
}

export default async function getData(
	params?: BabyAgeParams,
): Promise<BabyAgeData> {
	const babyName =
		typeof params?.babyName === "string" && params.babyName.trim()
			? params.babyName.trim()
			: DEFAULT_BABY_NAME;
	const birthDate = parseBirthDate(params?.birthDate);
	const timeZone = parseTimeZone(params?.timeZone);
	const today = getTodayInTimeZone(timeZone);
	const ageDays = diffInDays(birthDate, today);
	const todayKey = getDateKey(today);
	const category =
		DAILY_NOTE_CATEGORIES[
			Math.floor(today.getTime() / 86_400_000) % DAILY_NOTE_CATEGORIES.length
		];
	const fallbackNote = getFallbackNote(today, ageDays);
	const dailyNote =
		ageDays < 0
			? fallbackNote
			: ((await getCachedDailyNote(ageDays, todayKey, category)) ??
				fallbackNote);

	return {
		babyName,
		birthDateLabel: formatBirthDate(birthDate),
		ageLabel: formatBabyAge(birthDate, today),
		dailyNote,
	};
}
