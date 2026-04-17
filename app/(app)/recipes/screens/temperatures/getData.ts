import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

interface TemperaturePoint {
	x: Date;
	y: number;
}

interface TemperatureData {
	livingRoom: TemperaturePoint[];
	bedroom: TemperaturePoint[];
	outside: TemperaturePoint[];
	lastUpdated: string;
	error?: string;
}

interface HAParams {
	haUrl?: string;
	haToken?: string;
	livingRoomEntity?: string;
	bedroomEntity?: string;
	outsideEntity?: string;
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
): Promise<TemperaturePoint[]> {
	// Removing minimal_response for better consistency with latest state
	const endpoint = `${url}/api/history/period/${startTime}?filter_entity_id=${entityId}&no_attributes`;

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
		const entries = data[0];
		history = entries
			.map((entry: any) => ({
				x: new Date(entry.last_changed || entry.last_updated),
				y: Number.parseFloat(entry.state),
			}))
			.filter((point: any) => !Number.isNaN(point.y));
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
			error: "Home Assistant URL or Token not provided.",
		};
	}

	// Start of today in ISO format
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);
	const startTime = startOfToday.toISOString();

	try {
		const [livingRoom, bedroom, outside] = await Promise.all([
			fetchHAHistory(haUrl, haToken, livingRoomEntity, startTime),
			fetchHAHistory(haUrl, haToken, bedroomEntity, startTime),
			fetchHAHistory(haUrl, haToken, outsideEntity, startTime),
		]);

		return {
			livingRoom,
			bedroom,
			outside,
			lastUpdated: new Date().toISOString(),
		};
	} catch (error: any) {
		console.error("Error fetching HA temperatures:", error);
		return {
			livingRoom: [],
			bedroom: [],
			outside: [],
			lastUpdated: new Date().toISOString(),
			error: error.message,
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
