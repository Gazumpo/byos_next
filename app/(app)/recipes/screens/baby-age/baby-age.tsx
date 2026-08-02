import { PreSatori } from "@/utils/pre-satori";
import type { BabyAgeData } from "./getData";

interface BabyAgeProps extends Partial<BabyAgeData> {
	width?: number;
	height?: number;
}

export default function BabyAge({
	width = 800,
	height = 480,
	babyName = "Baby",
	birthDateLabel = "",
	ageLabel = "Age unavailable",
	dailyNote = "Every child develops at their own pace.",
}: BabyAgeProps) {
	return (
		<PreSatori useDoubling={true} width={width} height={height}>
			<div className="flex h-full w-full flex-col bg-white p-6 text-black font-inter">
				<div className="flex items-center justify-between border-b-2 border-black pb-3">
					<div className="text-4xl">{babyName}</div>
					<div className="text-xl">Born {birthDateLabel}</div>
				</div>

				<div className="flex flex-1 flex-col pt-6">
					<div className="text-xl uppercase tracking-wide">Today</div>
					<div className="text-5xl font-semibold leading-tight mt-1">
						{ageLabel}
					</div>

					<div className="flex flex-1 flex-col justify-center border-2 border-black rounded-md p-5 mt-6">
						<div className="text-3xl leading-snug mt-2">{dailyNote}</div>
					</div>
				</div>
			</div>
		</PreSatori>
	);
}
