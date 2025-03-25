import { Clock } from "lucide-react";

export default function GameTimer({
  seconds,
  active = false
}: {
  seconds: number;
  active?: boolean;
}) {
  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Determine color based on time remaining
  const getTimeColor = () => {
    if (seconds <= 30) return "text-red-600 dark:text-red-400";
    if (seconds <= 60) return "text-amber-600 dark:text-amber-400";
    return "text-slate-900 dark:text-slate-100";
  };

  return (
    <div
      className={`font-mono text-2xl font-bold transition-colors ${getTimeColor()} ${
        active ? "animate-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 ${active ? "opacity-100" : "opacity-50"}`} />
        <span>{formatTime(seconds)}</span>
      </div>
    </div>
  );
}
