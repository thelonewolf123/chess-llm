import { generateText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { Chess } from "chess.js";
import { z } from "zod";

// Define the schema for the AI's move response
const moveResponseSchema = z.object({
  move: z.object({
    from: z.string(),
    to: z.string(),
    promotion: z.string().optional()
  }),
  reasoning: z.string()
});

export async function generateMove(
  fen: string,
  moveHistory: any[] = [],
  apiKey: string,
  modelName = "gpt-4o"
) {
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }

  // Create a chess instance to get legal moves
  const chess = new Chess(fen);

  // Get all legal moves in a structured format
  const legalMoves = chess.moves({ verbose: true });

  // If no legal moves, return early
  if (legalMoves.length === 0) {
    throw new Error("No legal moves available");
  }

  // Format the legal moves for the LLM
  const formattedMoves = legalMoves.map((move) => ({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    piece: move.piece,
    captured: move.captured,
    san: move.san
  }));

  // Get the last 7 moves from the history (or fewer if not available)
  const recentMoves = moveHistory.slice(-7);

  // Format the recent moves for the LLM
  const formattedHistory = recentMoves
    .map((move, index) => {
      return `${
        Math.floor(index / 2) +
        Math.floor((moveHistory.length - recentMoves.length) / 2) +
        1
      }. ${move.player === "You" ? "Human" : "AI"}: ${move.san}${
        move.reasoning ? ` (${move.reasoning})` : ""
      }`;
    })
    .join("\n");

  // Check if the king is in check
  const inCheck = chess.isCheck();

  // Check if there's a checkmate or stalemate possibility
  const checkmatePossible = legalMoves.some((move) => move.san.includes("#"));
  const defensiveNeeded = inCheck;

  try {
    // Use the AI SDK to generate a structured move
    const prompt = `You are an expert chess player with a 1800 ELO rating. You will analyze the current board position and choose the best move.

The current board position in FEN notation is: ${fen}
          
${
  recentMoves.length > 0
    ? `Recent game history (last ${recentMoves.length} moves):
${formattedHistory}

Based on this game history, I can see the following patterns and strategies:
- ${
        recentMoves.length >= 2
          ? "The human player tends to " +
            (recentMoves.filter((m) => m.player === "You").length >= 2
              ? "favor " +
                (recentMoves.filter(
                  (m) => m.player === "You" && m.piece === "p"
                ).length >= 2
                  ? "pawn moves"
                  : recentMoves.filter(
                      (m) => m.player === "You" && m.piece === "n"
                    ).length >= 2
                  ? "knight development"
                  : recentMoves.filter(
                      (m) => m.player === "You" && m.piece === "b"
                    ).length >= 2
                  ? "bishop development"
                  : "piece development")
              : "play aggressively")
          : "This is early in the game"
      }
- ${
        recentMoves.filter((m) => m.captured).length > 0
          ? "There have been " +
            recentMoves.filter((m) => m.captured).length +
            " captures so far"
          : "No pieces have been captured yet"
      }
`
    : "This is the beginning of the game."
}

${
  inCheck
    ? "IMPORTANT: Your king is in check! You must respond to this threat."
    : ""
}
${
  checkmatePossible
    ? "IMPORTANT: There's a potential checkmate available. Look for it carefully."
    : ""
}
${
  defensiveNeeded
    ? "IMPORTANT: You need to play defensively to protect your king."
    : ""
}

Here are all the legal moves you can make:
${JSON.stringify(formattedMoves, null, 2)}

Analyze the position and choose the best move. Consider:
1. ${
      inCheck
        ? "Getting out of check is your top priority!"
        : "The recent game history and opponent's strategy"
    }
2. ${
      checkmatePossible
        ? "Look for checkmate opportunities"
        : "Piece development and center control"
    }
3. ${
      defensiveNeeded
        ? "Defensive needs and king safety"
        : "King safety and tactical opportunities"
    }
4. Potential threats and future plans

Return your response in the following JSON format only:
{
  "move": {
    "from": "square1",
    "to": "square2",
    "promotion": "q" // optional, only if this is a promotion move
  },
  "reasoning": "Brief explanation of why you chose this move"
}`;
    const openai = createOpenAI({ apiKey });
    const { text } = await generateText({
      model: openai(modelName),
      prompt,
      temperature: 0.5
    });

    // Parse and validate the response using Zod
    const parsedResponse = moveResponseSchema.parse(JSON.parse(text));

    // Execute the move on our chess instance
    const result = chess.move({
      from: parsedResponse.move.from,
      to: parsedResponse.move.to,
      promotion: parsedResponse.move.promotion
    });

    // Return the new FEN and the move information
    return {
      fen: chess.fen(),
      move: result,
      reasoning: parsedResponse.reasoning
    };
  } catch (error: any) {
    console.error("Error generating move:", error);

    // Check if it's an API key error
    if (
      error.message &&
      (error.message.includes("API key") ||
        error.message.includes("authentication") ||
        error.message.includes("auth") ||
        error.message.includes("401") ||
        error.message.includes("403"))
    ) {
      throw new Error(
        "Invalid or expired OpenAI API key. Please update your API key."
      );
    }

    // Check if it's a parsing error
    if (error.name === "SyntaxError" || error.name === "ZodError") {
      console.error("Failed to parse AI response:", error);
    }

    // Fallback: make a random legal move
    if (legalMoves.length > 0) {
      const randomMove =
        legalMoves[Math.floor(Math.random() * legalMoves.length)];
      chess.move(randomMove);
      return {
        fen: chess.fen(),
        move: randomMove,
        reasoning: "Random move (AI generation failed)"
      };
    }

    throw new Error("Failed to generate a move");
  }
}
