"use client";

import {
  Dispatch,
  MouseEventHandler,
  MutableRefObject,
  useEffect,
  useReducer,
  useRef,
} from "react";
import Image from "next/image";
import _ from "lodash";
import { useMouse } from "@uidotdev/usehooks";

class AppState {
  squares: SquareState[][];
  paused: boolean;
  ptr_x: number;
  ptr_y: number;

  constructor() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
    this.paused = true;
    this.ptr_x = this.ptr_y = 0;
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

  clone(): AppState {
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

type Action =
  | { op: "ClickSquare"; square_x: number; square_y: number }
  | { op: "Reset" }
  | { op: "Pause" }
  | { op: "Resume" }
  | { op: "UpdatePointer"; ptr_x: number; ptr_y: number };

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
  }
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
            <Square
              key={x}
              state={state.square(x, y)}
              onClick={() => {
                dispatch({
                  op: "ClickSquare",
                  square_x: x,
                  square_y: y,
                });
              }}
            />
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
        className="px-5 py-2 rounded bg-neutral-100 hover:bg-neutral-200 text-xl font-bold"
        onClick={() => dispatch({ op: "Reset" })}
      >
        RESET
      </button>
    </div>
  );
}

function Cursor({
  mainRef,
  state,
  dispatch,
}: {
  mainRef: MutableRefObject<HTMLDivElement | null>;
  state: AppState;
  dispatch: Dispatch<Action>;
}) {
  return (
    <div
      className={`absolute w-8 h-8 z-20 ${state.paused ? "hidden" : ""}`}
      style={{ left: state.ptr_x, top: state.ptr_y }}
    >
      <Image src="/hand.png" fill={true} alt="Cursor" />
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
      >
        <div
          ref={mainRef}
          className={`absolute left-0 right-0 top-0 bottom-0 flex flex-col min-h-screen min-w-screen justify-start items-center z-0 ${
            state.paused ? "blur-lg" : ""
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
          onClick={() => {
            if (mainRef.current) {
              console.log(`${mouse.x}, ${mouse.y}`);
              dispatch({ op: "UpdatePointer", ptr_x: mouse.x, ptr_y: mouse.y });
              mainRef.current.requestPointerLock();
            }
          }}
        >
          <h2 className="text-6xl font-bold pt-[20%]">Tic Tac Toe</h2>
          <h2 className="text-4xl font-bold text-violet-400">Tap to Start</h2>
        </div>
      </main>
      <Cursor mainRef={mainRef} state={state} dispatch={dispatch} />
    </>
  );
}
