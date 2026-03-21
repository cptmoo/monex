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
    const depth = settings.aiLevel === "Easy" ? 1
        : settings.aiLevel === "Medium" ? 3
        : settings.aiLevel === "Hard" ? 5
        : 7;

    if (activePlayers.length === 3) {
        return AI.chooseMoveThreePlayer(board, settings, players, currentPlayerIndex, depth);
    }

    return AI.chooseMoveTwoPlayer(board, settings, players, currentPlayerIndex, depth);
    },

  /**
   * Choose a move in a 2-player game.
   *
   * @param {Board} board
   * @param {MonexSettings} settings
   * @param {MonexPlayer[]} players
   * @param {number} currentPlayerIndex
   * @param {number} depth
   * @returns {BoardCell | null}
   */
    chooseMoveTwoPlayer(board, settings, players, currentPlayerIndex, depth) {
    const AI = monexAIWindow.MonexAI;
    const state = AI.createGameState(board, settings, players, currentPlayerIndex);

    if (depth <= 1) {
        return AI.chooseMoveTwoPlayerEasy(state, currentPlayerIndex);
    }

    //return AI.chooseMoveTwoPlayerMinimax(state, currentPlayerIndex, depth);
    },

    /**
     * Choose a move in a 2-player game.
     *
     * @param {MonexGameState} state
     * @param {number} perspectivePlayerIndex
     * @returns {BoardCell | null}
     */    
    chooseMoveTwoPlayerEasy(state, perspectivePlayerIndex) {
        const AI = monexAIWindow.MonexAI;
        /** @type {BoardCell[]} */
        const moves = AI.generateLegalMoves(
            state.board,
            state.settings,
            state.players,
            state.currentPlayerIndex
        );

        /** @type {{ move: BoardCell, score: number }[]} */
        const scoredMoves = moves.map((move) => {
            const next = AI.applyMove(state, move);
            return {
            move,
            score: AI.evaluatePosition(next, perspectivePlayerIndex)
            };
        });

        return AI.pickRandomBestMove(scoredMoves);
    },

  /**
   * Choose a move in a 3-player game.
   *
   * @param {Board} board
   * @param {MonexSettings} settings
   * @param {MonexPlayer[]} players
   * @param {number} currentPlayerIndex
   * @param {number} depth
   * @returns {BoardCell | null}
   */
  chooseMoveThreePlayer(board, settings, players, currentPlayerIndex, depth) 
  {
    return null;
  },  

  /**
   * Return all legal moves for the current player.
   *
   * @param {Board} board
   * @param {MonexSettings} settings
   * @param {MonexPlayer[]} players
   * @param {number} currentPlayerIndex
   * @returns {BoardCell[]}
   */
  generateLegalMoves(board, settings, players, currentPlayerIndex) 
  {
    const Core = monexAIWindow.MonexCore;

    /** @type {BoardCell[]} */
    const legalMoves = [];
    for (let r = 0; r < settings.boardSize; r++) {
      for (let c = 0; c < settings.boardSize; c++) {
        if (Core.isCellFilled(board,r,c)) continue;

        const validation  = Core.validateMove(board, settings, players, currentPlayerIndex, r, c)
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
  evaluatePosition(state, perspectivePlayerIndex) 
  {
    const Core = monexAIWindow.MonexCore;
    const AI = monexAIWindow.MonexAI;
    // search for win;
    if (state.gameOver) {
        if (state.winnerIndex === perspectivePlayerIndex) return 1000000;
        if (state.winnerIndex === null) return 0;
        return -1000000;
    }
    if (state.players[perspectivePlayerIndex]?.isOut) return -1000000;

    const nextPlayer = Core.getNextActivePlayerIndex(state.players, state.currentPlayerIndex);
    const nextPlayerWins = Core.findWinningMovesForPlayer(state.board, state.settings.boardSize, nextPlayer);
    if (nextPlayerWins.length > 0) return -1000;

    const iHaveWinningMove = Core.findWinningMovesForPlayer(state.board, state.settings.boardSize, perspectivePlayerIndex);
    if (iHaveWinningMove.length > 0) return 1000;

    // give a noisy bonus to centre cells. 
    if (state.lastMove) {
        const centre = (state.settings.boardSize - 1) / 2;
        const dr = Math.abs(state.lastMove.r - centre);
        const dc = Math.abs(state.lastMove.c - centre);

        const centreBonus = 2 - 0.5 * (dr + dc);
        const noise = Math.random() * 3;

        return centreBonus + noise;
        }

    return Math.random() * 3;


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
    }
};