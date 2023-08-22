"use client";

import { Dispatch, useEffect, useReducer, useRef } from "react";
import _ from "lodash";
import { useMouse } from "@uidotdev/usehooks";

import NoSsr from "./components/NoSsr";

type Pos = { x: number; y: number };

class AppState {
  squares: SquareState[][];
  paused: boolean;
  ptr_x: number;
  ptr_y: number;
  ptr_on: HTMLButtonElement | null;

  constructor() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
    this.paused = true;
    this.ptr_x = this.ptr_y = 0;
    this.ptr_on = null;
  }

  clone(): AppState {
    return _.cloneDeep(this);
  }

  reset() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
  }

  square(x: number, y: number): SquareState {
    return this.squares[y][x];
  }

  setSquare(x: number, y: number, square: SquareState): void {
    this.squares[y][x] = square;
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

  blueSquareCount(): number {
    return _.sum(
      this.squares.map((states) =>
        _.sum(states.map((state) => (state === SquareState.Blue ? 1 : 0))),
      ),
    );
  }

  redSquareCount(): number {
    return _.sum(
      this.squares.map((states) =>
        _.sum(states.map((state) => (state === SquareState.Red ? 1 : 0))),
      ),
    );
  }

  redSquare(): Pos | null {
    let redSquares = _.range(0, 3)
      .flatMap((y) => _.range(0, 3).map((x) => ({ x, y })))
      .filter(({ x, y }) => this.square(x, y) === SquareState.Red);
    if (redSquares.length > 0) {
      return redSquares[0];
    } else {
      return null;
    }
  }

  randomEmptySquare(): Pos | null {
    if (this.emptySquareCount() > 0) {
      return _.sample(
        _.range(0, 3)
          .flatMap((y) => _.range(0, 3).map((x) => ({ x, y })))
          .filter(({ x, y }) => this.isSquareEmpty(x, y)),
      ) as Pos;
    } else {
      return null;
    }
  }

  gameState(): GameState {
    if (
      _.range(0, 3).some((y) =>
        _.range(0, 3).every((x) => this.square(x, y) === SquareState.Blue),
      ) ||
      _.range(0, 3).some((x) =>
        _.range(0, 3).every((y) => this.square(x, y) === SquareState.Blue),
      ) ||
      // diagonal 1
      _.range(0, 3).every((i) => this.square(i, i) === SquareState.Blue) ||
      // diagonal 2
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
      // diagonal 1
      _.range(0, 3).every((i) => this.square(i, i) === SquareState.Red) ||
      // diagonal 2
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
      // diagonal 1
      _.range(0, 3).some((i) => this.square(i, i) === SquareState.Blue) &&
      _.range(0, 3).some((i) => this.square(i, i) === SquareState.Red) &&
      // diagonal 2
      _.range(0, 3).some((i) => this.square(2 - i, i) === SquareState.Blue) &&
      _.range(0, 3).some((i) => this.square(2 - i, i) === SquareState.Red)
    ) {
      return GameState.Draw;
    }
    return this.emptySquareCount() % 2 === 0
      ? GameState.RedTurn
      : GameState.BlueTurn;
  }

  isPlaying(): boolean {
    return [GameState.BlueTurn, GameState.RedTurn].includes(this.gameState());
  }

  isOn(id: string): boolean {
    return (
      !this.paused &&
      this.ptr_on !== null &&
      this.ptr_on.getAttribute("data-id") === id
    );
  }

  isOnSquare(x: number, y: number): boolean {
    return (
      this.isOn("square") &&
      this.ptr_on?.getAttribute("data-x") === x.toString() &&
      this.ptr_on?.getAttribute("data-y") === y.toString()
    );
  }

  message() {
    let text = "";
    let color = "";
    switch (this.gameState()) {
      case GameState.BlueTurn:
        text = "Your turn.";
        color = "text-sky-400";
        break;
      case GameState.RedTurn:
        text = "Their turn.";
        color = "text-red-400";
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
}

enum SquareState {
  Empty,
  Blue,
  Red,
}

enum GameState {
  BlueTurn,
  RedTurn,
  BlueWins,
  RedWins,
  Draw,
}

type Action =
  | { op: "YouClickSquare"; square_x: number; square_y: number }
  | { op: "TheyClickSquare" }
  | { op: "Reset" }
  | { op: "Pause" }
  | { op: "Resume" }
  | { op: "SetPointer"; ptr_x: number; ptr_y: number }
  | { op: "MovePointer"; dx: number; dy: number };

function updateAppState(state: AppState, action: Action): AppState {
  state = state.clone();
  switch (action.op) {
    case "YouClickSquare":
      state.setSquare(action.square_x, action.square_y, SquareState.Blue);
      return state;
    case "TheyClickSquare":
      if (state.gameState() != GameState.RedTurn) {
        return state;
      }
      switch (state.redSquareCount()) {
        case 0: {
          const square = _.sample(
            [
              { x: 0, y: 0 },
              { x: 0, y: 2 },
              { x: 2, y: 0 },
              { x: 2, y: 2 },
              { x: 1, y: 1 },
            ].filter(({ x, y }) => state.isSquareEmpty(x, y)),
          ) as Pos;
          state.setSquare(square.x, square.y, SquareState.Red);
          break;
        }
        case 1: {
          let square = state.redSquare() as Pos;
          let squares: Pos[] = [];
          if (
            _.range(0, 3).every(
              (y) => state.square(square.x, y) !== SquareState.Blue,
            )
          ) {
            squares = squares.concat(
              _.range(0, 3).map((y) => ({ x: square.x, y })),
            );
          }
          if (
            _.range(0, 3).every(
              (x) => state.square(x, square.y) !== SquareState.Blue,
            )
          ) {
            squares = squares.concat(
              _.range(0, 3).map((x) => ({ x, y: square.y })),
            );
          }
          if (
            // diagonal 1
            square.x === square.y &&
            _.range(0, 3).every((i) => state.square(i, i) !== SquareState.Blue)
          ) {
            squares = squares.concat(
              _.range(0, 3).map((i) => ({ x: i, y: i })),
            );
          } else if (
            // diagonal 2
            square.x + square.y === 2 &&
            _.range(0, 3).every(
              (i) => state.square(i, 2 - i) !== SquareState.Blue,
            )
          ) {
            squares = squares.concat(
              _.range(0, 3).map((i) => ({ x: i, y: 2 - i })),
            );
          }
          square = _.sample(
            [...new Set(squares)].filter(({ x, y }) =>
              state.isSquareEmpty(x, y),
            ),
          ) as Pos;
          state.setSquare(square.x, square.y, SquareState.Red);
          break;
        }
        case 2: {
          let square = state.redSquare() as Pos;
          let squares: Pos[] = [];
          if (
            _.range(0, 3).every(
              (y) => state.square(square.x, y) !== SquareState.Blue,
            ) &&
            _.range(0, 3).filter(
              (y) => state.square(square.x, y) === SquareState.Red,
            ).length === 2
          ) {
            squares = squares.concat(
              _.range(0, 3).map((y) => ({ x: square.x, y })),
            );
          }
          if (
            _.range(0, 3).every(
              (x) => state.square(x, square.y) !== SquareState.Blue,
            ) &&
            _.range(0, 3).filter(
              (x) => state.square(x, square.y) === SquareState.Red,
            ).length === 2
          ) {
            squares = squares.concat(
              _.range(0, 3).map((x) => ({ x, y: square.y })),
            );
          }
          if (
            // diagonal 1
            square.x === square.y &&
            _.range(0, 3).every(
              (i) => state.square(i, i) !== SquareState.Blue,
            ) &&
            _.range(0, 3).filter((i) => state.square(i, i) === SquareState.Red)
              .length === 2
          ) {
            squares = squares.concat(
              _.range(0, 3).map((i) => ({ x: i, y: i })),
            );
          } else if (
            // diagonal 2
            square.x + square.y === 2 &&
            _.range(0, 3).every(
              (i) => state.square(i, 2 - i) !== SquareState.Blue,
            ) &&
            _.range(0, 3).filter(
              (i) => state.square(i, 2 - i) === SquareState.Red,
            ).length === 2
          ) {
            squares = squares.concat(
              _.range(0, 3).map((i) => ({ x: i, y: 2 - i })),
            );
          }
          square = squares.filter(({ x, y }) => state.isSquareEmpty(x, y))[0];
          state.setSquare(square.x, square.y, SquareState.Red);
          break;
        }
      }
      return state;
    case "Reset":
      state.reset();
      return state;
    case "Pause":
      state.paused = true;
      return state;
    case "Resume":
      state.paused = false;
      return state;
    case "SetPointer":
      state.ptr_x = action.ptr_x;
      state.ptr_y = action.ptr_y;
      return state;
    case "MovePointer":
      state.ptr_x += action.dx;
      state.ptr_y += action.dy;
      const ptr_size =
        2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (
        state.ptr_x > window.innerWidth + ptr_size ||
        state.ptr_x < -ptr_size ||
        state.ptr_y > window.innerHeight + ptr_size ||
        state.ptr_y < -ptr_size
      ) {
        document.exitPointerLock();
        state.ptr_on = null;
      } else {
        const elements = document
          .elementsFromPoint(state.ptr_x, state.ptr_y)
          .filter((element) => element.tagName === "BUTTON");
        if (elements.length > 0) {
          state.ptr_on = elements[0] as HTMLButtonElement;
        } else {
          state.ptr_on = null;
        }
      }
      return state;
  }
}

function Square({
  state,
  dispatch,
  x,
  y,
}: {
  state: AppState;
  dispatch: Dispatch<Action>;
  x: number;
  y: number;
}) {
  let hover = state.isOnSquare(x, y);
  let bg = "";
  switch (state.square(x, y)) {
    case SquareState.Empty:
      bg = hover ? "bg-neutral-200" : "bg-neutral-100";
      break;
    case SquareState.Blue:
      bg = hover ? "bg-sky-100" : "bg-sky-200";
      break;
    case SquareState.Red:
      bg = hover ? "bg-red-100" : "bg-red-200";
      break;
  }
  return (
    <button
      data-x={x}
      data-y={y}
      data-id="square"
      className={`rounded w-20 h-20 ${bg}`}
      onClick={() => {
        if (
          state.gameState() === GameState.BlueTurn &&
          state.isSquareEmpty(x, y)
        ) {
          dispatch({
            op: "YouClickSquare",
            square_x: x,
            square_y: y,
          });
          setTimeout(
            () => {
              dispatch({
                op: "TheyClickSquare",
              });
            },
            _.random(200, 300),
          );
        }
      }}
    />
  );
}

function Board({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="space-y-2">
      {_.range(0, 3).map((y) => (
        <div key={y} className="space-x-2">
          {_.range(0, 3).map((x) => (
            <Square key={x} state={state} dispatch={dispatch} x={x} y={y} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Controls({
  state,
  dispatch,
}: {
  state: AppState;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div className="h-60 w-60 flex flex-col justify-evenly items-start">
      <div className="py-2 text-3xl font-bold">{state.message()}</div>
      <button
        data-id="reset"
        className={`px-5 py-2 rounded ${
          state.isOn("reset") ? "bg-neutral-200" : "bg-neutral-100"
        } text-xl font-bold`}
        onClick={() => {
          if (state.emptySquareCount() < 9) {
            dispatch({ op: "Reset" });
          }
        }}
      >
        RESET
      </button>
    </div>
  );
}

function Cursor({ state }: { state: AppState }) {
  let shape = "/ptr.png";
  if (state.isOn("square")) {
    if (state.gameState() === GameState.BlueTurn) {
      let x_str = state.ptr_on?.getAttribute("data-x") as string;
      let y_str = state.ptr_on?.getAttribute("data-y") as string;
      let [x, y] = [parseInt(x_str), parseInt(y_str)];
      if (state.square(x, y) === SquareState.Empty) {
        shape = "/hand.png";
      } else {
        shape = "/x.png";
      }
    } else {
      shape = "/x.png";
    }
  } else if (state.isOn("reset")) {
    if (state.emptySquareCount() < 9) {
      shape = "/hand.png";
    } else {
      shape = "/x.png";
    }
  }
  return (
    <div
      className={`absolute w-8 h-8 z-20 ${state.paused ? "hidden" : ""}`}
      style={{ left: state.ptr_x, top: state.ptr_y }}
    >
      <link rel="preload" as="image" href="hand.png" />
      <link rel="preload" as="image" href="ptr.png" />
      <link rel="preload" as="image" href="x.png" />
      <img className="w-full h-full" src={shape} alt="Cursor" />
    </div>
  );
}

export default function Page() {
  const [state, dispatch] = useReducer(
    updateAppState,
    null,
    () => new AppState(),
  );
  const mainRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement) {
        dispatch({ op: "Resume" });
      } else {
        dispatch({ op: "Pause" });
      }
    });
  }, []);
  const [mouse, _ref] = useMouse();
  return (
    <>
      <main
        className="min-h-screen min-w-screen text-neutral-600"
        onPointerLeave={() => document.exitPointerLock()}
        onPointerMove={(e) => {
          dispatch({
            op: "MovePointer",
            dx: Math.abs(e.movementX) > 1 ? e.movementX : 0,
            dy: Math.abs(e.movementY) > 1 ? e.movementY : 0,
          });
        }}
        onClick={() => {
          if (state.paused) {
            if (mainRef.current) {
              dispatch({ op: "SetPointer", ptr_x: mouse.x, ptr_y: mouse.y });
              mainRef.current.requestPointerLock();
            }
          } else if (state.ptr_on) {
            state.ptr_on.click();
          }
        }}
      >
        <div
          ref={mainRef}
          className={`absolute left-0 right-0 top-0 bottom-0 flex flex-col min-h-screen min-w-screen justify-start items-center z-0 ${
            state.paused ? "blur-xl" : ""
          }`}
        >
          <div className="flex flex-row justify-center items-center gap-20 pt-[20%]">
            <Board state={state} dispatch={dispatch} />
            <Controls state={state} dispatch={dispatch} />
          </div>
        </div>
        <div
          className={`absolute left-0 right-0 top-0 bottom-0 flex flex-col min-h-screen min-w-screen justify-start items-center gap-20 z-10 ${
            state.paused ? "" : "hidden"
          }`}
        >
          <h2 className="text-6xl font-bold pt-[20%]">Tic Tac Toe</h2>
          <h2 className="text-4xl font-bold text-violet-400">Tap to Start</h2>
        </div>
      </main>
      <Cursor state={state} />
    </>
  );
}
