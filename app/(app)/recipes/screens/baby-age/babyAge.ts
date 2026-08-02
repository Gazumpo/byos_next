export const DEFAULT_BABY_NAME = "Finn Toa Lovie";
export const DEFAULT_BIRTH_DATE = "2026-09-14";
export const DEFAULT_TIME_ZONE = "Australia/Perth";

const DAY_MS = 86_400_000;

const FALLBACK_NOTES = {
	newborn: [
		"Newborn sleep is often spread across short stretches while day-and-night rhythms are still developing.",
		"Newborns can often recognise familiar voices they heard before birth.",
		"Try holding your baby close and talking slowly. Your face and voice are already rich sources of learning.",
		"Early hunger cues can include rooting, becoming alert, opening the mouth, and bringing hands towards the mouth.",
		"For every sleep, place baby on their back on a firm, flat, clear surface with their head and face uncovered.",
		"Young babies usually focus best on faces and objects about 20–30 cm away.",
		"Frequent waking and feeding can be exhausting. You are both learning each other's patterns one day at a time.",
	],
	oneToThreeMonths: [
		"Your baby may spend longer periods awake and interested in faces, voices, and nearby movement.",
		"Social smiles and cooing may begin around this stage, but every baby follows their own timetable.",
		"While baby is awake, try a short, supervised tummy-time session or let them study your face.",
		"Looking away, yawning, fussing, or making jerky movements can be signs that your baby needs a quieter moment.",
		"Keep using a firm, flat, clear sleep surface and place baby on their back for every sleep.",
		"Babies learn conversation through turn-taking: pause after a coo or expression and see how they respond.",
		"Some days will feel predictable and others will not. Rapid growth often brings changing sleep and feeding patterns.",
	],
	threeToSixMonths: [
		"Around this age, babies often become more social, active, and interested in everything happening nearby.",
		"Reaching for objects builds coordination between a baby's eyes and hands.",
		"Place a safe toy within reach during floor play and give your baby time to look, reach, and explore.",
		"Turning away or becoming fussy during play can mean your baby needs a pause rather than more stimulation.",
		"As reaching and rolling develop, keep small objects and other choking hazards out of reach.",
		"Babies explore with their whole body, so hands, feet, faces, and safe objects often end up in their mouth.",
		"Rolling, laughing, reaching, and babbling emerge across broad ranges. A baby does not need to master them all at once.",
	],
	sixToNineMonths: [
		"Your baby may be sitting with support or independently and using rolling or wriggling to reach interesting things.",
		"Babbling lets babies experiment with the sounds they will later use in words.",
		"Passing an object between hands builds coordination across both sides of the body.",
		"Peekaboo is simple fun and helps babies explore the idea that people and objects still exist when hidden.",
		"Reaching towards you, turning away, or becoming still can all communicate what your baby wants from an interaction.",
		"Floor-level exploration grows quickly now, so regularly check the area for cords, small objects, and unstable furniture.",
		"Wariness of unfamiliar people or distress when you leave can be a normal part of recognising familiar caregivers.",
	],
	nineToTwelveMonths: [
		"Your baby may crawl, shuffle, pull to stand, or find another completely individual way to move around.",
		"Gestures such as pointing, waving, and lifting both arms can become important parts of communication.",
		"Try putting safe objects into a container together, then tipping them out and starting again.",
		"Pausing when your baby looks away gives them time to process before deciding whether to continue playing.",
		"Growing mobility makes secured furniture, blocked stairs, and a floor free of choking hazards especially important.",
		"Picking up small pieces with finger and thumb uses a precise movement called the pincer grasp.",
		"Walking before the first birthday is not a requirement. Many healthy children take their first steps later.",
	],
	twelveToEighteenMonths: [
		"Toddlers often understand far more language than they can express with words.",
		"Pointing is an early way for toddlers to share attention and communicate interests.",
		"Offer a few blocks or cups to stack, nest, fill, and empty without needing to show a correct way to play.",
		"Frustration can grow when ideas are bigger than available words. Naming the feeling can help build understanding.",
		"New walkers explore without much sense of danger, so close supervision and a safe environment still do most of the work.",
		"Copying everyday actions, such as brushing or stirring, is an early form of pretend play and learning.",
		"Repeating the same game or book is useful learning, even when an adult already knows every part by heart.",
	],
	eighteenToTwentyFourMonths: [
		"Movement may become faster and more confident as climbing, running, carrying, and pushing are practised.",
		"Words may begin joining into short phrases, while gestures still do plenty of important communication.",
		"A toy cup, spoon, doll, or cardboard box can inspire rich pretend play without needing complicated instructions.",
		"Big feelings are common when independence grows faster than self-control. Calm support helps over time.",
		"Toddlers move quickly and unpredictably, so close supervision is especially important around water, roads, and climbing.",
		"Stacking and sorting help toddlers notice size, shape, and cause and effect.",
		"Playing beside other children rather than directly with them is a common and useful form of early social play.",
	],
	twoYearsAndOlder: [
		"Language, movement, imagination, and independence often grow in bursts rather than at a steady pace.",
		"Jumping, balancing, drawing, and building all help children refine planning and coordination.",
		"Invite your child to help with a small real task, such as matching socks or carrying an unbreakable item.",
		"Naming feelings without judging them helps children gradually build an emotional vocabulary.",
		"Active children still rely on adults to set safe boundaries around roads, water, heights, and unfamiliar places.",
		"Repeating favourite songs helps young children anticipate patterns and remember words.",
		"Development can be uneven: a child may race ahead in one area while taking more time in another.",
	],
};

