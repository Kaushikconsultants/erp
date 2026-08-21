export function formatPresence(lastActiveAt: Date | string | null, rawStatus: string | null = "OFFLINE") {
  if (!lastActiveAt) {
    return { status: "OFFLINE" as const, label: "Offline", color: "#94a3b8", lastSeen: "Never" };
  }

  const lastTime = new Date(lastActiveAt).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - lastTime) / 1000);

  // If heartbeat is within 75 seconds
  if (diffSec <= 75) {
    if (rawStatus === "IDLE") {
      return { status: "IDLE" as const, label: "Idle / Away", color: "#f59e0b", lastSeen: "Active 1m ago" };
    }
    return { status: "ONLINE" as const, label: "Online", color: "#10b981", lastSeen: "Active now" };
  }

  // If between 75s and 5 mins
  if (diffSec < 300) {
    return { status: "IDLE" as const, label: "Idle", color: "#f59e0b", lastSeen: `${Math.floor(diffSec / 60)}m ago` };
  }

  // Offline
  let relativeText = "";
  if (diffSec < 3600) {
    relativeText = `${Math.floor(diffSec / 60)}m ago`;
  } else if (diffSec < 86400) {
    relativeText = `${Math.floor(diffSec / 3600)}h ago`;
  } else {
    relativeText = new Date(lastActiveAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  return { status: "OFFLINE" as const, label: "Offline", color: "#94a3b8", lastSeen: `Last seen ${relativeText}` };
}
