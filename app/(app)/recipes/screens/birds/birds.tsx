import { PreSatori } from "@/utils/pre-satori";
import type { BirdData } from "./getData";
import {
	BirdIcon
} from "./icons";

export default async function Birds({
	items = [],
	width = 800,
	height = 480,
}: BirdData & { width?: number; height?: number }) {
	const timeZone = "Australia/Perth";
	const isPortrait = height > width;
	const isHalfScreen = width <= 400;
	const isSingleColumn = isPortrait || isHalfScreen;

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

	const todayKey = (() => {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).formatToParts(new Date());
		const map = Object.fromEntries(
			parts.map((part) => [part.type, part.value]),
		) as Record<string, string>;
		return `${map.year}-${map.month}-${map.day}`;
	})();

	const formatTime = (value?: string) => {
		if (!value) return "";
		const parts = value.split(":");
		if (parts.length < 2) return value;
		return `${parts[0]}:${parts[1]}`;
	};

	const timeToMinutes = (value?: string) => {
		if (!value) return -1;
		const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
		if (!match) return -1;
		const hours = Number.parseInt(match[1], 10);
		const minutes = Number.parseInt(match[2], 10);
		if (Number.isNaN(hours) || Number.isNaN(minutes)) return -1;
		return hours * 60 + minutes;
	};

	const truncate = (value: string, max: number) => {
		if (value.length <= max) return value;
		return `${value.slice(0, Math.max(0, max - 1))}…`;
	};

	type BirdSummary = {
		key: string;
		name: string;
		count: number;
		bestConfidence: number;
		lastTime: string;
		lastMinutes: number;
	};

	const { summaries, detectionsToday, speciesToday } = Array.isArray(items)
		? (() => {
				const map = new Map<string, BirdSummary>();
				let detections = 0;

				for (const item of items) {
					if (getDateKey(item.Date) !== todayKey) continue;
					detections += 1;

					const key = item.Com_Name || item.Sci_Name || "";
					if (!key) continue;

					const name = item.Com_Name || item.Sci_Name || key;
					const minutes = timeToMinutes(item.Time);
					const timeLabel = formatTime(item.Time);
					const confidence =
						typeof item.Confidence === "number" ? item.Confidence : 0;

					const existing = map.get(key);
					if (!existing) {
						map.set(key, {
							key,
							name,
							count: 1,
							bestConfidence: confidence,
							lastTime: timeLabel,
							lastMinutes: minutes,
						});
						continue;
					}

					existing.count += 1;
					if (confidence > existing.bestConfidence) {
						existing.bestConfidence = confidence;
					}
					if (minutes > existing.lastMinutes) {
						existing.lastMinutes = minutes;
						existing.lastTime = timeLabel;
					}
				}

				const all = Array.from(map.values()).sort((a, b) => {
					if (b.lastMinutes !== a.lastMinutes)
						return b.lastMinutes - a.lastMinutes;
					if (b.bestConfidence !== a.bestConfidence)
						return b.bestConfidence - a.bestConfidence;
					return a.name.localeCompare(b.name);
				});

				const maxItems = isHalfScreen ? 6 : 12;
				return {
					summaries: all.slice(0, maxItems),
					detectionsToday: detections,
					speciesToday: map.size,
				};
			})()
		: { summaries: [] as BirdSummary[], detectionsToday: 0, speciesToday: 0 };

	const columns = (() => {
		const columnCount = isSingleColumn ? 1 : 2;
		const next: BirdSummary[][] = Array.from({ length: columnCount }, () => []);
		for (let i = 0; i < summaries.length; i += 1) {
			next[i % columnCount].push(summaries[i]);
		}
		return next;
	})();

	const headerDate = new Intl.DateTimeFormat("en-AU", {
		timeZone,
		weekday: "short",
		month: "short",
		day: "2-digit",
	}).format(new Date());

	const headerTime = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date());

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white p-4 gap-3 text-black font-inter">
				{/* Header */}
				<div className="flex items-end justify-between border-b-2 border-black pb-2">
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-3">
							<h1 className="text-4xl font-inter">Todays Birds</h1>
						</div>
					</div>
					<div className="text-4xl font-inter">{headerTime}</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden">
					{summaries.length === 0 ? (
						<div
							className={`flex h-full items-center justify-center ${isHalfScreen ? "text-2xl" : "text-3xl"}`}
						>
							No detections
						</div>
					) : (
						<div
							className={`flex h-full w-full gap-4 items-stretch ${isSingleColumn ? "flex-col" : "flex-row"}`}
						>
							{columns.map((col, colIdx) => (
								<div
									key={
										isSingleColumn ? "single" : colIdx === 0 ? "left" : "right"
									}
									className="flex flex-1 min-w-0 flex-col gap-2"
								>
									{col.map((item) => {
										return (
											<div
												key={item.key}
												className={`flex items-center justify-between border-2 border-black rounded-md ${isHalfScreen ? "px-2 py-2" : "px-3 py-2"} ${isHalfScreen ? "text-2xl" : "text-2xl"}`}
											>
												<div className="flex-1 min-w-0 pr-2 font-semibold overflow-hidden">
													{truncate(item.name, isHalfScreen ? 20 : 26)}
												</div>
												<div className="flex items-center justify-end gap-3 tabular-nums">
													<div className="font-bold w-[5ch] text-right flex-none">
														{item.lastTime || "--:--"}
													</div>
													<div className="text-xl w-[3ch] text-right flex-none">
														×{item.count}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							))}
						</div>
					)}
				</div>

				<div
					className={`border-t-2 border-black pt-2 flex justify-between ${isHalfScreen ? "text-lg" : "text-xl"}`}
				>
					<div>{detectionsToday} detections today</div>
				</div>
			</div>
		</PreSatori>
	);
}
