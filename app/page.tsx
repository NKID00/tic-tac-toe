"use client";

import { Dispatch, useEffect, useReducer, useRef } from "react";
import _ from "lodash";
import { useMouse } from "@uidotdev/usehooks";

import NoSsr from "./components/NoSsr";

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

type Action =
  | { op: "ClickSquare"; square_x: number; square_y: number }
  | { op: "Reset" }
  | { op: "Pause" }
  | { op: "Resume" }
  | { op: "UpdatePointer"; ptr_x: number; ptr_y: number }
  | { op: "MovePointer"; dx: number; dy: number };

function updateAppState(state: AppState, action: Action): AppState {
  state = state.clone();
  switch (action.op) {
    case "ClickSquare":
      const { square_x, square_y } = action;
      if (state.isPlaying() && state.isSquareEmpty(square_x, square_y)) {
        state.clickSquare(square_x, square_y);
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
    case "UpdatePointer":
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
        dispatch({
          op: "ClickSquare",
          square_x: x,
          square_y: y,
        });
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
    if (state.isPlaying()) {
      let x_str = state.ptr_on?.getAttribute("data-x") as string;
      let y_str = state.ptr_on?.getAttribute("data-y") as string;
      let [x, y] = [parseInt(x_str), parseInt(y_str)];
      if (state.square(x, y) == SquareState.Empty) {
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
              dispatch({ op: "UpdatePointer", ptr_x: mouse.x, ptr_y: mouse.y });
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