function dateKey(date: Date) {
	return date.toISOString().slice(0, 10);
}

export function parseBirthDate(value: unknown) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return new Date(`${DEFAULT_BIRTH_DATE}T00:00:00.000Z`);
	}

	const parsed = new Date(`${value}T00:00:00.000Z`);
	return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== value
		? new Date(`${DEFAULT_BIRTH_DATE}T00:00:00.000Z`)
		: parsed;
}

export function parseTimeZone(value: unknown) {
	const timeZone =
		typeof value === "string" && value.trim()
			? value.trim()
			: DEFAULT_TIME_ZONE;

	try {
		new Intl.DateTimeFormat("en-AU", { timeZone }).format(0);
		return timeZone;
	} catch {
		return DEFAULT_TIME_ZONE;
	}
}

export function getTodayInTimeZone(timeZone: string, now = new Date()) {
	const dateParts = new Intl.DateTimeFormat("en-AU", {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
	}).formatToParts(now);
	const year = Number(dateParts.find((part) => part.type === "year")?.value);
	const month = Number(dateParts.find((part) => part.type === "month")?.value);
	const day = Number(dateParts.find((part) => part.type === "day")?.value);

	return new Date(Date.UTC(year, month - 1, day));
}

export function diffInDays(from: Date, to: Date) {
	return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function daysInUtcMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUtcMonths(date: Date, months: number) {
	const absoluteMonth = date.getUTCMonth() + months;
	const year = date.getUTCFullYear() + Math.floor(absoluteMonth / 12);
	const month = ((absoluteMonth % 12) + 12) % 12;
	const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, month));
	return new Date(Date.UTC(year, month, day));
}

function getCompleteMonths(birthDate: Date, today: Date) {
	let months =
		(today.getUTCFullYear() - birthDate.getUTCFullYear()) * 12 +
		today.getUTCMonth() -
		birthDate.getUTCMonth();

	if (addUtcMonths(birthDate, months) > today) {
		months -= 1;
	}

	return Math.max(0, months);
}

function plural(value: number, unit: string) {
	return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

export function formatBabyAge(birthDate: Date, today: Date) {
	const ageDays = diffInDays(birthDate, today);

	if (ageDays < 0) {
		return `Birth date is in ${plural(Math.abs(ageDays), "day")}`;
	}
	if (ageDays === 0) {
		return "Born today";
	}
	if (ageDays < 14) {
		return `${plural(ageDays, "day")} old`;
	}
	if (ageDays < 84) {
		const weeks = Math.floor(ageDays / 7);
		const days = ageDays % 7;
		return `${plural(weeks, "week")}${days ? `, ${plural(days, "day")}` : ""} old`;
	}

	const completeMonths = getCompleteMonths(birthDate, today);
	if (completeMonths < 24) {
		const monthDate = addUtcMonths(birthDate, completeMonths);
		const remainingDays = diffInDays(monthDate, today);
		return `${plural(completeMonths, "month")}${remainingDays ? `, ${plural(remainingDays, "day")}` : ""} old`;
	}

	const years = Math.floor(completeMonths / 12);
	const months = completeMonths % 12;
	return `${plural(years, "year")}${months ? `, ${plural(months, "month")}` : ""} old`;
}

export function getDevelopmentStage(ageDays: number) {
	if (ageDays < 0) return "before birth";
	if (ageDays < 28) return "newborn";
	if (ageDays < 90) return "one to three months";
	if (ageDays < 180) return "three to six months";
	if (ageDays < 270) return "six to nine months";
	if (ageDays < 365) return "nine to twelve months";
	if (ageDays < 548) return "twelve to eighteen months";
	if (ageDays < 730) return "eighteen to twenty-four months";
	if (ageDays < 1_095) return "two years";
	if (ageDays < 1_460) return "three years";
	if (ageDays < 1_825) return "four years";
	return "five years or older";
}

export function getFallbackNote(today: Date, ageDays: number) {
	if (ageDays < 0) {
		return "Daily age-aware notes will begin on the birth date.";
	}

	const dayNumber = Math.floor(today.getTime() / DAY_MS);
	const notes =
		ageDays < 28
			? FALLBACK_NOTES.newborn
			: ageDays < 90
				? FALLBACK_NOTES.oneToThreeMonths
				: ageDays < 180
					? FALLBACK_NOTES.threeToSixMonths
					: ageDays < 270
						? FALLBACK_NOTES.sixToNineMonths
						: ageDays < 365
							? FALLBACK_NOTES.nineToTwelveMonths
							: ageDays < 548
								? FALLBACK_NOTES.twelveToEighteenMonths
								: ageDays < 730
									? FALLBACK_NOTES.eighteenToTwentyFourMonths
									: FALLBACK_NOTES.twoYearsAndOlder;
	return notes[(dayNumber + ageDays) % notes.length];
}

export function formatBirthDate(date: Date) {
	return date.toLocaleDateString("en-AU", {
		timeZone: "UTC",
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function getDateKey(date: Date) {
	return dateKey(date);
}
