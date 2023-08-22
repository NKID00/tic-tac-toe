"use client";

import { MouseEventHandler, ReactElement, useReducer } from "react";
import _ from "lodash";

class BoardState {
  squares: SquareState[][];

  constructor() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
  }

  square(x: number, y: number): SquareState {
    return this.squares[y][x];
  }

  clickSquare(x: number, y: number): void {
    switch (this.turn()) {
      case Turn.Blue:
        this.squares[y][x] = SquareState.Blue;
        break;
      case Turn.Red:
        this.squares[y][x] = SquareState.Red;
        break;
    }
  }

  isSquareEmpty(x: number, y: number): boolean {
    return this.square(x, y) === SquareState.Empty;
  }

  emptySquareCount(): number {
    return _.sum(
      this.squares.map((states) =>
        _.sum(states.map((state) => (state === SquareState.Empty ? 1 : 0))),
      ),
    );
  }

  turn(): Turn {
    return this.emptySquareCount() % 2 === 0 ? Turn.Red : Turn.Blue;
  }

  gameState(): GameState {
    if (
      _.range(0, 3).some((y) =>
        _.range(0, 3).every((x) => this.square(x, y) === SquareState.Blue),
      ) ||
      _.range(0, 3).some((x) =>
        _.range(0, 3).every((y) => this.square(x, y) === SquareState.Blue),
      ) ||
      _.range(0, 3).every((i) => this.square(i, i) === SquareState.Blue) ||
      _.range(0, 3).every((i) => this.square(2 - i, i) === SquareState.Blue)
    ) {
      return GameState.BlueWins;
    }
    if (
      _.range(0, 3).some((y) =>
        _.range(0, 3).every((x) => this.square(x, y) === SquareState.Red),
      ) ||
      _.range(0, 3).some((x) =>
        _.range(0, 3).every((y) => this.square(x, y) === SquareState.Red),
      ) ||
      _.range(0, 3).every((i) => this.square(i, i) === SquareState.Red) ||
      _.range(0, 3).every((i) => this.square(2 - i, i) === SquareState.Red)
    ) {
      return GameState.RedWins;
    }
    if (
      _.range(0, 3).every(
        (y) =>
          _.range(0, 3).some((x) => this.square(x, y) === SquareState.Blue) &&
          _.range(0, 3).some((x) => this.square(x, y) === SquareState.Red),
      ) &&
      _.range(0, 3).every(
        (x) =>
          _.range(0, 3).some((y) => this.square(x, y) === SquareState.Blue) &&
          _.range(0, 3).some((y) => this.square(x, y) === SquareState.Red),
      ) &&
      _.range(0, 3).some((i) => this.square(i, i) === SquareState.Blue) &&
      _.range(0, 3).some((i) => this.square(i, i) === SquareState.Red) &&
      _.range(0, 3).some((i) => this.square(2 - i, i) === SquareState.Blue) &&
      _.range(0, 3).some((i) => this.square(2 - i, i) === SquareState.Red)
    ) {
      return GameState.Draw;
    }
    return GameState.Playing;
  }

  isPlaying(): boolean {
    return this.gameState() === GameState.Playing;
  }

  message() {
    let text = "",
      color = "";
    switch (this.gameState()) {
      case GameState.Playing:
        switch (this.turn()) {
          case Turn.Blue:
            text = "Your turn.";
            color = "text-sky-400";
            break;
          case Turn.Red:
            text = "Their turn.";
            color = "text-red-400";
            break;
        }
        break;
      case GameState.BlueWins:
        text = "You win.";
        color = "text-sky-400";
        break;
      case GameState.RedWins:
        text = "You lose.";
        color = "text-red-400";
        break;
      case GameState.Draw:
        text = "Draw.";
        color = "text-neutral-400";
        break;
    }
    return <h2 className={`${color}`}>{text}</h2>;
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

enum GameState {
  Playing,
  BlueWins,
  RedWins,
  Draw,
}

function Square({
  state,
  onClick,
}: {
  state: SquareState;
  onClick: MouseEventHandler;
}) {
  let bg = "";
  switch (state) {
    case SquareState.Empty:
      bg = "bg-neutral-100 hover:bg-neutral-200";
      break;
    case SquareState.Blue:
      bg = "bg-sky-200 hover:bg-sky-100";
      break;
    case SquareState.Red:
      bg = "bg-red-200 hover:bg-red-100";
      break;
  }
  return <button className={`rounded w-20 h-20 ${bg}`} onClick={onClick} />;
}

enum Operation {
  ClickSquare,
  Reset,
}

function updateBoard(
  state: BoardState,
  action:
    | { op: Operation.ClickSquare; x: number; y: number }
    | { op: Operation.Reset },
): BoardState {
  switch (action.op) {
    case Operation.ClickSquare:
      let { x, y } = action;
      if (state.isPlaying() && state.isSquareEmpty(x, y)) {
        state = state.clone();
        state.clickSquare(x, y);
      }
      return state;
    case Operation.Reset:
      return new BoardState();
  }
}

function Board() {
  const [state, dispatch] = useReducer(
    updateBoard,
    null,
    () => new BoardState(),
  );
  return (
    <div className="flex flex-row justify-center items-center gap-20">
      <div className="space-y-2">
        {_.range(0, 3).map((y) => (
          <div key={y} className="space-x-2">
            {_.range(0, 3).map((x) => (
              <Square
                key={x}
                state={state.square(x, y)}
                onClick={() => {
                  dispatch({ op: Operation.ClickSquare, x, y });
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="h-60 w-60 flex flex-col justify-evenly items-start">
        <div className="py-2 text-3xl font-bold">
          {state.message()}
        </div>
        <button
          className="px-5 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-xl font-bold"
          onClick={() => dispatch({ op: Operation.Reset })}
        >
          RESET
        </button>
      </div>
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
