import { headers } from "next/headers";
import { Suspense } from "react";
import { PlaylistPageClient } from "@/components/playlists/playlist-page-client";
import { getInitData } from "@/lib/getInitData";

export const metadata = {
	title: "Playlists",
	description: "Manage your device playlists",
};

const PlaylistsData = async () => {
	const headersList = await headers();
	const _userAgent = headersList.get("user-agent");

	const { playlists, playlistItems, mixups } = await getInitData();

	return (
		<PlaylistPageClient
			initialPlaylists={playlists}
			initialPlaylistItems={playlistItems}
			initialMixups={mixups}
		/>
	);
};

export default function PlaylistsPage() {
	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold">Playlists</h1>
					<p className="text-muted-foreground">
						Create and manage playlists for your TRMNL devices.
					</p>
				</div>
			</div>

			<Suspense fallback={<div>Loading playlists...</div>}>
				<PlaylistsData />
			</Suspense>
		</div>
	);
}
