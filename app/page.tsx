"use client";

import _ from "lodash";

function Button({ x, y }: { x: number; y: number }) {
  return (
    <button
      className="rounded w-20 h-20 bg-neutral-100 hover:bg-neutral-200"
      onClick={() => alert(`${x}, ${y}`)}
    >
      {x}, {y}
    </button>
  );
}

function Board() {
  return (
    <div className="space-y-2">
      {_.range(0, 3).map((y) => (
        <div key={y} className="space-x-2">
          {_.range(0, 3).map((x) => (
            <Button key={x} x={x} y={y} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <Board />
    </main>
  );
}
