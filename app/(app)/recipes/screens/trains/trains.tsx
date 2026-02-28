import { PreSatori } from "@/utils/pre-satori";

interface TrainItem {
	origin: string;
	destination: string;
	time: string;
	platform?: string;
	status?: string;
}

interface TrainsProps {
	width?: number;
	height?: number;
	trains?: TrainItem[];
	stationName?: string;
	lastUpdated?: string;
}

export default function Trains({
	width = 800,
	height = 480,
	trains = [],
	stationName,
	lastUpdated,
}: TrainsProps) {
	const normalizeDestination = (destination: string) =>
		destination.trim().toLowerCase() === "fremantle"
			? "Freo"
			: destination.trim();

	const displayTrains = Array.isArray(trains) ? trains.slice(0, 8) : [];
	const perthTrains = displayTrains.filter(
		(train) =>
			train.destination?.toLowerCase() === "perth" ||
			train.destination?.toLowerCase() === "high wycombe",
	);
	const otherTrains = displayTrains.filter(
		(train) =>
			train.destination?.toLowerCase() !== "perth" &&
			train.destination?.toLowerCase() !== "high wycombe",
	);
	const timeZone = "Australia/Perth";
	const formatLastUpdated = (value?: string) => {
		if (!value) {
			return null;
		}
		const match = value.match(
			/(\d{2})\/(\d{2})\/(\d{4})\s+at\s+(\d{2}:\d{2})(?::\d{2})?/,
		);
		if (match) {
			const [, day, month, year, time] = match;
			const parsed = new Date(`${year}-${month}-${day}T${time}:00+08:00`);
			if (!Number.isNaN(parsed.getTime())) {
				return parsed.toLocaleTimeString("en-GB", {
					hour: "2-digit",
					minute: "2-digit",
					timeZone,
				});
			}
		}
		const fallback = new Date(value);
		if (Number.isNaN(fallback.getTime())) {
			return null;
		}
		return fallback.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone,
		});
	};

	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-4 gap-3 text-black">
				<div className="flex items-end justify-between border-b-2 border-black pb-2">
					<div className="flex flex-col gap-1">
						<h1 className="text-4xl font-inter">Trains</h1>
					</div>
					<div className="text-2xl font-inter">
						{new Date().toLocaleTimeString("en-GB", {
							hour: "2-digit",
							minute: "2-digit",
							timeZone,
						})}
					</div>
				</div>

				<div className="flex-1 overflow-hidden">
					{displayTrains.length === 0 ? (
						<div className="flex h-full items-center justify-center text-3xl font-inter">
							No upcoming trains
						</div>
					) : (
						<div className="flex h-full w-full gap-4 items-stretch">
							<div className="flex flex-1 min-w-0 flex-col gap-2">
								{perthTrains.length === 0 ? (
									<div className="text-2xl font-inter border-2 border-black rounded-md px-3 py-2">
										No Perth services
									</div>
								) : (
									perthTrains.map((train, index) => (
										<div
											key={`perth-${train.destination}-${index}`}
											className="flex items-center text-2xl font-inter border-2 border-black rounded-md px-3 py-2"
										>
											<div className="w-[65%]">
												{normalizeDestination(train.destination)}
											</div>
											<div className="w-[35%] text-right font-bold">
												{train.time}
											</div>
										</div>
									))
								)}
							</div>
							<div className="flex flex-1 min-w-0 flex-col gap-2">
								{otherTrains.length === 0 ? (
									<div className="text-2xl font-inter border-2 border-black rounded-md px-3 py-2">
										No other services
									</div>
								) : (
									otherTrains.map((train, index) => (
										<div
											key={`other-${train.destination}-${index}`}
											className="flex items-center text-2xl font-inter border-2 border-black rounded-md px-3 py-2"
										>
											<div className="w-[65%]">
												{normalizeDestination(train.destination)}
											</div>
											<div className="w-[35%] text-right font-bold">
												{train.time}
											</div>
										</div>
									))
								)}
							</div>
						</div>
					)}
				</div>

				<div className="border-t-2 border-black pt-2 text-xl font-inter flex justify-between">
					<div>
						{formatLastUpdated(lastUpdated)
							? `Updated ${formatLastUpdated(lastUpdated)}`
							: "Scheduled departures"}
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
