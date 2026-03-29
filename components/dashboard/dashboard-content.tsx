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
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatDate, getDeviceStatus } from "@/utils/helpers";

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

	const onlineDevices = processedDevices.filter((d) => d.status === "online");
	const offlineDevices = processedDevices.filter((d) => d.status === "offline");

	// Get the most recently updated device
	const lastUpdatedDevice =
		processedDevices.length > 0
			? [...processedDevices].sort(
					(a, b) =>
						new Date(b.last_update_time || "").getTime() -
						new Date(a.last_update_time || "").getTime(),
				)[0]
			: null;

	const orientation = lastUpdatedDevice?.screen_orientation || "landscape";
	const deviceWidth =
		orientation === "landscape"
			? lastUpdatedDevice?.screen_width || DEFAULT_IMAGE_WIDTH
			: lastUpdatedDevice?.screen_height || DEFAULT_IMAGE_HEIGHT;
	const deviceHeight =
		orientation === "landscape"
			? lastUpdatedDevice?.screen_height || DEFAULT_IMAGE_HEIGHT
			: lastUpdatedDevice?.screen_width || DEFAULT_IMAGE_WIDTH;
	const grayscaleLevels = getGrayscaleLevels(lastUpdatedDevice?.grayscale);
	const previewSrc = lastUpdatedDevice
		? getDevicePreviewSrc(
				lastUpdatedDevice,
				playlistItems,
				deviceWidth,
				deviceHeight,
				grayscaleLevels,
			)
		: null;

	const maxPreviewWidth = orientation === "landscape" ? 500 : 300;
	return (
		<>
			<div className="grid gap-2 md:gap-4 md:grid-cols-2">
				<Card className="transition-shadow hover:shadow-md hover:border-border/80">
					<CardHeader>
						<CardTitle>Latest Screen</CardTitle>
						<CardDescription suppressHydrationWarning>
							{lastUpdatedDevice
								? `Most recent screen, requested by ${lastUpdatedDevice?.name} (${lastUpdatedDevice?.friendly_id}) ${formatDate(lastUpdatedDevice?.last_update_time)}`
								: "No devices available"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{lastUpdatedDevice ? (
							<div className="flex flex-col items-center">
								<div
									className="rounded-xs bg-muted border overflow-hidden w-full"
									style={{
										maxWidth: `${maxPreviewWidth}px`,
										maxHeight: `${(maxPreviewWidth * deviceHeight) / deviceWidth}px`,
									}}
								>
									<AspectRatio
										ratio={deviceWidth / deviceHeight}
										className="w-full"
									>
										<Image
											src={previewSrc || "/api/bitmap/not-found.bmp"}
											alt="Device Screen"
											fill
											className="object-contain rounded-xs ring-2 ring-gray-200"
											style={{ imageRendering: "pixelated" }}
											unoptimized
										/>
									</AspectRatio>
								</div>
								<div className="text-xs text-amber-500 dark:text-amber-500/50 mt-2">
									Warning: due to the passive nature of the device, the screen
									shown here might be newer than the actual screen
								</div>
							</div>
						) : (
							<div className="flex flex-col space-y-3">
								<Skeleton className="h-[240px] w-full rounded-md" />
								<div className="flex justify-end">
									<Skeleton className="h-4 w-[200px]" />
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<div className="grid grid-rows-2 gap-2 md:gap-4">
					<Card className="transition-shadow hover:shadow-md hover:border-border/80">
						<CardHeader>
							<CardTitle>System Information</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Total Devices:</span>
									<span className="text-sm text-muted-foreground">
										{processedDevices.length}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Online Devices:</span>
									<span className="text-sm text-muted-foreground">
										{onlineDevices.length}
									</span>
								</div>
								<div className="flex justify-between items-center">
									<span className="text-sm font-medium">Offline Devices:</span>
									<span className="text-sm text-muted-foreground">
										{offlineDevices.length}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card className="transition-shadow hover:shadow-md hover:border-border/80">
						<CardHeader>
							<CardTitle>System Status</CardTitle>
							<CardDescription>
								Overview of all connected devices
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<h3 className="text-sm font-medium mb-2">Online Devices</h3>
									<div
										className="space-y-2 max-h-[100px] overflow-y-auto"
										style={{ scrollbarWidth: "thin" }}
									>
										{onlineDevices.length > 0 ? (
											onlineDevices.map((device) => (
												<div
													key={device.id}
													className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-2">
														<StatusIndicator status="online" size="md" />
														<Link
															href={`/device/${device.friendly_id}`}
															className="text-sm"
														>
															{device.name}
														</Link>
													</div>
													<span
														className="text-xs text-muted-foreground"
														suppressHydrationWarning
													>
														{formatDate(device.last_update_time)}
													</span>
												</div>
											))
										) : (
											<div className="text-muted-foreground text-sm">
												No devices are online
											</div>
										)}
									</div>
								</div>
								<div>
									<h3 className="text-sm font-medium mb-2">Offline Devices</h3>
									<div
										className="space-y-2 max-h-[100px] overflow-y-auto"
										style={{ scrollbarWidth: "thin" }}
									>
										{offlineDevices.length > 0 ? (
											offlineDevices.map((device) => (
												<div
													key={device.id}
													className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
												>
													<div className="flex items-center gap-2">
														<StatusIndicator status="offline" size="md" />
														<Link
															href={`/device/${device.friendly_id}`}
															className="text-sm"
														>
															{device.name}
														</Link>
													</div>
													<span
														className="text-xs text-muted-foreground"
														suppressHydrationWarning
													>
														{formatDate(device.last_update_time)}
													</span>
												</div>
											))
										) : (
											<div className="text-muted-foreground text-sm">
												No devices are offline
											</div>
										)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

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
