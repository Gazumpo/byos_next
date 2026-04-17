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
	error?: string;
	width?: number;
	height?: number;
}

export default function Temperatures({
	livingRoom = [],
	bedroom = [],
	outside = [],
	lastUpdated,
	error,
	width,
	height,
}: TemperaturesProps) {
	// Fallback to defaults if not provided (for direct usage)
	const actualWidth = width || 800;
	const actualHeight = height || 480;

	// Parse dates if they come from JSON stringification
	const parseData = (data: any[]): GraphDataPoint[] =>
		data.map((d) => ({
			x: new Date(d.x),
			y: d.y,
		}));

	const livingRoomData = parseData(livingRoom);
	const bedroomData = parseData(bedroom);
	const outsideData = parseData(outside);

	const allData = [livingRoomData, bedroomData, outsideData];
	const lineColors = ["#000000", "#666666", "#999999"];

	const getCurrentTemp = (data: GraphDataPoint[]) => {
		if (data.length === 0) return "--";
		return data[data.length - 1].y.toFixed(1);
	};

	const formattedLastUpdated = lastUpdated
		? new Date(lastUpdated).toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			})
		: "";

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
								width={actualWidth - 48}
								height={actualHeight - 200}
								lineColor={lineColors}
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
									style={{ backgroundColor: lineColors[2] }}
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
