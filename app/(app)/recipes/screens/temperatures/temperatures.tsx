import { Graph, GraphDataPoint } from "@/components/ui/graph";
import { PreSatori } from "@/utils/pre-satori";

interface TemperaturePoint {
	x: string | Date;
	y: number;
}

interface TemperaturesProps {
	livingRoom?: TemperaturePoint[];
	bedroom?: TemperaturePoint[];
	outside?: TemperaturePoint[];
	lastUpdated?: string;
	historyHours?: number;
	error?: string;
	width?: number;
	height?: number;
}

export default function Temperatures({
	livingRoom = [],
	bedroom = [],
	outside = [],
	lastUpdated,
	historyHours = 24,
	error,
	width,
	height,
}: TemperaturesProps) {
	// Fallback to defaults if not provided (for direct usage)
	const actualWidth = width || 800;
	const actualHeight = height || 480;

	// Parse dates if they come from JSON stringification
	const parseData = (data: TemperaturePoint[]): GraphDataPoint[] =>
		data.map((d) => ({
			x: new Date(d.x),
			y: d.y,
		}));

	const livingRoomData = parseData(livingRoom);
	const bedroomData = parseData(bedroom);
	const outsideData = parseData(outside);

	const allData = [livingRoomData, bedroomData, outsideData];
	const lineColors = ["#000000", "#666666", "#999999"];
	const lineDashes = [undefined, undefined, "8,8"];

	const getCurrentTemp = (data: GraphDataPoint[]) => {
		if (data.length === 0) return "--";
		return data[data.length - 1].y.toFixed(1);
	};

	// Calculate X domain based on historyHours
	const endAt = lastUpdated ? new Date(lastUpdated) : new Date();
	const startAt = new Date(endAt.getTime() - historyHours * 60 * 60 * 1000);
	const xDomain: [Date, Date] = [startAt, endAt];

	return (
		<PreSatori useDoubling={true} width={actualWidth} height={actualHeight}>
			<div className="flex flex-col w-full h-full bg-white p-6 text-black">
				<div className="flex justify-between items-center mb-1">
					<h1 className="text-3xl font-bold text-black">Temperature History</h1>
				</div>

				{error ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="p-4 border-2 border-black rounded-lg text-3xl text-black">
							{error}
						</div>
					</div>
				) : (
					<>
						<div className="flex-1 w-full text-black">
							<Graph
								data={allData}
								isTimeData={true}
								xDomain={xDomain}
								width={actualWidth - 48}
								height={actualHeight - 200}
								lineColor={lineColors}
								lineDash={lineDashes}
								lineWidth={4}
								showGrid={true}
								yTicks={6}
								xTicks={4}
								yAxisFormat={(v) => `${v}°`}
							/>
						</div>

						<div className="flex justify-around items-center mt-4 text-black gap-4">
							<div className="flex flex-col items-center flex-1">
								<div
									className="w-full h-2 mb-1"
									style={{ backgroundColor: lineColors[0] }}
								></div>
								<span className="text-2xl font-semibold text-black">
									Living Room
								</span>
								<span className="text-6xl font-bold text-black">
									{getCurrentTemp(livingRoomData)}°C
								</span>
							</div>
							<div className="flex flex-col items-center flex-1">
								<div
									className="w-full h-2 mb-1"
									style={{ backgroundColor: lineColors[1] }}
								></div>
								<span className="text-2xl font-semibold text-black">
									Bedroom
								</span>
								<span className="text-6xl font-bold text-black">
									{getCurrentTemp(bedroomData)}°C
								</span>
							</div>
							<div className="flex flex-col items-center flex-1">
								<div
									className="w-full h-2 mb-1"
									style={{
										backgroundImage: `linear-gradient(to right, ${lineColors[2]} 50%, transparent 50%)`,
										backgroundSize: "20px 100%",
									}}
								></div>
								<span className="text-2xl font-semibold text-black">
									Outside
								</span>
								<span className="text-6xl font-bold text-black">
									{getCurrentTemp(outsideData)}°C
								</span>
							</div>
						</div>
					</>
				)}
			</div>
		</PreSatori>
	);
}
