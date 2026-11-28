import Link from "next/link";
import { Suspense } from "react";
import { AdminOnlineUsersDirectory } from "@/components/admin/AdminOnlineUsersDirectory";
import { type BotQuery } from "@/lib/adminBotReport";
import { liveBotDirectoryHref, liveBotPeriod, onlineUsersPath, onlineUsersTabParams } from "@/lib/adminLiveBotNavigation";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { requireAdminSession } from "@/lib/auth-guards";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";
import { ActiveBotDirectory } from "@/app/admin/users/online/active-bot-directory";
import { liveBotChoice, LiveBotLoading } from "@/app/admin/users/online/live-bot-ui";

export const metadata = { title: "Admin Online Users" };
export const dynamic = "force-dynamic";

export default async function AdminOnlineUsersPage({ searchParams }: { searchParams: Promise<BotQuery> }) {
  const session = await requireAdminSession("/admin/users/online");
  const raw = await searchParams;
  const activeBot = raw.tab === "active-bot";
  const humanFilters = onlineUsersTabParams(raw);
  const onlineHref = onlineUsersPath + (humanFilters.size ? "?" + humanFilters : "");
  const tabs = <nav aria-label="Live activity views" className="flex flex-wrap gap-2">
    <Link href={onlineHref} prefetch={false} aria-current={!activeBot ? "page" : undefined} className={liveBotChoice}>Online Users</Link>
    <Link href={liveBotDirectoryHref(liveBotPeriod(raw.period), humanFilters)} prefetch={false}
      aria-current={activeBot ? "page" : undefined} className={liveBotChoice}>Active Bot</Link>
  </nav>;

  if (activeBot) return <div className="min-w-0 space-y-4">
    {tabs}
    <Suspense fallback={<LiveBotLoading />}>
      <ActiveBotDirectory period={liveBotPeriod(raw.period)} humanFilters={humanFilters} />
    </Suspense>
  </div>;

  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const initial = await readAdminOnlineUsers(getPublicEnvironment(), new Date());
  return <div className="min-w-0 space-y-4">{tabs}<AdminOnlineUsersDirectory initial={initial} timeZone={timeZone} /></div>;
}
