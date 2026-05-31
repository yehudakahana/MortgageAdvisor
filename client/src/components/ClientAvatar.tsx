export default function ClientAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
      {initials}
    </div>
  );
}
