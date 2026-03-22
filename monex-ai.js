// @ts-check

/**
 * @typedef {Window & typeof globalThis & {
 *   MonexConstants?: any,
 *   MonexCore?: any,
 *   MonexAI?: any
 * }} MonexAIWindow
 */

/** @type {MonexAIWindow} */
const monexAIWindow = window;

monexAIWindow.MonexAI = {
  /**
   * Return the chosen move for the current player.
   *
   * @param {Board} board
   * @param {MonexSettings} settings
   * @param {MonexPlayer[]} players
   * @param {number} currentPlayerIndex
   * @returns {BoardCell | null}
   */
  chooseMove(board, settings, players, currentPlayerIndex) 
  {
    const Core = monexAIWindow.MonexCore;
    const AI = monexAIWindow.MonexAI;

    const activePlayers = Core.getActivePlayerIndices(players);
    let depth = settings.aiLevel === "Easy" ? 1
        : settings.aiLevel === "Medium" ? 2
        : settings.aiLevel === "Hard" ? 4
        : 6;

    const state = AI.createGameState(board, settings, players, currentPlayerIndex);

    const filled = AI.countFilledCells(board);
    const totalCells = settings.boardSize * settings.boardSize;
    const fillRatio = filled / totalCells;

    if (fillRatio < 0.15) {
        depth = Math.min(depth, 2);
    } else if (fillRatio < 0.3) {
        depth = Math.min(depth, 4);
    }

    if (activePlayers.length === 3) {
        return AI.chooseMoveThreePlayer(state, depth);
    }
    
    return AI.chooseMoveTwoPlayer(state, depth);
    },

    /**
     * Choose a move in a 2-player game.
     *
     * @param {MonexGameState} state
     * @param {number} depth
     * @returns {BoardCell | null}
     */
    chooseMoveTwoPlayer(state, depth) {
    const AI = monexAIWindow.MonexAI;

    if (depth <= 1) {
        return AI.chooseMoveTwoPlayerEasy(state);
    }

    return AI.chooseMoveTwoPlayerMinimax(state, depth);
    },

    /**
     * Choose a move in a 2-player game.
     *
     * @param {MonexGameState} state
     * @returns {BoardCell | null}
     */    
    chooseMoveTwoPlayerEasy(state) {
        const AI = monexAIWindow.MonexAI;
        /** @type {BoardCell[]} */
        const moves = AI.generateLegalMoves(state);

        /** @type {{ move: BoardCell, score: number }[]} */
        const scoredMoves = moves.map((move) => {
            const next = AI.applyMove(state, move);
            return {
            move,
            score: AI.evaluatePosition(next, state.currentPlayerIndex)
            };
        });
/*console.table(
  scoredMoves.map(s => ({
    r: s.move.r,
    c: s.move.c,
    score: s.score
  }))
);*/
        return AI.pickRandomBestMove(scoredMoves);
    },

    /**
     * Choose a move in a 2-player game using minimax with alpha-beta pruning.
     *
     * @param {MonexGameState} state
     * @param {number} depth
     * @returns {BoardCell | null}
     */
    chooseMoveTwoPlayerMinimax(state, depth) {
    const AI = monexAIWindow.MonexAI;
    const perspectivePlayerIndex = state.currentPlayerIndex;

    /** @type {BoardCell[]} */
    let moves = AI.generateLegalMoves(state);
    if (moves.length === 0) return null;

    moves = AI.orderMoves(state, moves, perspectivePlayerIndex);

    /** @type {{ move: BoardCell, score: number }[]} */
    const scoredMoves = moves.map((move) => {
        const next = AI.applyMove(state, move);
        return {
        move,
        score: AI.minimaxAlphaBeta(
            next,
            depth - 1,
            perspectivePlayerIndex,
            -Infinity,
            Infinity
        )
        };
    });

/*    console.table(
        scoredMoves.map((s) => ({
        r: s.move.r,
        c: s.move.c,
        score: s.score
        }))
    ); */

    return AI.pickRandomBestMove(scoredMoves);
    },

    /**
     * Evaluate a 2-player state using minimax with alpha-beta pruning.
     *
     * @param {MonexGameState} state
     * @param {number} depth
     * @param {number} perspectivePlayerIndex
     * @param {number} alpha
     * @param {number} beta
     * @returns {number}
     */
    minimaxAlphaBeta(state, depth, perspectivePlayerIndex, alpha, beta) {
    const AI = monexAIWindow.MonexAI;
const indent = "  ".repeat(10 - depth);
/*console.log(
  `${indent}Depth ${depth} | Player ${state.currentPlayerIndex} | ${state.currentPlayerIndex === perspectivePlayerIndex ? "MAX" : "MIN"}`
);*/
    if (state.gameOver) {
        if (state.winnerIndex === perspectivePlayerIndex) {
            return 1000000 + depth;
        }
        if (state.winnerIndex === null) {
            return 0;
        }
        return -1000000 - depth;
    }

    if (depth <= 0) {
        return AI.evaluatePosition(state, perspectivePlayerIndex);
    }

    /** @type {BoardCell[]} */
    let moves = AI.generateLegalMoves(state);
    if (moves.length === 0) {
        return AI.evaluatePosition(state, perspectivePlayerIndex);
    }

    moves = AI.orderMoves(state, moves, perspectivePlayerIndex);

    const isMaximising = state.currentPlayerIndex === perspectivePlayerIndex;

    if (isMaximising) {
        let bestScore = -Infinity;

        for (const move of moves) {
        const next = AI.applyMove(state, move);
        const score = AI.minimaxAlphaBeta(next, depth - 1, perspectivePlayerIndex, alpha, beta);
 /* console.log(
    `${indent}  MAX move (${move.r},${move.c}) → score ${score} | alpha ${alpha} beta ${beta}`
  );*/
        if (score > bestScore) bestScore = score;
        if (score > alpha) alpha = score;

        if (beta <= alpha) {
//console.log(`${indent}  PRUNE (MAX) at (${move.r},${move.c})`);

            break;
        }
        }

        return bestScore;
    }

    let bestScore = Infinity;

    for (const move of moves) {
        const next = AI.applyMove(state, move);
        const score = AI.minimaxAlphaBeta(next, depth - 1, perspectivePlayerIndex, alpha, beta);
/*  console.log(
    `${indent}  MIN move (${move.r},${move.c}) → score ${score} | alpha ${alpha} beta ${beta}`
  );*/

        if (score < bestScore) bestScore = score;
        if (score < beta) beta = score;

        if (beta <= alpha) {
//console.log(`${indent}  PRUNE (MIN) at (${move.r},${move.c})`);

        break;
        }
    }
//console.log(`${indent}RETURN ${bestScore}`);
    return bestScore;
    },

    /**
     * Order moves so alpha-beta pruning is more effective.
     *
     * @param {MonexGameState} state
     * @param {BoardCell[]} moves
     * @param {number} perspectivePlayerIndex
     * @returns {BoardCell[]}
     */
    orderMoves(state, moves, perspectivePlayerIndex) {
    const AI = monexAIWindow.MonexAI;

    return [...moves]
        .map((move) => {
        const next = AI.applyMove(state, move);
        return {
            move,
            score: AI.evaluatePosition(next, perspectivePlayerIndex)
        };
        })
        .sort((a, b) => b.score - a.score)
        .map((item) => item.move);
    },


  /**
   * Choose a move in a 3-player game.
   *
   * @param {MonexGameState} state
   * @param {number} depth
   * @returns {BoardCell | null}
   */
  chooseMoveThreePlayer(state, depth) 
  {
    return null;
  },  

  /**
   * Return all legal moves for the current player.
   *
   * @param {MonexGameState} state
   * @returns {BoardCell[]}
   */
  generateLegalMoves(state) 
  {
    const Core = monexAIWindow.MonexCore;

    /** @type {BoardCell[]} */
    const legalMoves = [];
    for (let r = 0; r < state.settings.boardSize; r++) {
      for (let c = 0; c < state.settings.boardSize; c++) {
        if (Core.isCellFilled(state.board,r,c)) continue;

        const validation  = Core.validateMove(state.board, state.settings, state.players, state.currentPlayerIndex, r, c)
        if (validation.ok) {
            legalMoves.push({r,c})
        }
      }
    }
    return legalMoves;
  },

    /**
     * Evaluate a position from one player's perspective.
     *
     * @param {MonexGameState} state
     * @param {number} perspectivePlayerIndex
     * @returns {number}
     */
    evaluatePosition(state, perspectivePlayerIndex) {
    const Core = monexAIWindow.MonexCore;

    if (state.gameOver) {
        if (state.winnerIndex === perspectivePlayerIndex) return 1000000;
        if (state.winnerIndex === null) return 0;
        return -1000000;
    }

    if (state.players[perspectivePlayerIndex]?.isOut) return -1000000;

    const opponentIndex = Core.getNextActivePlayerIndex(
        state.players,
        perspectivePlayerIndex
    );

    const opponentWinningMoves = Core.findWinningMovesForPlayer(
        state.board,
        state.settings.boardSize,
        opponentIndex
    );
    if (opponentWinningMoves.length > 0) {
        return -1000;
    }
    const myWinningMoves = Core.findWinningMovesForPlayer(
        state.board,
        state.settings.boardSize,
        perspectivePlayerIndex
    );
    if (myWinningMoves.length > 0) { 
        return 1000;
    }
    const centre = (state.settings.boardSize - 1) / 2;
    let score = 0;

    for (let r = 0; r < state.settings.boardSize; r++) {
        for (let c = 0; c < state.settings.boardSize; c++) {
        const cell = state.board[r][c];
        if (cell === null) continue;

        const distance = Math.abs(r - centre) + Math.abs(c - centre);
        const weight = 2 - 0.5 * distance;

        if (cell === perspectivePlayerIndex) {
            score += weight;
        } else if (cell === opponentIndex) {
            score -= weight;
        }
        }
    }

    return score;
    },

    /**
     * Apply a move to a state and return the resulting state.
     *
     * @param {MonexGameState} state
     * @param {BoardCell} move
     * @returns {MonexGameState}
     */
    applyMove(state, move) {
    const Core = monexAIWindow.MonexCore;
    const AI = monexAIWindow.MonexAI;

    const next = AI.cloneState(state);

    if (next.gameOver) return next;

    const { r, c } = move;
    const playerIndex = next.currentPlayerIndex;

    // Place move
    next.board[r][c] = playerIndex;
    next.lastMove = { r, c };
    next.resultLine = null;

    // Check win (4 in a row)
    const winningLine = Core.findLineOfLength(
        next.board,
        next.settings.boardSize,
        playerIndex,
        4
    );

    if (winningLine) {
        next.gameOver = true;
        next.winnerIndex = playerIndex;
        next.resultLine = { type: "win", cells: winningLine };
        return next;
    }

    // Check loss (3 in a row)
    const losingLine = Core.findLineOfLength(
        next.board,
        next.settings.boardSize,
        playerIndex,
        3
    );

    if (losingLine) {
        next.resultLine = { type: "loss", cells: losingLine };

        if (next.players.length === 2) {
        // Immediate loss → other player wins
        const winnerIndex = Core.getNextActivePlayerIndex(
            next.players,
            playerIndex
        );

        next.gameOver = true;
        next.winnerIndex = winnerIndex;
        return next;
        }

        // 3-player: eliminate player
        next.players[playerIndex].isOut = true;

        const active = Core.getActivePlayerIndices(next.players);

        if (active.length === 1) {
        next.gameOver = true;
        next.winnerIndex = active[0];
        return next;
        }

        // Continue with next active player
        next.currentPlayerIndex = Core.getNextActivePlayerIndex(
        next.players,
        playerIndex
        );

        return next;
    }

    // Draw
    if (Core.isBoardFull(next.board)) {
        next.gameOver = true;
        next.winnerIndex = null;
        return next;
    }

    // Normal turn progression
    next.currentPlayerIndex = Core.getNextActivePlayerIndex(
        next.players,
        playerIndex
    );

    return next;
    },

    /**
     * @param {{ move: BoardCell, score: number }[]} scoredMoves
     * @returns {BoardCell | null}
     */
    pickRandomBestMove(scoredMoves) {
    if (scoredMoves.length === 0) return null;

    let bestScore = -Infinity;
    /** @type {{ move: BoardCell, score: number }[]} */
    let best = [];

    scoredMoves.forEach((item) => {
        if (item.score > bestScore) {
        bestScore = item.score;
        best = [item];
        } else if (item.score === bestScore) {
        best.push(item);
        }
    });

    return best[Math.floor(Math.random() * best.length)].move;
    },


    /**
     * Create the game state object given the following parameters. 
     *
     * @param {Board} board
     * @param {MonexSettings} settings
     * @param {MonexPlayer[]} players
     * @param {number} currentPlayerIndex
     * @returns {MonexGameState}
     */
    createGameState(board, settings, players, currentPlayerIndex) {
    const Core = monexAIWindow.MonexCore;

    return {
        board: Core.cloneBoard(board),
        settings: { ...settings },
        players: Core.clonePlayers(players),
        currentPlayerIndex,
        gameOver: false,
        winnerIndex: null,
        lastMove: null,
        resultLine: null
    };
    },    

    /**
     * Deep clone a game state.
     *
     * @param {MonexGameState} state
     * @returns {MonexGameState}
     */
    cloneState(state) {
    const Core = monexAIWindow.MonexCore;

    return {
        board: Core.cloneBoard(state.board),
        settings: { ...state.settings },
        players: Core.clonePlayers(state.players),
        currentPlayerIndex: state.currentPlayerIndex,
        gameOver: state.gameOver,
        winnerIndex: state.winnerIndex,
        lastMove: state.lastMove ? { ...state.lastMove } : null,
        resultLine: Core.cloneResultLine(state.resultLine)
    };
    }, 

    /**
     * Count occupied cells on the board.
     *
     * @param {Board} board
     * @returns {number}
     */
    countFilledCells(board) {
    let count = 0;

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
        if (board[r][c] !== null) count++;
        }
    }

    return count;
    }
};