import { DateRangePickerValue } from "@/app/ee/admin/performance/DateRangeSelector";

export function getXDaysAgo(daysAgo: number) {
  const today = new Date();
  const daysAgoDate = new Date(today);
  daysAgoDate.setDate(today.getDate() - daysAgo);
  return daysAgoDate;
}

export function getXYearsAgo(yearsAgo: number) {
  const today = new Date();
  const yearsAgoDate = new Date(today);
  yearsAgoDate.setFullYear(yearsAgoDate.getFullYear() - yearsAgo);
  return yearsAgoDate;
}

export const timestampToDateString = (timestamp: string) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is zero-based
  const day = date.getDate();

  const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return formattedDate;
};

// Options for formatting the date
const dateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
};

// Options for formatting the time
const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true, // Use 12-hour format with AM/PM
};

export const timestampToReadableDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return (
    date.toLocaleDateString(undefined, dateOptions) +
    ", " +
    date.toLocaleTimeString(undefined, timeOptions)
  );
};

export const buildDateString = (date: Date | null) => {
  return date
    ? `${Math.round(
        (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      )} days ago`
    : "Select a time range";
};

export const getDateRangeString = (from: Date | null, to: Date | null) => {
  if (!from || !to) return null;

  const now = new Date();
  const fromDiffMs = now.getTime() - from.getTime();
  const toDiffMs = now.getTime() - to.getTime();

  const fromDiffDays = Math.floor(fromDiffMs / (1000 * 60 * 60 * 24));
  const toDiffDays = Math.floor(toDiffMs / (1000 * 60 * 60 * 24));

  const fromString = getTimeAgoString(from);
  const toString = getTimeAgoString(to);

  if (fromString === toString) return fromString;

  if (toDiffDays === 0) {
    return `${fromString} - Today`;
  }

  return `${fromString} - ${toString}`;
};

export const getTimeAgoString = (date: Date | null) => {
  if (!date) return null;

  const diffMs = new Date().getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (buildDateString(date).includes("Today")) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
};

export const getTimeElapsedString = (dateStart: Date) => {
  // return a readable string representing time elapsed
  // between the given time and now
  // aka 1d 5h 10m 6s
  // omits leading units if they are zero for readability

  const now = new Date(); // Current date and time

  const diffMs = now.getTime() - dateStart.getTime(); // Difference in milliseconds
  const diffSeconds = Math.floor(diffMs / 1000); // Convert to seconds
  const diffMinutes = Math.floor(diffSeconds / 60); // Convert to minutes
  const diffHours = Math.floor(diffMinutes / 60); // Convert to hours
  const diffDays = Math.floor(diffHours / 24); // Convert to days

  const days = diffDays > 0 ? `${diffDays}d ` : "";
  const hours = diffHours % 24 > 0 ? `${diffHours % 24}h ` : "";
  const minutes = diffMinutes % 60 > 0 ? `${diffMinutes % 60}m ` : "";
  const seconds = `${diffSeconds % 60}s`;

  return `${days}${hours}${minutes}${seconds}`.trim();
};
