import { PreSatori } from "@/utils/pre-satori";
import type { BirdImageData } from "./getData";

type BirdImageProps = BirdImageData & {
	width?: number;
	height?: number;
};

const parseBirdDateTime = (dateValue?: string, timeValue?: string) => {
	if (!dateValue) return null;

	const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const dmyMatch = dateValue.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
	const normalizedDate = isoMatch
		? `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
		: dmyMatch
			? `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
			: null;

	if (!normalizedDate) return null;

	const normalizedTime =
		typeof timeValue === "string" && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)
			? timeValue.length === 5
				? `${timeValue}:00`
				: timeValue
			: "00:00:00";

	const parsed = new Date(`${normalizedDate}T${normalizedTime}+08:00`);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatTimeAgo = (dateValue?: string, timeValue?: string) => {
	const detectedAt = parseBirdDateTime(dateValue, timeValue);
	if (!detectedAt) return "Unknown time";

	const diffMs = Date.now() - detectedAt.getTime();
	if (diffMs <= 60_000) return "Just now";

	const diffMinutes = Math.floor(diffMs / 60_000);
	if (diffMinutes < 60) {
		return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export default async function BirdImage({
	latestBird,
	imageSrc,
	imageCandidates = [],
	width = 800,
	height = 480,
}: BirdImageProps) {
	const displayName =
		latestBird?.Com_Name || latestBird?.Sci_Name || "No bird detected";
	const detectedAt = latestBird
		? formatTimeAgo(latestBird.Date, latestBird.Time)
		: "Waiting for bird detections";
	const showImage = Boolean(imageSrc);

	return (
		<PreSatori width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-4 text-black">
				<div className="flex items-end justify-between border-b-2 border-black pb-2">
					<div className="flex flex-col">
						<div className="text-2xl">{detectedAt}</div>
					</div>
					<div className="text-right">
						<div className="text-2xl font-semibold">{displayName}</div>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 py-4">
					{showImage ? (
						<div className="flex h-full w-full items-center justify-center overflow-hidden bg-neutral-100">
							<img
								src={imageSrc || ""}
								alt={displayName}
								width={width - 32}
								height={height - 140}
								className="h-full w-full object-contain"
								style={{ filter: "invert(1)" }}
							/>
						</div>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-black px-10 text-center">
							<div className="text-4xl font-semibold">{displayName}</div>
							<div className="mt-3 text-2xl">
								Add an image named with the scientific name in the recipe&apos;s
								{" "}`images` folder.
							</div>
							{imageCandidates.length > 0 ? (
								<div className="mt-4 text-xl">
									Try naming it {imageCandidates[0]}.
								</div>
							) : null}
						</div>
					)}
				</div>
			</div>
		</PreSatori>
	);
}
