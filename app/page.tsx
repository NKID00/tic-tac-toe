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
import { getSelectorsByUserAgent } from "react-device-detect";
import {
  SpringRef,
  SpringValue,
  animated,
  useSpring,
  useSprings,
} from "@react-spring/web";

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

  setSquare(
    x: number,
    y: number,
    square: SquareState,
    api: SpringRef<{ size: number }>,
  ): void {
    api.start((i: number) =>
      i == y * 3 + x
        ? {
            to: [
              {
                size: 0.95,
                config: {
                  tension: 800,
                  clamp: true,
                },
              },
              {
                size: 1.05,
                config: {
                  tension: 800,
                  friction: 5,
                  clamp: false,
                },
              },
            ],
          }
        : null,
    );
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
      api: SpringRef<{ size: number }>;
    }
  | { op: "TheyClickSquare"; api: SpringRef<{ size: number }> }
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
          state.setSquare(
            action.squareX,
            action.squareY,
            SquareState.Blue,
            action.api,
          );
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
                    (button.children[0].getAttribute("data-x") as string) ===
                      square.x.toString() &&
                    (button.children[0].getAttribute("data-y") as string) ===
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
            state.setSquare(square.x, square.y, SquareState.Blue, action.api);
          } else {
            state.setSquare(
              action.squareX,
              action.squareY,
              SquareState.Blue,
              action.api,
            );
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
            state.setSquare(1, 1, SquareState.Red, action.api);
          } else {
            const square = state.deterministicSample(
              [
                { x: 0, y: 0 },
                { x: 0, y: 2 },
                { x: 2, y: 0 },
                { x: 2, y: 2 },
              ].filter(({ x, y }) => state.isSquareEmpty(x, y)),
            ) as Pos;
            state.setSquare(square.x, square.y, SquareState.Red, action.api);
          }
          break;
        }
        case 1: {
          let square = state.deterministicSample(
            state.emptySquaresWithSingleIdentical(SquareState.Red),
          ) as Pos;
          state.setSquare(square.x, square.y, SquareState.Red, action.api);
          break;
        }
        case 2: {
          let square = state.emptySquareWithDoubleIdentical(SquareState.Red);
          state.setSquare(square.x, square.y, SquareState.Red, action.api);
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

function Square({
  state,
  size,
  x,
  y,
}: {
  state: AppState;
  size: SpringValue<number>;
  x: number;
  y: number;
}) {
  let hover = state.isOnSquare(x, y);
  let color = "";
  switch (state.square(x, y)) {
    case SquareState.Empty:
      color = hover ? "rgb(229 229 229)" : "rgb(245 245 245)";
      break;
    case SquareState.Blue:
      color = hover ? "rgb(224 242 254)" : "rgb(186 230 253)";
      break;
    case SquareState.Red:
      color = hover ? "rgb(254 226 226)" : "rgb(254 202 202)";
      break;
  }
  const { bg } = useSpring({
    bg: color,
    config: {
      tension: 700,
      friction: 5,
      clamp: true,
    },
  });
  return (
    <animated.button
      data-x={x}
      data-y={y}
      data-id="square"
      className="rounded"
      style={{
        backgroundColor: bg,
        width: size.to((x) => `${x * 5}rem`),
        height: size.to((x) => `${x * 5}rem`),
      }}
    />
  );
}

function Board({
  state,
  sizes,
}: {
  state: AppState;
  sizes: SpringValue<number>[];
}) {
  return (
    <div className="flex flex-row justify-center items-center">
      {_.range(0, 3).map((y) => (
        <div key={y} className="flex flex-col justify-center items-center">
          {_.range(0, 3).map((x) => (
            <div
              key={x}
              className="flex justify-center items-center w-[6rem] h-[6rem]"
            >
              <Square state={state} size={sizes[y * 3 + x]} x={x} y={y} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Controls({
  state,
  size,
  imgStyle,
}: {
  state: AppState;
  size: SpringValue<number>;
  imgStyle: { right: SpringValue<string> };
}) {
  const buttonStyle = useSpring({
    backgroundColor: state.isOn("reset")
      ? "rgb(229 229 229)"
      : "rgb(245 245 245)",
    config: {
      tension: 700,
      friction: 5,
      clamp: true,
    },
  });
  return (
    <div className="h-60 w-60 flex flex-col justify-evenly items-start">
      <div className="py-2 text-3xl font-bold">{state.message()}</div>
      <animated.button
        data-id="reset"
        className="px-5 py-2 rounded text-xl font-bold"
        style={{
          transform: size.to((x) => `scale(${x})`),
          ...buttonStyle,
        }}
      >
        RESET
      </animated.button>
      <animated.img
        className="absolute w-[30rem]"
        src="RESET.webp"
        alt="RESET"
        style={imgStyle}
      />
    </div>
  );
}

function Cursor({ state }: { state: AppState }) {
  let shape = "ptr.png";
  if (state.isOn("square")) {
    if (state.gameState() === GameState.BlueTurn) {
      let x_str = state.ptrOn?.getAttribute("data-x") as string;
      let y_str = state.ptrOn?.getAttribute("data-y") as string;
      let [x, y] = [parseInt(x_str), parseInt(y_str)];
      if (state.square(x, y) === SquareState.Empty) {
        shape = "hand.png";
      } else {
        shape = "x.png";
      }
    } else {
      shape = "x.png";
    }
  } else if (state.isOn("reset")) {
    if (state.emptySquareCount() < 9) {
      shape = "hand.png";
    } else {
      shape = "x.png";
    }
  }
  return (
    <div
      className={`absolute w-10 h-10 z-20 ${state.paused ? "hidden" : ""}`}
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
  const [mouse, _ref] = useMouse();
  const { blur, opacity } = useSpring({
    blur: state.paused ? "24px" : "0px",
    opacity: state.paused ? 1 : 0,
    config: {
      tension: 500,
      clamp: true,
    },
  });
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    if (getSelectorsByUserAgent(window.navigator.userAgent).isDesktop) {
      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement) {
          dispatch({ op: "Resume" });
        } else {
          dispatch({ op: "Pause" });
        }
      });
    } else {
      setIsDesktop(false);
    }
  }, []);
  const [squareSprings, squareApi] = useSprings(9, () => ({
    size: 1,
  }));
  const [{ size: resetSize }, resetApi] = useSpring(
    {
      size: 1,
      config: {
        tension: 800,
        clamp: true,
      },
    },
    [],
  );
  const [imgStyle, imgApi] = useSpring(
    {
      right: "-30rem",
    },
    [],
  );
  return (
    <>
      <main
        className="min-h-screen min-w-screen text-neutral-600"
        onPointerLeave={() => document.exitPointerLock()}
        onPointerMove={(e) => {
          if (!state.paused) {
            dispatch({
              op: "MovePointer",
              dx: Math.abs(e.movementX) > 1 ? e.movementX : 0,
              dy: Math.abs(e.movementY) > 1 ? e.movementY : 0,
            });
          }
        }}
        onClick={() => {
          if (!isDesktop) {
            return;
          }
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
                api: squareApi,
              });
              setTimeout(
                () => {
                  dispatch({
                    op: "TheyClickSquare",
                    api: squareApi,
                  });
                },
                _.random(300, 500),
              );
            }
          } else if (state.isOn("reset")) {
            if (state.emptySquareCount() < 9) {
              squareApi.start({
                size: 1,
                config: {
                  tension: 800,
                  friction: 5,
                  clamp: false,
                },
              });
              resetApi.start({ to: [{ size: 0.95 }, { size: 1 }] });
              imgApi.start({
                to: [
                  {
                    right: "2rem",
                    config: {
                      tension: 170,
                      friction: 15,
                      clamp: false,
                    },
                  },
                  {
                    right: "2.001rem",
                    config: {
                      duration: 500,
                    },
                  },
                  {
                    right: "-30rem",
                    config: {
                      tension: 100,
                      friction: 5,
                      clamp: true,
                    },
                  },
                ],
              });
              dispatch({ op: "Reset" });
            }
          }
        }}
      >
        <animated.div
          ref={mainRef}
          className="absolute left-0 right-0 top-0 bottom-0 flex flex-col min-h-screen min-w-screen justify-start items-center z-0"
          style={{ filter: blur.to((x) => `blur(${x})`) }}
        >
          <div className="flex flex-row justify-center items-center gap-20 pt-[12rem]">
            <Board
              state={state}
              sizes={squareSprings.map(({ size }) => size)}
            />
            <Controls state={state} size={resetSize} imgStyle={imgStyle} />
          </div>
        </animated.div>
        {isDesktop ? (
          <animated.div
            className="absolute left-0 right-0 top-0 bottom-0 flex flex-col min-h-screen min-w-screen justify-start items-center gap-20 z-10"
            style={{
              opacity: opacity,
              display: opacity.to((x) => (x < 0.01 ? "none" : "")),
            }}
          >
            <h2 className="text-6xl font-bold pt-[12rem]">Tic Tac Toe</h2>
            <h2 className="text-4xl font-bold text-violet-400">Tap to Start</h2>
            <div className="text-sm text-justify text-neutral-400 w-[45rem]">
              <p>Copyright (C) 2023 NKID00</p>
              <br />
              <p>
                This program is free software: you can redistribute it and/or
                modify it under the terms of the GNU Affero General Public
                License as published by the Free Software Foundation, either
                version 3 of the License, or (at your option) any later version.
                This program is distributed in the hope that it will be useful,
                but WITHOUT ANY WARRANTY; without even the implied warranty of
                MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
                Affero General Public License for more details. You should have
                received a copy of the GNU Affero General Public License along
                with this program. If not, see{" "}
                {"<https://www.gnu.org/licenses/>"}.
              </p>
              <br />
              <p>Source: https://github.com/NKID00/tic-tac-toe</p>
            </div>
          </animated.div>
        ) : (
          <div className="absolute left-0 right-0 top-0 bottom-0 min-h-screen min-w-screen flex flex-col justify-center items-center">
            <h2 className="text-[6vmin] font-bold text-neutral-600">
              Desktop Browser Required
            </h2>
          </div>
        )}
      </main>
      <Cursor state={state} />
    </>
  );
}
