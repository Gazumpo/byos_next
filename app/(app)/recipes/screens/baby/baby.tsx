import { PreSatori } from "@/utils/pre-satori";
import { pregnancyDayUpdate } from "./pregnancyDayUpdate";
import { pregnancySizeComparisonByDay } from "./pregnancySizeComparisonByDay";
import { pregnancyNameSuggestionByDay } from "./pregnancyNameSuggestionByDay";

interface BabyProps {
	width?: number;
	height?: number;
}

const START_DATE = new Date("2025-12-08T00:00:00");
const END_DATE = new Date("2026-09-14T00:00:00");

const nameSuggestions = Object.values(pregnancyNameSuggestionByDay).filter(
	(name) => typeof name === "string" && name.trim().length > 0,
);

function pickRandom<T>(items: T[]) {
	return items[Math.floor(Math.random() * items.length)];
}

function toStartOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffInDays(from: Date, to: Date) {
	const start = toStartOfDay(from).getTime();
	const end = toStartOfDay(to).getTime();
	const msPerDay = 24 * 60 * 60 * 1000;
	return Math.round((end - start) / msPerDay);
}

export default function Baby({ width = 800, height = 480 }: BabyProps) {
	const today = new Date();
	const totalDays = Math.max(0, diffInDays(START_DATE, END_DATE));
	const cookedDaysRaw = diffInDays(START_DATE, today);
	const cookedDays = Math.min(Math.max(cookedDaysRaw, 0), totalDays);
	const remainingDays = Math.max(totalDays - cookedDays, 0);
	const cookedWeeks = Math.floor(cookedDays / 7);
	const cookedExtraDays = cookedDays % 7;
	const remainingWeeks = Math.floor(remainingDays / 7);
	const remainingExtraDays = remainingDays % 7;
	const progress = totalDays > 0 ? cookedDays / totalDays : 0;
	const dayUpdate = pregnancyDayUpdate[cookedDays];
	const weekSize = pregnancySizeComparisonByDay[cookedDays];
	const suggestedName = pickRandom(nameSuggestions);

	const progressPercent = Math.round(progress * 100);
	const barWidth = 280;
	const barHeight = 28;

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-6 text-black font-inter">
				<div className="flex items-center justify-between border-b-2 border-black pb-3">
					<div className="text-4xl">Baby Gino</div>
					<div className="text-xl"></div>
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
								<div>Size of a {weekSize}!</div>
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
						{suggestedName && (
							<div
								className="border-1 border-black rounded-md p-3 mt-22"
								style={{ width: barWidth }}
							>
								<div className="text-xl font-semibold">How about...</div>
								<div className="text-4xl font-semibold leading-none mt-1">
									{suggestedName}??
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
