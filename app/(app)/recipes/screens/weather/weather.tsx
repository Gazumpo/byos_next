import { PreSatori } from "@/utils/pre-satori";
import {
	CloudIcon,
	FogIcon,
	humidityIcon,
	pressureIcon,
	RainIcon,
	SnowIcon,
	SunIcon,
	sunriseIcon,
	sunsetIcon,
	ThunderIcon,
	tempDown,
	tempIcon,
	tempUp,
	windIcon,
} from "./icons";

interface WeatherProps {
	temperature?: string;
	feelsLike?: string;
	humidity?: string;
	windSpeed?: string;
	description?: string;
	location?: string;
	lastUpdated?: string;
	highTemp?: string;
	lowTemp?: string;
	pressure?: string;
	sunset?: string;
	sunrise?: string;
	uv_index_max?: string;
	latitude?: number;
	longitude?: number;
	width?: number;
	height?: number;
}

export default function Weather({
	temperature = "Loading...",
	feelsLike = "Loading...",
	humidity = "Loading...",
	windSpeed = "Loading...",
	description = "Loading...",
	location = "Loading...",
	lastUpdated = "Loading...",
	highTemp = "Loading...",
	lowTemp = "Loading...",
	pressure = "Loading...",
	sunset = "Loading...",
	sunrise = "Loading...",
	uv_index_max = "Loading...",
	width = 800,
	height = 480,
}: WeatherProps) {
	// Weather statistics
	const weatherStats = [
		{ label: "Wind Speed", value: `${windSpeed} km/h`, icon: windIcon },
		{ label: "UV Index", value: `${uv_index_max}`, icon: sunriseIcon },
		{ label: "Sunrise", value: `${sunrise}`, icon: sunriseIcon },
		{ label: "Sunset", value: `${sunset}`, icon: sunsetIcon },
	];

	// Get weather icon based on description
	const getWeatherIcon = (desc: string) => {
		const lowerDesc = desc.toLowerCase();
		if (lowerDesc.includes("rain") || lowerDesc.includes("drizzle"))
			return RainIcon;
		if (lowerDesc.includes("snow")) return SnowIcon;
		if (lowerDesc.includes("cloud")) return CloudIcon;
		if (lowerDesc.includes("clear") || lowerDesc.includes("sun"))
			return SunIcon;
		if (lowerDesc.includes("fog") || lowerDesc.includes("mist")) return FogIcon;
		if (lowerDesc.includes("thunder")) return ThunderIcon;
		return CloudIcon; // default
	};

	const isHalfScreen = width <= 400;
	const isNarrow = width < 640;

	return (
		<PreSatori width={width} height={height}>
			<div className="flex flex-col w-full h-full bg-white">
				{isHalfScreen ? (
					<div className="flex flex-col p-4 items-center">
						<div className="flex flex-row items-center gap-4">
							<h2 className="font-inter text-6xl">{temperature}°C</h2>
							{getWeatherIcon(description)}
						</div>
						<div className="text-5xl mt-3 font-blockkie">
							<div className="flex flex-row items-center">
								{tempUp} {highTemp}°C
								{tempDown} {lowTemp}°C
							</div>
						</div>
					</div>
				) : (
					<div
						className={`flex p-4 items-center ${isNarrow ? "flex-col gap-4" : "flex-row justify-between"}`}
					>
						<h2 className="font-inter text-8xl">{temperature}°C</h2>
						{getWeatherIcon(description)}
						<div className="flex flex-col items-center justify-center">
							<div className="text-5xl mt-4 font-blockkie">
								<div className="flex flex-row items-center">
									{tempUp} {highTemp}°C
									{tempDown} {lowTemp}°C
								</div>
							</div>
						</div>
					</div>
				)}
				<div className="p-4 flex flex-col flex-1">
					<div
						className={`w-full flex flex-col flex-1 mb-4 ${isHalfScreen ? "gap-2" : "gap-4"} grid grid-cols-2 sm:grid-cols-3`}
					>
						{weatherStats.map((stat, index) => (
							<div
								key={index}
								className=" rounded-xl border border-black flex-1 flex flex-row items-center"
							>
								<div className="p-2 max-h-16">{stat.icon}</div>
								<div className="flex flex-col sm:ml-2">
									<div
										className={`leading-none m-0 ${isHalfScreen ? "text-2xl" : "text-3xl"}`}
									>
										{stat.label}
									</div>
									<div
										className={`leading-none m-0 ${isHalfScreen ? "text-2xl" : "text-3xl"}`}
									>
										{stat.value}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
