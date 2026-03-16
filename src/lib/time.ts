export function formatInUserTZ(
  iso: string,
  tz: string = "Asia/Kolkata",
  opts?: Intl.DateTimeFormatOptions
) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: tz,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
}