"use client";

import {
  Dispatch,
  MutableRefObject,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import _ from "lodash";
import { useMouse } from "@uidotdev/usehooks";
import seedrandom from "seedrandom";

import NoSsr from "./components/NoSsr";

type Pos = { x: number; y: number };

class AppState {
  squares: SquareState[][];
  paused: boolean;
  ptrX: number;
  ptrY: number;
  ptrOn: HTMLButtonElement | null;
  seed: number;

  constructor() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
    this.paused = true;
    this.ptrX = this.ptrY = 0;
    this.ptrOn = null;
    this.seed = Date.now();
  }

  clone(): AppState {
    return _.cloneDeep(this);
  }

  reset() {
    this.squares = _.range(0, 3).map((_y) =>
      _.range(0, 3).map((_x) => SquareState.Empty),
    );
    this.seed = Date.now();
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

  anySquare(state: SquareState): Pos | null {
    let redSquares = _.range(0, 3)
      .flatMap((y) => _.range(0, 3).map((x) => ({ x, y })))
      .filter(({ x, y }) => this.square(x, y) === state);
    if (redSquares.length > 0) {
      return redSquares[0];
    } else {
      return null;
    }
  }

  emptySquaresWithSingleIdentical(state: SquareState): Pos[] {
    let op = opposite(state);
    let square = this.anySquare(state) as Pos;
    let squares: Pos[] = [];
    if (_.range(0, 3).every((y) => this.square(square.x, y) !== op)) {
      squares = squares.concat(_.range(0, 3).map((y) => ({ x: square.x, y })));
    }
    if (_.range(0, 3).every((x) => this.square(x, square.y) !== op)) {
      squares = squares.concat(_.range(0, 3).map((x) => ({ x, y: square.y })));
    }
    if (
      // diagonal 1
      square.x === square.y &&
      _.range(0, 3).every((i) => this.square(i, i) !== op)
    ) {
      squares = squares.concat(_.range(0, 3).map((i) => ({ x: i, y: i })));
    } else if (
      // diagonal 2
      square.x + square.y === 2 &&
      _.range(0, 3).every((i) => this.square(i, 2 - i) !== op)
    ) {
      squares = squares.concat(_.range(0, 3).map((i) => ({ x: i, y: 2 - i })));
    }
    return [...new Set(squares)].filter(({ x, y }) => this.isSquareEmpty(x, y));
  }

  emptySquareWithDoubleIdentical(state: SquareState): Pos {
    let op = opposite(state);
    let square = this.anySquare(state) as Pos;
    let squares: Pos[] = [];
    if (
      _.range(0, 3).every((y) => this.square(square.x, y) !== op) &&
      _.range(0, 3).filter((y) => this.square(square.x, y) === state).length ===
        2
    ) {
      squares = squares.concat(_.range(0, 3).map((y) => ({ x: square.x, y })));
    }
    if (
      _.range(0, 3).every((x) => this.square(x, square.y) !== op) &&
      _.range(0, 3).filter((x) => this.square(x, square.y) === state).length ===
        2
    ) {
      squares = squares.concat(_.range(0, 3).map((x) => ({ x, y: square.y })));
    }
    if (
      // diagonal 1
      square.x === square.y &&
      _.range(0, 3).every((i) => this.square(i, i) !== op) &&
      _.range(0, 3).filter((i) => this.square(i, i) === state).length === 2
    ) {
      squares = squares.concat(_.range(0, 3).map((i) => ({ x: i, y: i })));
    } else if (
      // diagonal 2
      square.x + square.y === 2 &&
      _.range(0, 3).every((i) => this.square(i, 2 - i) !== op) &&
      _.range(0, 3).filter((i) => this.square(i, 2 - i) === state).length === 2
    ) {
      squares = squares.concat(_.range(0, 3).map((i) => ({ x: i, y: 2 - i })));
    }
    return squares.filter(({ x, y }) => this.isSquareEmpty(x, y))[0];
  }

  emptySquaresWithoutAnyDoubleIdentical(): Pos[] {
    const emptySquareBlue = this.emptySquareWithDoubleIdentical(
      SquareState.Blue,
    );
    const emptySquareRed = this.emptySquareWithDoubleIdentical(SquareState.Red);
    return _.range(0, 3)
      .flatMap((y) => _.range(0, 3).map((x) => ({ x, y })))
      .filter(({ x, y }) => this.isSquareEmpty(x, y))
      .filter(
        (square) =>
          !_.isEqual(square, emptySquareBlue) &&
          !_.isEqual(square, emptySquareRed),
      );
  }

  randomEmptySquare(): Pos | null {
    if (this.emptySquareCount() > 0) {
      return this.deterministicSample(
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
      this.ptrOn !== null &&
      this.ptrOn.getAttribute("data-id") === id
    );
  }

  isOnSquare(x: number, y: number): boolean {
    return (
      this.isOn("square") &&
      this.ptrOn?.getAttribute("data-x") === x.toString() &&
      this.ptrOn?.getAttribute("data-y") === y.toString()
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

  // react requires the dispatch function to be pure
  deterministicSample<T>(collection: T[]): T | undefined {
    seedrandom(JSON.stringify([this.seed, this.squares, collection]), {
      global: true,
    });
    return _.runInContext().sample(collection);
  }

  deterministicRandom(min: number, max: number): number {
    seedrandom(JSON.stringify([this.seed, this.squares, min, max]), {
      global: true,
    });
    return _.runInContext().random(min, max);
  }
}

enum SquareState {
  Empty,
  Blue,
  Red,
}

function opposite(state: SquareState): SquareState {
  switch (state) {
    case SquareState.Empty:
      return SquareState.Empty;
    case SquareState.Blue:
      return SquareState.Red;
    case SquareState.Red:
      return SquareState.Blue;
  }
}

enum GameState {
  BlueTurn,
  RedTurn,
  BlueWins,
  RedWins,
  Draw,
}

type Action =
  | {
      op: "YouClickSquare";
      squareX: number;
      squareY: number;
      mainRef: MutableRefObject<HTMLDivElement>;
    }
  | { op: "TheyClickSquare" }
  | { op: "Reset" }
  | { op: "Pause" }
  | { op: "Resume" }
  | { op: "SetPointer"; ptrX: number; ptrY: number }
  | { op: "MovePointer"; dx: number; dy: number };

function updateAppState(state: AppState, action: Action): AppState {
  state = state.clone();
  switch (action.op) {
    case "YouClickSquare":
      if (state.gameState() != GameState.BlueTurn) {
        return state;
      }
      switch (state.redSquareCount()) {
        case 0:
        case 1:
          state.setSquare(action.squareX, action.squareY, SquareState.Blue);
          break;
        case 2:
          if (
            _.isEqual(state.emptySquareWithDoubleIdentical(SquareState.Blue), {
              x: action.squareX,
              y: action.squareY,
            }) ||
            _.isEqual(state.emptySquareWithDoubleIdentical(SquareState.Red), {
              x: action.squareX,
              y: action.squareY,
            })
          ) {
            const square = state.deterministicSample(
              state.emptySquaresWithoutAnyDoubleIdentical(),
            ) as Pos;
            const rect = Array.from(
              action.mainRef.current.children[0].children[0].children,
            )
              .flatMap((buttons) =>
                Array.from(buttons.children).filter(
                  (button) =>
                    (button.getAttribute("data-x") as string) ===
                      square.x.toString() &&
                    (button.getAttribute("data-y") as string) ===
                      square.y.toString(),
                ),
              )[0]
              .getBoundingClientRect();
            state.ptrX = state.deterministicRandom(
              (rect.left * 2 + rect.right) / 3.0,
              (rect.left + rect.right * 2) / 3.0,
            );
            state.ptrY = state.deterministicRandom(
              (rect.top * 2 + rect.bottom) / 3.0,
              (rect.top + rect.bottom * 2) / 3.0,
            );
            state.setSquare(square.x, square.y, SquareState.Blue);
          } else {
            state.setSquare(action.squareX, action.squareY, SquareState.Blue);
          }
          break;
      }
      return state;
    case "TheyClickSquare":
      if (state.gameState() != GameState.RedTurn) {
        return state;
      }
      switch (state.redSquareCount()) {
        case 0: {
          if (state.isSquareEmpty(1, 1)) {
            state.setSquare(1, 1, SquareState.Red);
          } else {
            const square = state.deterministicSample(
              [
                { x: 0, y: 0 },
                { x: 0, y: 2 },
                { x: 2, y: 0 },
                { x: 2, y: 2 },
              ].filter(({ x, y }) => state.isSquareEmpty(x, y)),
            ) as Pos;
            state.setSquare(square.x, square.y, SquareState.Red);
          }
          break;
        }
        case 1: {
          let square = state.deterministicSample(
            state.emptySquaresWithSingleIdentical(SquareState.Red),
          ) as Pos;
          state.setSquare(square.x, square.y, SquareState.Red);
          break;
        }
        case 2: {
          let square = state.emptySquareWithDoubleIdentical(SquareState.Red);
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
      state.ptrX = action.ptrX;
      state.ptrY = action.ptrY;
      return state;
    case "MovePointer":
      state.ptrX += action.dx;
      state.ptrY += action.dy;
      const ptr_size =
        2 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (
        state.ptrX > window.innerWidth + ptr_size ||
        state.ptrX < -ptr_size ||
        state.ptrY > window.innerHeight + ptr_size ||
        state.ptrY < -ptr_size
      ) {
        document.exitPointerLock();
        state.ptrOn = null;
      } else {
        const elements = document
          .elementsFromPoint(state.ptrX, state.ptrY)
          .filter((element) => element.tagName === "BUTTON");
        if (elements.length > 0) {
          state.ptrOn = elements[0] as HTMLButtonElement;
        } else {
          state.ptrOn = null;
        }
      }
      return state;
  }
}

function Square({ state, x, y }: { state: AppState; x: number; y: number }) {
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
    />
  );
}

function Board({ state }: { state: AppState }) {
  return (
    <div className="space-y-2">
      {_.range(0, 3).map((y) => (
        <div key={y} className="space-x-2">
          {_.range(0, 3).map((x) => (
            <Square key={x} state={state} x={x} y={y} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Controls({ state }: { state: AppState }) {
  return (
    <div className="h-60 w-60 flex flex-col justify-evenly items-start">
      <div className="py-2 text-3xl font-bold">{state.message()}</div>
      <button
        data-id="reset"
        className={`px-5 py-2 rounded ${
          state.isOn("reset") ? "bg-neutral-200" : "bg-neutral-100"
        } text-xl font-bold`}
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
      let x_str = state.ptrOn?.getAttribute("data-x") as string;
      let y_str = state.ptrOn?.getAttribute("data-y") as string;
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
      style={{ left: state.ptrX, top: state.ptrY }}
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
              dispatch({ op: "SetPointer", ptrX: mouse.x, ptrY: mouse.y });
              mainRef.current.requestPointerLock();
            }
          } else if (state.isOn("square")) {
            let x_str = state.ptrOn?.getAttribute("data-x") as string;
            let y_str = state.ptrOn?.getAttribute("data-y") as string;
            let [x, y] = [parseInt(x_str), parseInt(y_str)];
            if (
              state.gameState() === GameState.BlueTurn &&
              state.isSquareEmpty(x, y)
            ) {
              dispatch({
                op: "YouClickSquare",
                squareX: x,
                squareY: y,
                mainRef: mainRef as MutableRefObject<HTMLDivElement>,
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
          } else if (state.isOn("reset")) {
            if (state.emptySquareCount() < 9) {
              dispatch({ op: "Reset" });
            }
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
            <Board state={state} />
            <Controls state={state} />
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
