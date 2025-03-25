"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import ChessBoard from "@/components/chess-board";
import GameTimer from "@/components/game-timer";
import { generateMove } from "@/lib/chess-ai";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Trophy,
  Clock,
  Brain,
  AlertTriangle,
  Shield,
  Repeat,
  Key
} from "lucide-react";
import { Chess, Move } from "chess.js";
import ApiKeyModal from "@/components/api-key-modal";
import {
  GameState,
  GameResult,
  GameStatus,
  ResultReason,
  ChessMove
} from "./types/game";

export default function ChessGame() {
  const [gameState, setGameState] = useState<GameState>({
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", // starting position
    isPlayerTurn: true,
    gameStatus: "waiting", // waiting, playing, ended
    result: null, // null, "player", "ai", "draw"
    resultReason: null, // checkmate, stalemate, time, resignation, insufficient, repetition, fifty-move
    inCheck: false,
    checkSquare: null
  });
  const [playerTime, setPlayerTime] = useState(600); // 10 minutes in seconds
  const [aiTime, setAiTime] = useState(600);
  const [isThinking, setIsThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<ChessMove[]>([]);
  const chessRef = useRef<Chess>(new Chess());
  const moveHistoryRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4");

  // Start a new game
  const startGame = () => {
    // Check if API key is provided
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    chessRef.current = new Chess();
    setGameState({
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      isPlayerTurn: true,
      gameStatus: "playing",
      result: null,
      resultReason: null,
      inCheck: false,
      checkSquare: null
    });
    setPlayerTime(600);
    setAiTime(600);
    setMoveHistory([]);
  };

  // Auto-scroll move history to bottom when new moves are added
  useEffect(() => {
    if (moveHistoryRef.current && moveHistory.length > 0) {
      moveHistoryRef.current.scrollTop = moveHistoryRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // Check for game ending conditions
  const checkGameStatus = (chess: Chess): Partial<GameState> => {
    // Check for checkmate
    if (chess.isCheckmate()) {
      return {
        gameStatus: "ended",
        result: chess.turn() === "w" ? "ai" : "player", // If it's white's turn and checkmate, black (AI) won
        resultReason: "checkmate",
        inCheck: true,
        checkSquare: findKingSquare(chess, chess.turn())
      };
    }

    // Check for stalemate
    if (chess.isStalemate()) {
      return {
        gameStatus: "ended",
        result: "draw",
        resultReason: "stalemate",
        inCheck: false,
        checkSquare: null
      };
    }

    // Check for draw by insufficient material
    if (chess.isInsufficientMaterial()) {
      return {
        gameStatus: "ended",
        result: "draw",
        resultReason: "insufficient",
        inCheck: false,
        checkSquare: null
      };
    }

    // Check for threefold repetition
    if (chess.isThreefoldRepetition()) {
      return {
        gameStatus: "ended",
        result: "draw",
        resultReason: "repetition",
        inCheck: false,
        checkSquare: null
      };
    }

    // Check for fifty move rule
    if (chess.isDraw()) {
      return {
        gameStatus: "ended",
        result: "draw",
        resultReason: "fifty-move",
        inCheck: false,
        checkSquare: null
      };
    }

    // Check for check
    if (chess.isCheck()) {
      return {
        gameStatus: "playing",
        inCheck: true,
        checkSquare: findKingSquare(chess, chess.turn())
      };
    }

    // Game continues normally
    return {
      gameStatus: "playing",
      inCheck: false,
      checkSquare: null
    };
  };

  // Find the square of the king for a given color
  const findKingSquare = (chess: Chess, color: "w" | "b"): string | null => {
    const board = chess.board();
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === "k" && piece.color === color) {
          return String.fromCharCode(97 + j) + (8 - i); // Convert to algebraic notation
        }
      }
    }
    return null;
  };

  // Handle player move
  const handleMove = async (newFen: string, move: Move) => {
    // Update chess instance
    chessRef.current.load(newFen);

    // Check game status after player's move
    const statusAfterPlayerMove = checkGameStatus(chessRef.current);

    // Update game state with player's move
    setGameState((prev) => ({
      ...prev,
      fen: newFen,
      isPlayerTurn: false,
      ...statusAfterPlayerMove
    }));

    // Add move to history with more details
    setMoveHistory((prev) => [
      ...prev,
      {
        san: move.san,
        player: "You",
        fen: newFen,
        piece: move.piece,
        from: move.from,
        to: move.to,
        captured: move.captured,
        check: move.san.includes("+"),
        checkmate: move.san.includes("#")
      }
    ]);

    // If game ended after player's move, don't make AI move
    if (statusAfterPlayerMove.gameStatus === "ended") {
      return;
    }

    // AI's turn
    setIsThinking(true);
    try {
      // Pass the move history and API key to the generateMove function
      const aiMove = await generateMove(
        newFen,
        moveHistory,
        apiKey,
        selectedModel
      );

      // Update chess instance with AI's move
      chessRef.current.load(aiMove.fen);

      // Check game status after AI's move
      const statusAfterAIMove = checkGameStatus(chessRef.current);

      // Small delay to make it feel more natural
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          fen: aiMove.fen,
          isPlayerTurn: true,
          ...statusAfterAIMove
        }));

        // Add AI move to history with more details
        setMoveHistory((prev) => [
          ...prev,
          {
            san: aiMove.move.san,
            player: "AI",
            fen: aiMove.fen,
            reasoning: aiMove.reasoning,
            piece: aiMove.move.piece,
            from: aiMove.move.from,
            to: aiMove.move.to,
            captured: aiMove.move.captured,
            check: aiMove.move.san.includes("+"),
            checkmate: aiMove.move.san.includes("#")
          }
        ]);

        setIsThinking(false);
      }, 800);
    } catch (error: any) {
      console.error("Error generating AI move:", error);
      setIsThinking(false);

      // Show API key modal if the error is related to authentication
      if (
        error.message &&
        (error.message.includes("API key") ||
          error.message.includes("authentication") ||
          error.message.includes("auth") ||
          error.message.includes("401") ||
          error.message.includes("403"))
      ) {
        setIsApiKeyModalOpen(true);
      }
    }
  };

  // Handle timer updates
  useEffect(() => {
    let playerInterval: NodeJS.Timeout;
    let aiInterval: NodeJS.Timeout;

    if (gameState.gameStatus === "playing") {
      if (gameState.isPlayerTurn) {
        playerInterval = setInterval(() => {
          setPlayerTime((prev) => {
            if (prev <= 0) {
              clearInterval(playerInterval);
              setGameState((prev) => ({
                ...prev,
                gameStatus: "ended",
                result: "ai",
                resultReason: "time"
              }));
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        aiInterval = setInterval(() => {
          setAiTime((prev) => {
            if (prev <= 0) {
              clearInterval(aiInterval);
              setGameState((prev) => ({
                ...prev,
                gameStatus: "ended",
                result: "player",
                resultReason: "time"
              }));
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      clearInterval(playerInterval);
      clearInterval(aiInterval);
    };
  }, [gameState.gameStatus, gameState.isPlayerTurn]);

  // Get result message based on result and reason
  const getResultMessage = (): string => {
    if (gameState.result === "player") {
      if (gameState.resultReason === "checkmate") return "Checkmate! You won!";
      if (gameState.resultReason === "time")
        return "AI ran out of time. You won!";
      return "You won!";
    } else if (gameState.result === "ai") {
      if (gameState.resultReason === "checkmate") return "Checkmate! AI won!";
      if (gameState.resultReason === "time")
        return "You ran out of time. AI won!";
      return "AI won!";
    } else if (gameState.result === "draw") {
      if (gameState.resultReason === "stalemate")
        return "Stalemate! The game is a draw.";
      if (gameState.resultReason === "insufficient")
        return "Insufficient material. The game is a draw.";
      if (gameState.resultReason === "repetition")
        return "Threefold repetition. The game is a draw.";
      if (gameState.resultReason === "fifty-move")
        return "Fifty-move rule. The game is a draw.";
      return "The game ended in a draw.";
    }
    return "";
  };

  // Get result icon based on result reason
  const getResultIcon = () => {
    if (gameState.resultReason === "checkmate")
      return <Trophy className="h-5 w-5 text-white" />;
    if (gameState.resultReason === "time")
      return <Clock className="h-5 w-5 text-white" />;
    if (gameState.resultReason === "stalemate")
      return <Shield className="h-5 w-5 text-white" />;
    if (
      gameState.resultReason === "insufficient" ||
      gameState.resultReason === "repetition" ||
      gameState.resultReason === "fifty-move"
    )
      return <Repeat className="h-5 w-5 text-white" />;
    return <Trophy className="h-5 w-5 text-white" />;
  };

  // Get result color based on result
  const getResultColor = (): string => {
    if (gameState.result === "player") return "bg-green-500";
    if (gameState.result === "ai") return "bg-red-500";
    return "bg-amber-500"; // draw
  };

  // Handle API key submission
  const handleApiKeySubmit = (key: string, model: string): void => {
    setApiKey(key);
    setSelectedModel(model);
    setIsApiKeyModalOpen(false);

    // Start the game if it was waiting for the API key
    if (gameState.gameStatus === "waiting") {
      startGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Chess vs. LLM
          </h1>
          <p className="text-muted-foreground mt-2">
            Challenge an AI language model to a 10-minute rapid game
          </p>
        </header>

        <Card className="border-none shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Chess Arena</CardTitle>
                <CardDescription>
                  Test your skills against an intelligent opponent
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {gameState.inCheck && gameState.gameStatus === "playing" && (
                  <Badge
                    variant="destructive"
                    className="animate-pulse flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>
                      {gameState.isPlayerTurn ? "You are" : "AI is"} in check!
                    </span>
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 px-3 py-1 text-sm font-medium"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>10-min Rapid</span>
                </Badge>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1 text-sm font-medium"
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>{selectedModel}</span>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  title="Set OpenAI API Key"
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 flex justify-center">
                <div className="relative">
                  <ChessBoard
                    fen={gameState.fen}
                    onMove={handleMove}
                    isPlayerTurn={
                      gameState.isPlayerTurn &&
                      gameState.gameStatus === "playing"
                    }
                    checkSquare={gameState.checkSquare}
                  />

                  {gameState.gameStatus === "waiting" && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
                      <Button
                        onClick={startGame}
                        size="lg"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                      >
                        Start Game
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col">
                <div className="flex flex-col h-full">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div
                      className={`p-4 rounded-lg transition-colors ${
                        !gameState.isPlayerTurn &&
                        gameState.gameStatus === "playing"
                          ? "bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-200 dark:ring-indigo-800"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="font-semibold">AI</h3>
                      </div>
                      <GameTimer
                        seconds={aiTime}
                        active={
                          !gameState.isPlayerTurn &&
                          gameState.gameStatus === "playing"
                        }
                      />
                      {isThinking && (
                        <div className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></div>
                          Thinking...
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-lg transition-colors ${
                        gameState.isPlayerTurn &&
                        gameState.gameStatus === "playing"
                          ? "bg-purple-50 dark:bg-purple-950/40 ring-1 ring-purple-200 dark:ring-purple-800"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                          <div className="h-4 w-4 text-white font-bold">Y</div>
                        </div>
                        <h3 className="font-semibold">You</h3>
                      </div>
                      <GameTimer
                        seconds={playerTime}
                        active={
                          gameState.isPlayerTurn &&
                          gameState.gameStatus === "playing"
                        }
                      />
                    </div>
                  </div>

                  {gameState.gameStatus === "ended" && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800 animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full ${getResultColor()} flex items-center justify-center`}
                        >
                          {getResultIcon()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-amber-900 dark:text-amber-200">
                            {getResultMessage()}
                          </h3>
                          <p className="text-amber-700 dark:text-amber-300 text-sm">
                            {gameState.resultReason === "checkmate"
                              ? "The king has been checkmated."
                              : gameState.resultReason === "stalemate"
                              ? "No legal moves available, but not in check."
                              : gameState.resultReason === "time"
                              ? "A player ran out of time."
                              : gameState.resultReason === "insufficient"
                              ? "Not enough pieces to force checkmate."
                              : gameState.resultReason === "repetition"
                              ? "Same position occurred three times."
                              : gameState.resultReason === "fifty-move"
                              ? "50 moves without a pawn move or capture."
                              : "The game has ended."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={startGame}
                          variant="outline"
                          className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                        >
                          Play Again
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center">
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Move History
                    </h3>
                    <div
                      ref={moveHistoryRef}
                      className="bg-muted rounded-lg p-3 h-[calc(100%-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                      style={{ maxHeight: "300px" }}
                    >
                      {moveHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Moves will appear here
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {moveHistory.map((move, index) => (
                            <div
                              key={index}
                              className="text-sm p-2 rounded hover:bg-background/80"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                      move.player === "AI"
                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                                    }`}
                                  >
                                    {Math.floor(index / 2) + 1}
                                  </span>
                                  <span className="font-medium">
                                    {move.player}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono">{move.san}</span>
                                  {move.check && !move.checkmate && (
                                    <span
                                      className="text-amber-600 dark:text-amber-400"
                                      title="Check"
                                    >
                                      +
                                    </span>
                                  )}
                                  {move.checkmate && (
                                    <span
                                      className="text-red-600 dark:text-red-400"
                                      title="Checkmate"
                                    >
                                      #
                                    </span>
                                  )}
                                </div>
                              </div>
                              {move.reasoning && (
                                <p className="mt-1 text-xs text-muted-foreground pl-6">
                                  {move.reasoning.length > 100
                                    ? move.reasoning.substring(0, 100) + "..."
                                    : move.reasoning}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {gameState.gameStatus === "playing" && (
                    <div className="mt-6">
                      <Button
                        onClick={startGame}
                        variant="outline"
                        className="w-full"
                      >
                        Restart Game
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 py-3 px-6 flex justify-between text-sm text-muted-foreground">
            <div>Powered by AI SDK</div>
            <div>© {new Date().getFullYear()} Chess vs LLM</div>
          </CardFooter>
        </Card>
      </div>

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSubmit={handleApiKeySubmit}
        apiKey={apiKey}
        selectedModel={selectedModel}
      />
    </div>
  );
}
