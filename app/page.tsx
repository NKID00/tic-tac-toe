"use client";

import { MouseEventHandler, useReducer } from "react";
import _ from "lodash";

class BoardState {
  squares: SquareState[][];
  turn: Turn;

  constructor() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
    this.turn = Turn.Blue;
  }

  square(x: number, y: number): SquareState {
    return this.squares[y][x];
  }

  setSquare(x: number, y: number, state: SquareState): void;
  setSquare(x: number, y: number, state: Turn): void;
  setSquare(x: number, y: number, state: SquareState | Turn): void {
    switch (state) {
      case Turn.Blue:
        this.squares[y][x] = SquareState.Blue;
        break;
      case Turn.Red:
        this.squares[y][x] = SquareState.Red;
        break;
      default:
        this.squares[y][x] = state;
        break;
    }
  }

  isSquareEmpty(x: number, y: number): boolean {
    return this.square(x, y) === SquareState.Empty;
  }

  nextTurn(): void {
    switch (this.turn) {
      case Turn.Blue:
        this.turn = Turn.Red;
        break;
      case Turn.Red:
        this.turn = Turn.Blue;
        break;
    }
  }

  clone(): BoardState {
    return _.cloneDeep(this);
  }
}

enum SquareState {
  Empty,
  Blue,
  Red,
}

enum Turn {
  Blue,
  Red,
}

function Square({
  state,
  onClick,
}: {
  state: SquareState;
  onClick: MouseEventHandler;
}) {
  let bg: string = "";
  switch (state) {
    case SquareState.Empty:
      bg = "bg-neutral-100 hover:bg-neutral-200";
      break;
    case SquareState.Blue:
      bg = "bg-sky-100";
      break;
    case SquareState.Red:
      bg = "bg-red-100";
      break;
  }
  return <button className={`rounded w-20 h-20 ${bg}`} onClick={onClick} />;
}

function onClickSquare(
  board: BoardState,
  action: { x: number; y: number },
): BoardState {
  let { x, y } = action;
  if (board.isSquareEmpty(x, y)) {
    board = board.clone();
    board.setSquare(x, y, board.turn);
    board.nextTurn();
  }
  return board;
}

function Board() {
  const [board, dispatch] = useReducer(
    onClickSquare,
    null,
    () => new BoardState(),
  );
  return (
    <div className="space-y-2">
      {_.range(0, 3).map((y) => (
        <div key={y} className="space-x-2">
          {_.range(0, 3).map((x) => (
            <Square
              key={x}
              state={board.square(x, y)}
              onClick={() => {
                dispatch({ x, y });
              }}
            />
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
