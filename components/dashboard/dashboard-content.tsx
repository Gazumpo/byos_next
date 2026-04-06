"use client";

import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DeviceDisplayMode } from "@/lib/mixup/constants";
import {
	DEFAULT_IMAGE_HEIGHT,
	DEFAULT_IMAGE_WIDTH,
} from "@/lib/recipes/constants";
import type { Device, PlaylistItem, SystemLog } from "@/lib/types";
import {
	calculateRefreshPerDay,
	estimateBatteryLife,
	formatDate,
	getDeviceStatus,
} from "@/utils/helpers";

interface DashboardContentProps {
	devices: Device[];
	playlistItems: PlaylistItem[];
	systemLogs: SystemLog[];
}

const getGrayscaleLevels = (grayscale: number | null | undefined): number => {
	if (grayscale === 2 || grayscale === 4 || grayscale === 16) {
		return grayscale;
	}

	return 2;
};

const isTimeInRange = (
	timeToCheck: string,
	startTime: string,
	endTime: string,
): boolean => {
	if (startTime > endTime) {
		return timeToCheck >= startTime || timeToCheck < endTime;
	}

	return timeToCheck >= startTime && timeToCheck < endTime;
};

const getPlaylistPreviewScreen = (
	device: Device,
	playlistItems: PlaylistItem[],
): string | null => {
	if (!device.playlist_id) {
		return device.screen;
	}

	const items = playlistItems
		.filter((item) => item.playlist_id === device.playlist_id)
		.sort((a, b) => a.order_index - b.order_index);

	if (items.length === 0) {
		return device.screen;
	}

	const currentIndex = device.current_playlist_index || 0;
	const currentItem =
		items.find((item) => item.order_index === currentIndex) ||
		items[currentIndex] ||
		null;

	if (currentItem) {
		return currentItem.screen_id;
	}

	const now = new Date();
	const options = {
		timeZone: device.timezone || "UTC",
		hour12: false,
	} as Intl.DateTimeFormatOptions;

	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		hour: "2-digit",
		minute: "2-digit",
	});
	const [{ value: hour }, , { value: minute }] =
		timeFormatter.formatToParts(now);
	const currentTime = `${hour}:${minute}`;

	const dayFormatter = new Intl.DateTimeFormat("en-US", {
		...options,
		weekday: "long",
	});
	const currentDay = dayFormatter.format(now).toLowerCase();

	for (let i = 1; i < items.length + 1; i++) {
		const itemIndex = (currentIndex + i) % items.length;
		const item = items[itemIndex];

		const isTimeValid =
			!item.start_time ||
			!item.end_time ||
			isTimeInRange(currentTime, item.start_time, item.end_time);
		const isDayValid =
			!item.days_of_week ||
			(Array.isArray(item.days_of_week) &&
				item.days_of_week.includes(currentDay));

		if (isTimeValid && isDayValid) {
			return item.screen_id;
		}
	}

	return device.screen;
};

const getDevicePreviewSrc = (
	device: Device,
	playlistItems: PlaylistItem[],
	width: number,
	height: number,
	grayscale: number,
): string => {
	if (
		device.display_mode === DeviceDisplayMode.MIXUP &&
		device.mixup_id
	) {
		return `/api/bitmap/mixup/${device.mixup_id}.bmp?width=${width}&height=${height}&grayscale=${grayscale}`;
	}

	const screenToDisplay =
		device.display_mode === DeviceDisplayMode.PLAYLIST
			? getPlaylistPreviewScreen(device, playlistItems)
			: device.screen;

	return `/api/bitmap/${screenToDisplay || "not-found"}.bmp?width=${width}&height=${height}&grayscale=${grayscale}`;
};

const getBatteryColorClass = (batteryPercentage: number): string => {
	if (batteryPercentage < 20) {
		return "bg-red-500";
	}

	if (batteryPercentage < 50) {
		return "bg-yellow-500";
	}

	return "bg-primary";
};

const formatBatteryTimeLeft = (remainingDays: number): string => {
	if (remainingDays >= 2) {
		return `~${Math.round(remainingDays)} days left`;
	}

	if (remainingDays >= 1) {
		return `~${remainingDays.toFixed(1)} days left`;
	}

	return `~${Math.max(1, Math.round(remainingDays * 24))} hours left`;
};

