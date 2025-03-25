// First, let's create a types file for game-related types
export type GameResult = "player" | "ai" | "draw" | null;
export type GameStatus = "waiting" | "playing" | "ended";
export type ResultReason =
  | "checkmate"
  | "stalemate"
  | "time"
  | "resignation"
  | "insufficient"
  | "repetition"
  | "fifty-move"
  | null;

export interface GameState {
  fen: string;
  isPlayerTurn: boolean;
  gameStatus: GameStatus;
  result: GameResult;
  resultReason: ResultReason;
  inCheck: boolean;
  checkSquare: string | null;
}

export interface ChessMove {
  san: string;
  player: "You" | "AI";
  fen: string;
  piece: string;
  from: string;
  to: string;
  captured?: string;
  check: boolean;
  checkmate: boolean;
  reasoning?: string;
}
