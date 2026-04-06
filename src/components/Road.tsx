export function RoadComponent({ side }: { side: string }) {
  const isLeft = side === "left";

  return (
    <div className="w-12 h-20 bg-zinc-700 rounded-md flex flex-col items-center justify-between py-1">
      <div
        className={`text-sm ${isLeft ? "self-start ml-1" : "self-end mr-1"}`}
      >
        🚗
      </div>
      <div className="flex flex-col gap-1">
        <div className="w-1 h-2 bg-white/60 mx-auto" />
        <div className="w-1 h-2 bg-white/60 mx-auto" />
        <div className="w-1 h-2 bg-white/60 mx-auto" />
      </div>
    </div>
  );
}
