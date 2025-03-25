"use client";

import React, { useState, useEffect, JSX } from "react";
import { Chess, Move, Square } from "chess.js";
import { Chessboard } from "react-chessboard";

// Define prop types
interface ChessBoardProps {
  fen: string;
  onMove: (fen: string, move: Move) => void;
  isPlayerTurn: boolean;
  checkSquare?: string | null;
}

// Define type for highlighted squares
interface SquareStyles {
  [square: string]: React.CSSProperties;
}

export default function ChessBoard({
  fen,
  onMove,
  isPlayerTurn,
  checkSquare
}: ChessBoardProps) {
  const [game, setGame] = useState<Chess>(new Chess(fen));
  const [boardWidth, setBoardWidth] = useState<number>(480);
  const [highlightedSquares, setHighlightedSquares] = useState<SquareStyles>(
    {}
  );

  // Update the game when fen changes (from parent)
  useEffect(() => {
    const newGame = new Chess(fen);
    setGame(newGame);

    // Update highlighted squares
    const newHighlights: Record<string, React.CSSProperties> = {};

    // Highlight the last move
    const history = newGame.history({ verbose: true });
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      newHighlights[lastMove.from] = {
        backgroundColor: "rgba(255, 217, 102, 0.5)"
      };
      newHighlights[lastMove.to] = {
        backgroundColor: "rgba(255, 217, 102, 0.5)"
      };
    }

    // Highlight check square if exists
    if (checkSquare) {
      newHighlights[checkSquare] = {
        backgroundColor: "rgba(255, 87, 87, 0.5)",
        boxShadow: "inset 0 0 0 3px rgba(255, 0, 0, 0.6)"
      };
    }

    setHighlightedSquares(newHighlights);

    // Clear move highlights after a delay, but keep check highlight
    const timer = setTimeout(() => {
      if (checkSquare) {
        setHighlightedSquares({
          [checkSquare]: {
            backgroundColor: "rgba(255, 87, 87, 0.5)",
            boxShadow: "inset 0 0 0 3px rgba(255, 0, 0, 0.6)"
          }
        });
      } else {
        setHighlightedSquares({});
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [fen, checkSquare]);

  // Responsive board size
  useEffect(() => {
    const handleResize = () => {
      // Calculate based on container size
      const width = Math.min(560, window.innerWidth - 40);
      setBoardWidth(width);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle piece movement
  function onDrop(sourceSquare: Square, targetSquare: Square): boolean {
    if (!isPlayerTurn) return false;

    try {
      const moveDetails = {
        from: sourceSquare,
        to: targetSquare,
        promotion: "q" // always promote to queen for simplicity
      };

      const move = game.move(moveDetails);

      if (move === null) return false;

      // Highlight the squares involved in the move
      setHighlightedSquares({
        [sourceSquare]: { backgroundColor: "rgba(255, 217, 102, 0.5)" },
        [targetSquare]: { backgroundColor: "rgba(255, 217, 102, 0.5)" }
      });

      // Notify parent component about the move with full details
      onMove(game.fen(), move);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get custom pieces with visual indicator for check
  const customPieces = () => {
    const pieces: Record<
      string,
      ({ squareWidth }: { squareWidth: number }) => JSX.Element
    > = {};

    if (checkSquare) {
      const color = game.turn() === "w" ? "wk" : "bk";
      pieces[color] = ({ squareWidth }) => (
        <div className="relative">
          {/* Original king piece */}
          <img
            src={`/chess-pieces/${color}.svg`}
            alt={color === "wk" ? "White King" : "Black King"}
            style={{ width: squareWidth, height: squareWidth }}
          />
          {/* Red outline for check */}
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              border: "2px solid rgba(255, 0, 0, 0.7)",
              boxShadow: "0 0 8px rgba(255, 0, 0, 0.7)"
            }}
          />
        </div>
      );
    }

    return pieces;
  };

  return (
    <div
      className="mx-auto rounded-lg overflow-hidden shadow-xl"
      style={{ width: boardWidth }}
    >
      <Chessboard
        position={game.fen()}
        onPieceDrop={onDrop}
        boardWidth={boardWidth}
        areArrowsAllowed={true}
        customBoardStyle={{
          borderRadius: "8px",
          boxShadow:
            "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
        }}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        customSquareStyles={highlightedSquares}
        animationDuration={200}
        customPieces={customPieces()}
      />
    </div>
  );
}