export const DashboardContent = ({
	devices,
	playlistItems,
	systemLogs,
}: DashboardContentProps) => {
	// Process devices data
	const processedDevices = devices.map((device) => ({
		...device,
		status: getDeviceStatus(device),
	}));
	const sortedDevices = [...processedDevices].sort(
		(a, b) =>
			new Date(b.last_update_time || "").getTime() -
			new Date(a.last_update_time || "").getTime(),
	);

	const onlineDevices = processedDevices.filter((d) => d.status === "online");
	const offlineDevices = processedDevices.filter((d) => d.status === "offline");
	return (
		<>
			<Card className="transition-shadow hover:shadow-md hover:border-border/80">
				<CardContent className="py-4">
					<div className="flex flex-wrap items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Devices</span>
							<span className="font-semibold">{processedDevices.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Online</span>
							<span className="font-semibold">{onlineDevices.length}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground">Offline</span>
							<span className="font-semibold">{offlineDevices.length}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="mt-2 md:mt-4 transition-shadow hover:shadow-md hover:border-border/80">
				<CardHeader>
					<CardTitle>Devices</CardTitle>
				</CardHeader>
				<CardContent>
					{sortedDevices.length > 0 ? (
						<div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
							{sortedDevices.map((device) => {
								const orientation = device.screen_orientation || "landscape";
								const deviceWidth =
									orientation === "landscape"
										? device.screen_width || DEFAULT_IMAGE_WIDTH
										: device.screen_height || DEFAULT_IMAGE_HEIGHT;
								const deviceHeight =
									orientation === "landscape"
										? device.screen_height || DEFAULT_IMAGE_HEIGHT
										: device.screen_width || DEFAULT_IMAGE_WIDTH;
								const grayscaleLevels = getGrayscaleLevels(device.grayscale);
								const previewSrc = getDevicePreviewSrc(
									device,
									playlistItems,
									deviceWidth,
									deviceHeight,
									grayscaleLevels,
								);
								const refreshPerDay = calculateRefreshPerDay(device);
								const batteryEstimate = device.battery_voltage
									? estimateBatteryLife(device.battery_voltage, refreshPerDay)
									: null;
								const batteryColorClass = batteryEstimate
									? getBatteryColorClass(batteryEstimate.batteryPercentage)
									: "bg-muted";
								const batteryWidth = batteryEstimate
									? batteryEstimate.batteryPercentage === 0
										? 0
										: Math.max(6, batteryEstimate.batteryPercentage)
									: 0;

								return (
									<div
										key={device.id}
										className="rounded-xl border bg-card overflow-hidden"
									>
										<div className="border-b px-4 py-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<Link
														href={`/device/${device.friendly_id}`}
														className="font-medium hover:underline"
													>
														{device.name}
													</Link>
													<div className="text-xs text-muted-foreground mt-1">
														{device.friendly_id} · Last update{" "}
														<span suppressHydrationWarning>
															{formatDate(device.last_update_time)}
														</span>
													</div>
												</div>
												<div className="flex items-center gap-2 rounded-full border px-2.5 py-1">
													<StatusIndicator
														status={device.status}
														size="md"
													/>
													<span className="text-xs font-medium capitalize">
														{device.status}
													</span>
												</div>
											</div>
										</div>
										<div className="p-4 space-y-4">
											<div className="space-y-2">
												<div className="flex items-center justify-between text-xs text-muted-foreground">
													<span>Latest screen</span>
													<span>
														{deviceWidth}x{deviceHeight}
													</span>
												</div>
												<div className="rounded-lg border bg-muted overflow-hidden">
													<AspectRatio ratio={deviceWidth / deviceHeight}>
														<Image
															src={previewSrc}
															alt={`${device.name} latest screen`}
															fill
															className="object-contain"
															style={{ imageRendering: "pixelated" }}
															unoptimized
														/>
													</AspectRatio>
												</div>
											</div>
											<div className="rounded-lg border bg-muted/30 p-3">
												<div className="flex items-center justify-between gap-3 text-sm">
													<span className="text-muted-foreground">Battery</span>
													<span className="font-medium">
														{batteryEstimate
															? batteryEstimate.isCharging
																? "Charging"
																: `${Math.round(batteryEstimate.batteryPercentage)}%`
															: "Unknown"}
													</span>
												</div>
												<div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
													<div
														className={`h-full rounded-full transition-all ${batteryColorClass}`}
														style={{
															width: `${batteryWidth}%`,
														}}
													/>
												</div>
												<div className="mt-3 text-xs text-muted-foreground">
													{device.battery_voltage ? (
														batteryEstimate?.isCharging ? (
															`${device.battery_voltage}V reported`
														) : (
															`${device.battery_voltage}V · ${formatBatteryTimeLeft(
																batteryEstimate?.remainingDays || 0,
															)}`
														)
													) : (
														"Battery data unavailable"
													)}
												</div>
												<div className="mt-1 text-xs text-muted-foreground">
													{device.battery_voltage
														? `${Math.round(refreshPerDay)} refreshes/day estimate`
														: "Waiting for battery telemetry from the device"}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
							No devices available yet.
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="mt-2 md:mt-4 gap-4 transition-shadow hover:shadow-md hover:border-border/80">
				<CardHeader>
					<CardTitle>Recent System Logs</CardTitle>
					<CardDescription>
						Latest system events and alerts. &nbsp;
						<Link
							href="/system-logs"
							className="text-blue-500 hover:underline flex items-center gap-1"
						>
							<span>See all system logs</span>{" "}
							<ArrowRightIcon className="w-4 h-4" />
						</Link>
					</CardDescription>
				</CardHeader>
				<CardContent className="px-4">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[80px]">Time</TableHead>
								<TableHead className="w-[40px]">Level</TableHead>
								<TableHead>Source</TableHead>
								<TableHead>Message</TableHead>
								<TableHead className="max-w-[200px]">Metadata</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{systemLogs.length > 0 ? (
								systemLogs.map((log: SystemLog, index: number) => {
									const prevLog = index > 0 ? systemLogs[index - 1] : null;
									// Check if we should show time based on time difference with previous log
									const shouldTimeBeShown =
										index === 0 ||
										(prevLog &&
											Math.abs(
												new Date(log.created_at || "").getTime() -
													new Date(prevLog.created_at || "").getTime(),
											) /
												1000 >=
												3);
									// Check if we should show level based on level difference with previous log or time difference
									const shouldLevelBeShown =
										index === 0 ||
										(prevLog && prevLog.level !== log.level) ||
										(prevLog &&
											Math.abs(
												new Date(log.created_at || "").getTime() -
													new Date(prevLog.created_at || "").getTime(),
											) /
												1000 >=
												3);

									return (
										<TableRow key={log.id}>
											<TableCell suppressHydrationWarning>
												{shouldTimeBeShown ? formatDate(log.created_at) : ""}
											</TableCell>
											<TableCell>
												{shouldLevelBeShown ? (
													<Badge
														variant="outline"
														className={`
                              ${log.level === "error" ? "bg-red-100 text-red-800 border-red-200" : ""}
                              ${log.level === "warning" ? "bg-amber-100 text-amber-800 border-amber-200" : ""}
                              ${log.level === "info" ? "bg-blue-100 text-blue-800 border-blue-200" : ""}
                              ${log.level === "debug" ? "bg-gray-100 text-gray-800 border-gray-200" : ""}
                            `}
													>
														{log.level}
													</Badge>
												) : (
													""
												)}
											</TableCell>
											<TableCell>{log.source || "-"}</TableCell>
											<TableCell>{log.message}</TableCell>
											<TableCell className="max-w-[200px] truncate">
												{log.metadata}
											</TableCell>
										</TableRow>
									);
								})
							) : (
								<TableRow>
									<TableCell colSpan={5} className="h-32 text-center">
										<p className="text-muted-foreground text-sm">
											No system logs to be shown
										</p>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<div className="flex justify-center mt-4">
						Showing the latest {systemLogs.length} system logs. &nbsp;
						<Link
							href="/system-logs"
							className="text-blue-500 hover:underline flex items-center gap-1"
						>
							<span>See all system logs</span>{" "}
							<ArrowRightIcon className="w-4 h-4" />
						</Link>
					</div>
				</CardContent>
			</Card>
		</>
	);
};
