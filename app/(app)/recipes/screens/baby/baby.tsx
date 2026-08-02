import { PreSatori } from "@/utils/pre-satori";
import { pregnancyDayUpdate } from "./pregnancyDayUpdate";
import { pregnancySizeComparisonByDay } from "./pregnancySizeComparisonByDay";

interface BabyProps {
	width?: number;
	height?: number;
	params?: {
		babyName?: unknown;
		dueDate?: unknown;
		timeZone?: unknown;
	};
}

const DEFAULT_BABY_NAME = "Baby Finn Toa Lovie";
const DEFAULT_DUE_DATE = "2026-09-14";
const DEFAULT_TIME_ZONE = "Australia/Perth";
const PREGNANCY_DAYS = 280;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: unknown) {
	const dateValue =
		typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
			? value
			: DEFAULT_DUE_DATE;
	const [year, month, day] = dateValue.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	const isValidDate =
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;

	return isValidDate ? date : new Date(`${DEFAULT_DUE_DATE}T00:00:00Z`);
}

function parseTimeZone(value: unknown) {
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

function getCalendarDayNumber(date: Date, timeZone: string) {
	const dateParts = new Intl.DateTimeFormat("en-AU", {
		timeZone,
		year: "numeric",
		month: "numeric",
		day: "numeric",
	}).formatToParts(date);
	const year = Number(dateParts.find((part) => part.type === "year")?.value);
	const month = Number(dateParts.find((part) => part.type === "month")?.value);
	const day = Number(dateParts.find((part) => part.type === "day")?.value);

	return Math.floor(Date.UTC(year, month - 1, day) / MILLISECONDS_PER_DAY);
}

function getUtcCalendarDayNumber(date: Date) {
	return Math.floor(date.getTime() / MILLISECONDS_PER_DAY);
}

export default function Baby({ width = 800, height = 480, params }: BabyProps) {
	const today = new Date();
	const babyName =
		typeof params?.babyName === "string" && params.babyName.trim()
			? params.babyName.trim()
			: DEFAULT_BABY_NAME;
	const dueDate = parseDate(params?.dueDate);
	const timeZone = parseTimeZone(params?.timeZone);
	const dueDay = getUtcCalendarDayNumber(dueDate);
	const startDay = dueDay - PREGNANCY_DAYS;
	const totalDays = dueDay - startDay;
	const cookedDaysRaw = getCalendarDayNumber(today, timeZone) - startDay;
	const cookedDays = Math.min(Math.max(cookedDaysRaw, 0), totalDays);
	const cookedWeeks = Math.floor(cookedDays / 7);
	const cookedExtraDays = cookedDays % 7;
	const progress = totalDays > 0 ? cookedDays / totalDays : 0;
	const dayUpdate = pregnancyDayUpdate[cookedDays];
	const weekSize = pregnancySizeComparisonByDay[cookedDays];
	const formattedDueDate = dueDate.toLocaleDateString("en-AU", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "UTC",
	});

	const progressPercent = Math.round(progress * 100);
	const barWidth = 280;
	const barHeight = 28;

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-6 text-black font-inter">
				<div className="flex items-center justify-between border-b-2 border-black pb-3">
					<div className="text-4xl">{babyName}</div>
					<div className="text-xl">Due {formattedDueDate}</div>
				</div>

				<div className="flex flex-1 items-start justify-between gap-6">
					<div className="flex flex-col gap-4 pt-6">
						<div className="text-5xl mt-2">
							<span className="font-semibold">{cookedWeeks}</span> Weeks {", "}
							<span className="font-semibold">{cookedExtraDays}</span> days Old
						</div>
						{dayUpdate && (
							<div className="text-2xl leading-snug mt-6">{dayUpdate}</div>
						)}
						{weekSize && (
							<div className="flex items-center gap-3 text-2xl leading-snug mt-6">
								<svg
									width="28"
									height="20"
									viewBox="0 0 28 20"
									aria-hidden="true"
								>
									<path
										d="M18.5 1.5C13 1.5 9.5 5 7.2 8.5C5.4 11.2 4 14.5 6.1 17C7.7 18.9 10.6 19 13.4 18.4C18.6 17.3 25.5 11.8 24.7 6.4C24.2 3.1 21.9 1.5 18.5 1.5Z"
										fill="#000000"
									/>
								</svg>
								<div>About the size of {weekSize}.</div>
							</div>
						)}
					</div>

					<div className="flex flex-col items-start gap-4 pt-6">
						<div className="text-3xl font-semibold">
							{progressPercent}% Cooked
						</div>
						<div
							className="border-4 border-black"
							style={{ width: barWidth, height: barHeight }}
						>
							<div
								className="bg-black h-full"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
