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
	funFact,
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
			<div className="flex h-full w-full flex-col bg-white p-2 text-black">
				<div className="flex min-h-0 flex-1 flex-col">
					{showImage ? (
						<div className="flex h-full w-full items-center justify-center overflow-hidden">
							<div className="flex max-h-full max-w-full flex-col items-center">
								<div className="text-4xl">{detectedAt}</div>
								<img
									src={imageSrc || ""}
									alt={displayName}
									width={width - 32}
									height={height - 200}
									className="block"
									style={{
										filter: "invert(1)",
										maxWidth: "100%",
										maxHeight: `${height - 210}px`,
										objectFit: "contain",
									}}
								/>
								<div className="mt-1 flex w-full flex-col items-center justify-center text-center">
									<div className="text-2xl font-semibold">{displayName}</div>
									{funFact && (
										<div className="mt-4 max-w-[90%] text-xl leading-tight">
											{funFact}
										</div>
									)}
								</div>
							</div>
						</div>
					) : (
						<div className="flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-black px-10 py-4 text-center">
							<div className="text-4xl font-semibold">{displayName}</div>
							{funFact && (
								<div className="mt-4 max-w-[90%] text-2xl">{funFact}</div>
							)}
							<div className="mt-6 text-2xl">
								No image found.
							</div>
							{imageCandidates.length > 0 ? (
								<div className="mt-4 text-xl">
									Try {imageCandidates[0]}.
								</div>
							) : null}
						</div>
					)}
				</div>
			</div>
		</PreSatori>
	);
}
