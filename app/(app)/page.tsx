import { headers } from "next/headers";
import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DbInitializer } from "@/components/dashboard/db-initializer";
import { Badge } from "@/components/ui/badge";
import { getInitData } from "@/lib/getInitData";

const DashboardRuntime = async () => {
	const headersList = await headers();
	const _userAgent = headersList.get("user-agent");

	// Get data from the centralized getInitData
	// Since this is cached, it won't cause duplicate requests
	const { devices, playlistItems, systemLogs, dbStatus } = await getInitData();

	if (!dbStatus.ready) {
		return (
			<>
				<div className="mt-4 rounded-lg p-4 border border-muted shadow">
					{dbStatus.error === "ERROR_ENV_VAR_DATABASE_URL_NOT_SET" && (
						<div className="p-4">
							<h3 className="font-bold text-2xl mb-2">
								🤔
								<span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
									{" "}
									Hmm, we are missing something...
								</span>
							</h3>
							<p className="mb-3">
								We&apos;re missing the{" "}
								<span className="font-mono bg-muted px-1 rounded">
									DATABASE_URL
								</span>{" "}
								in your environment variables (/.env file).
							</p>

							<div className="mt-4 space-y-3">
								<p className="font-medium">Here&apos;s how to fix this:</p>

								<div className="ml-2 pl-3 border-l-2 border-muted-foreground">
									<p className="mb-1">
										<span className="font-semibold">Option 1:</span> Check your
										Vercel integration
									</p>
									<p className="text-sm text-muted-foreground mb-2">
										Go to your{" "}
										<a
											href="https://app.supabase.com/project/_/settings/integrations"
											className="text-blue-600 hover:underline"
										>
											Supabase Dashboard Integrations
										</a>{" "}
										to verify your Vercel connection, remember to toggle on
										&ldquo;Development&ldquo;, then
										&ldquo;Manage&ldquo;/&ldquo;Resync enviroment
										variables&ldquo;; finally from your local development
										environment, run{" "}
										<span className="font-mono bg-muted px-1 rounded">
											vercel link
										</span>{" "}
										and{" "}
										<span className="font-mono bg-muted px-1 rounded">
											vercel env pull
										</span>
										.
									</p>
								</div>

								<div className="ml-2 pl-3 border-l-2 border-muted-foreground">
									<p className="mb-1">
										<span className="font-semibold">Option 2:</span> Add them
										manually
									</p>
									<p className="text-sm text-muted-foreground mb-2">
										Get your API credentials directly from the{" "}
										<a
											href="https://app.supabase.com/project/_/settings/api?showConnect=true"
											className="text-blue-600 hover:underline"
										>
											Supabase API Settings
										</a>{" "}
										page, under &ldquo;App Frameworks&ldquo;, save to your .env
										file. Then, don&apos;t forget to run the database
										initialization SQL script shown below using the{" "}
										<a
											href="https://app.supabase.com/project/_/sql/new"
											className="text-blue-600 hover:underline"
										>
											SQL Editor
										</a>{" "}
										in your Supabase dashboard.
									</p>
								</div>
							</div>
						</div>
					)}
					{dbStatus.error?.includes("Missing required tables") && (
						<div className="p-4">
							<h3 className="font-bold text-2xl mb-2">
								🤔
								<span className="bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
									{" "}
									Database schema is not valid...
								</span>
							</h3>
							<p>
								We are missing the following tables:{" "}
								{dbStatus.error?.replace("Missing required tables: ", "")}
							</p>
						</div>
					)}
					<DbInitializer connectionUrl={dbStatus.PostgresUrl} />
				</div>
				<DashboardSkeleton className="filter blur-[1px] pointer-events-none mt-6" />
			</>
		);
	}

	return (
		<>
			<DashboardContent
				devices={devices}
				playlistItems={playlistItems}
				systemLogs={systemLogs}
			/>
		</>
	);
};

export default function Dashboard() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardRuntime />
		</Suspense>
	);
}
