export const dynamic = "force-dynamic";

interface TemperaturePoint {
	x: Date;
	y: number;
}

interface HAEntry {
	state: string;
	last_changed?: string;
	last_updated?: string;
}

interface TemperatureData {
	livingRoom: TemperaturePoint[];
	bedroom: TemperaturePoint[];
	outside: TemperaturePoint[];
	lastUpdated: string;
	historyHours: number;
	error?: string;
}

interface HAParams {
	haUrl?: string;
	haToken?: string;
	livingRoomEntity?: string;
	bedroomEntity?: string;
	outsideEntity?: string;
	historyHours?: number;
}

async function fetchHAState(
	url: string,
	token: string,
	entityId: string,
): Promise<TemperaturePoint | null> {
	const endpoint = `${url}/api/states/${entityId}`;

	try {
		const response = await fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			next: { revalidate: 60 },
		});

		if (!response.ok) return null;

		const entry = await response.json();
		const val = Number.parseFloat(entry.state);
		if (Number.isNaN(val)) return null;

		return {
			x: new Date(entry.last_changed || entry.last_updated),
			y: val,
		};
	} catch (error) {
		console.error(`Error fetching state for ${entityId}:`, error);
		return null;
	}
}

async function fetchHAHistory(
	url: string,
	token: string,
	entityId: string,
	startTime: string,
	endTime: string,
): Promise<TemperaturePoint[]> {
	// Removing minimal_response for better consistency with latest state
	const endpoint = `${url}/api/history/period/${startTime}?filter_entity_id=${entityId}&no_attributes&end_time=${endTime}`;

	const [historyResponse, currentState] = await Promise.all([
		fetch(endpoint, {
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			next: { revalidate: 300 },
		}),
		fetchHAState(url, token, entityId),
	]);

	if (!historyResponse.ok) {
		throw new Error(
			`HA History API responded with status: ${historyResponse.status}`,
		);
	}

	const data = await historyResponse.json();
	let history: TemperaturePoint[] = [];

	if (Array.isArray(data) && data.length > 0) {
		const entries = data[0] as HAEntry[];
		history = entries
			.map((entry: HAEntry) => ({
				x: new Date(entry.last_changed || entry.last_updated || new Date()),
				y: Number.parseFloat(entry.state),
			}))
			.filter((point: TemperaturePoint) => !Number.isNaN(point.y));
	}

	// Append current state if it's newer than the last history point
	if (currentState) {
		const lastHistoryPoint = history[history.length - 1];
		if (
			!lastHistoryPoint ||
			currentState.x.getTime() > lastHistoryPoint.x.getTime()
		) {
			history.push(currentState);
		}
	}

	return history;
}

async function getTemperatures(params: HAParams): Promise<TemperatureData> {
	const haUrl = params.haUrl || process.env.HA_URL;
	const haToken = params.haToken || process.env.HA_TOKEN;
	const historyHours = params.historyHours || 24;
	const livingRoomEntity =
		params.livingRoomEntity || "sensor.living_room_temperature";
	const bedroomEntity = params.bedroomEntity || "sensor.bedroom_temperature";
	const outsideEntity = params.outsideEntity || "sensor.outside_temperature";

	if (!haUrl || !haToken) {
		return {
			livingRoom: [],
			bedroom: [],
			outside: [],
			lastUpdated: new Date().toISOString(),
			historyHours,
			error: "Home Assistant URL or Token not provided.",
		};
	}

	// Calculate start and end time based on historyHours
	const now = new Date();
	const startTimeDate = new Date(now.getTime() - historyHours * 60 * 60 * 1000);
	const startTime = startTimeDate.toISOString();
	const endTime = now.toISOString();

	try {
		const [livingRoom, bedroom, outside] = await Promise.all([
			fetchHAHistory(haUrl, haToken, livingRoomEntity, startTime, endTime),
			fetchHAHistory(haUrl, haToken, bedroomEntity, startTime, endTime),
			fetchHAHistory(haUrl, haToken, outsideEntity, startTime, endTime),
		]);

		return {
			livingRoom,
			bedroom,
			outside,
			lastUpdated: new Date().toISOString(),
			historyHours,
		};
	} catch (error) {
		console.error("Error fetching HA temperatures:", error);
		return {
			livingRoom: [],
			bedroom: [],
			outside: [],
			lastUpdated: new Date().toISOString(),
			historyHours,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export default async function getData(
	params?: HAParams,
): Promise<TemperatureData> {
	// We use the params if provided, otherwise fallback to env
	const data = await getTemperatures(params || {});
	return data;
}
