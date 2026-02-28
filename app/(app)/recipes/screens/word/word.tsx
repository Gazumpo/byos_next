import { PreSatori } from "@/utils/pre-satori";
import { WORDS } from "./words";

function mod(n: number, m: number) {
	return ((n % m) + m) % m;
}

function getUtcDayNumber(date: Date) {
	const utcMidnight = Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
	);
	return Math.floor(utcMidnight / 86_400_000);
}

function getIsoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

type WordParams = { dayOffset?: unknown };

interface WordProps {
	width?: number;
	height?: number;
	params?: WordParams;
}

export default function Word({ width = 800, height = 480, params }: WordProps) {
	const isHalfScreen = width === 400 && height === 480;
	const dayOffsetRaw = params?.dayOffset;
	const dayOffset =
		typeof dayOffsetRaw === "number"
			? dayOffsetRaw
			: typeof dayOffsetRaw === "string"
				? Number(dayOffsetRaw)
				: 0;
	const safeDayOffset = Number.isFinite(dayOffset) ? Math.trunc(dayOffset) : 0;

	const today = new Date();
	const targetDayNumber = getUtcDayNumber(today) + safeDayOffset;
	const word = WORDS[mod(targetDayNumber, WORDS.length)];
	const targetDate = new Date(targetDayNumber * 86_400_000);

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-6 text-black">
				<div className="flex items-center justify-between border-b-2 border-black pb-3">
					<div className="flex flex-col">
						<div className="text-4xl font-notosans">Word of the day</div>
					</div>
				</div>

				<div className="flex flex-1 gap-6 pt-5">
					<div className="flex flex-col justify-between w-[48%]">
						<div className="flex flex-col gap-3">
							<div
								className={`text-7xl font-semibold leading-none font-notosans`}
							>
								{word.hiragana}
							</div>
							<div className={`text-4xl font-inter`}>
								{word.romaji}
							</div>
							<div className={`text-4xl font-inter`}>
								{word.english}
							</div>
							{word.kanji && (
								<div className={`text-4xl font-notosans`}>
									{word.kanji}
								</div>
							)}
						</div>

						{word.tip && (
							<div className="border-2 border-black rounded-md p-3 font-inter">
								<div className={`text-xl leading-snug font-inter`}>
									{word.tip}
								</div>
							</div>
						)}
					</div>

					<div className="flex flex-col w-[52%] gap-4 font-inter">
						<div className="flex flex-col border-2 border-black rounded-md p-4 font-inter">
							<div className={`text-xl leading-snug mt-2 font-notosans w-full`}>
								{word.example.japanese}
							</div>
							<div className="text-xl mt-1 font-inter w-full">
								{word.example.romaji}
							</div>
							<div className="text-xl mt-1 font-inter w-full">
								“{word.example.english}”
							</div>
						</div>
					</div>
				</div>

				<div className="flex items-stretch justify-between gap-6 pt-4 border-t-2 border-black font-inter">

				</div>
			</div>
		</PreSatori>
	);
}
