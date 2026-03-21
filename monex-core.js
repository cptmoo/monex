// @ts-check

/**
 * A board coordinate with a stable key for Vue rendering.
 * @typedef {BoardCell & { key: string }} FlatBoardCell
 */


/**
 * Shape of the constants loaded from monex-constants.js
 * @typedef {Object} MonexConstantsShape
 * @property {string[]} symbolOptions
 * @property {string[]} colourOptions
 * @property {string[]} aiLevels
 * @property {MonexSettings} defaultSettings
 * @property {DraftPlayer[]} defaultPlayerTemplates
 */

/**
 * Result returned when checking move legality.
 * @typedef {Object} MoveValidationResult
 * @property {boolean} ok
 * @property {string=} reason
 */

/**
 * Styling object used for the CSS grid board.
 * @typedef {Object} BoardStyle
 * @property {string} gridTemplateColumns
 * @property {string} gridTemplateRows
 */


const monexWindow = /** @type {Window & { MonexConstants?: any, MonexCore?: any }} */ (window);
monexWindow.MonexCore = {
  /**
   * Creates the default player set for a given player count.
   * These are used both for initial setup and when resetting the setup form.
   *
   * @param {number} count
   * @returns {MonexPlayer[]}
   */
    createDefaultPlayers(count) {
    return monexWindow.MonexConstants.defaultPlayerTemplates
        .slice(0, count)
        .map((/** @type {DraftPlayer} */ player) => ({
        ...player,
        timeLeftMs: 0,
        timerStarted: false,
        isOut: false
        }));
    },

  /**
   * Converts draft setup players into live in-game players.
   *
   * @param {DraftPlayer[]} draftPlayers
   * @param {number} timerMinutes
   * @returns {MonexPlayer[]}
   */
  createConfiguredPlayers(draftPlayers, timerMinutes) {
    return draftPlayers.map((player) => ({
      symbol: player.symbol,
      colour: player.colour,
      isAI: player.isAI,
      timeLeftMs: timerMinutes * 60 * 1000,
      timerStarted: false,
      isOut: false
    }));
  },

  /**
   * Builds an empty square board filled with null.
   *
   * @param {number} boardSize
   * @returns {Board}
   */
  createEmptyBoard(boardSize) {
    return Array.from({ length: boardSize }, () =>
      Array.from({ length: boardSize }, () => null)
    );
  },

  /**
   * Deep-clones a board.
   *
   * @param {Board} board
   * @returns {Board}
   */
  cloneBoard(board) {
    return board.map((row) => [...row]);
  },

  /**
   * Clones the players array.
   *
   * @param {MonexPlayer[]} players
   * @returns {MonexPlayer[]}
   */
  clonePlayers(players) {
    return players.map((player) => ({ ...player }));
  },

  /**
   * Clones a result line if present.
   *
   * @param {ResultLine | null} resultLine
   * @returns {ResultLine | null}
   */
  cloneResultLine(resultLine) {
    return resultLine
      ? {
          type: resultLine.type,
          cells: resultLine.cells.map((cell) => ({ ...cell }))
        }
      : null;
  },

  /**
   * Safely reads a board cell.
   *
   * @param {Board} board
   * @param {number} r
   * @param {number} c
   * @returns {number | null}
   */
  getCellValue(board, r, c) {
    return board?.[r]?.[c] ?? null;
  },

  /**
   * Checks whether a board cell is occupied.
   *
   * @param {Board} board
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  isCellFilled(board, r, c) {
    return this.getCellValue(board, r, c) !== null;
  },

  /**
   * Checks whether a cell matches the stored previous move.
   *
   * @param {BoardCell | null} lastMove
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  isLastMove(lastMove, r, c) {
    return !!lastMove && lastMove.r === r && lastMove.c === c;
  },

  /**
   * Checks whether a cell is part of the current result line.
   *
   * @param {ResultLine | null} resultLine
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  isResultCell(resultLine, r, c) {
    return resultLine?.cells?.some((cell) => cell.r === r && cell.c === c) ?? false;
  },

  /**
   * Checks whether a cell is part of a specific result line type.
   *
   * @param {ResultLine | null} resultLine
   * @param {number} r
   * @param {number} c
   * @param {"win"|"loss"} type
   * @returns {boolean}
   */
  isResultCellOfType(resultLine, r, c, type) {
    return resultLine?.type === type &&
      resultLine.cells.some((cell) => cell.r === r && cell.c === c);
  },

  /**
   * Builds the CSS class object for a board cell.
   *
   * @param {BoardCell | null} lastMove
   * @param {ResultLine | null} resultLine
   * @param {number} r
   * @param {number} c
   * @returns {Record<string, boolean>}
   */
  cellClasses(lastMove, resultLine, r, c) {
    return {
      "last-move": this.isLastMove(lastMove, r, c) && !this.isResultCell(resultLine, r, c),
      "win-cell": this.isResultCellOfType(resultLine, r, c, "win"),
      "loss-cell": this.isResultCellOfType(resultLine, r, c, "loss")
    };
  },

  /**
   * Builds a flat list of board cells for Vue rendering.
   *
   * @param {number} boardSize
   * @returns {FlatBoardCell[]}
   */
  buildFlatBoard(boardSize) {
    /** @type {FlatBoardCell[]} */
    const cells = [];

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        cells.push({
          r,
          c,
          key: `${r}-${c}`
        });
      }
    }

    return cells;
  },

  /**
   * Builds the inline CSS grid style for the board.
   *
   * @param {number} boardSize
   * @returns {BoardStyle}
   */
  buildBoardStyle(boardSize) {
    return {
      gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
      gridTemplateRows: `repeat(${boardSize}, 1fr)`
    };
  },

  /**
   * Returns a shuffled copy of an array.
   *
   * @template T
   * @param {T[]} arr
   * @returns {T[]}
   */
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /**
   * Returns the indices of players who are still active.
   *
   * @param {MonexPlayer[]} players
   * @returns {number[]}
   */
  getActivePlayerIndices(players) {
    /** @type {number[]} */
    const indices = [];

    for (let i = 0; i < players.length; i++) {
      if (!players[i].isOut) indices.push(i);
    }

    return indices;
  },

  /**
   * Finds the next non-eliminated player after a given index.
   *
   * @param {MonexPlayer[]} players
   * @param {number} fromIndex
   * @returns {number}
   */
  getNextActivePlayerIndex(players, fromIndex) {
    if (!players.length) return 0;

    let idx = fromIndex;
    for (let step = 0; step < players.length; step++) {
      idx = (idx + 1) % players.length;
      if (!players[idx].isOut) return idx;
    }

    return fromIndex;
  },

  /**
   * Checks whether every board cell is occupied.
   *
   * @param {Board} board
   * @returns {boolean}
   */
  isBoardFull(board) {
    return board.every((row) => row.every((cell) => cell !== null));
  },

  /**
   * Checks whether a coordinate is inside the board.
   *
   * @param {number} boardSize
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  inBounds(boardSize, r, c) {
    return r >= 0 && c >= 0 && r < boardSize && c < boardSize;
  },

  /**
   * Finds a continuous line of the given length for one player.
   * If a longer run exists, the first targetLength cells are returned.
   *
   * @param {Board} board
   * @param {number} boardSize
   * @param {number} playerIndex
   * @param {number} targetLength
   * @returns {BoardCell[] | null}
   */
  findLineOfLength(board, boardSize, playerIndex, targetLength) {
    /** @type {[number, number][]} */
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] !== playerIndex) continue;

        for (const [dr, dc] of dirs) {
          const prevR = r - dr;
          const prevC = c - dc;
          
          // Check if the previous square is this player. If it is then we are not at the start of this potential line
          if (this.inBounds(boardSize, prevR, prevC) && board[prevR][prevC] === playerIndex) {
            continue;
          }

          /** @type {BoardCell[]} */
          const cells = [];
          let rr = r;
          let cc = c;

          while (this.inBounds(boardSize, rr, cc) && board[rr][cc] === playerIndex) {
            cells.push({ r: rr, c: cc });
            rr += dr;
            cc += dc;
          }

          if (cells.length >= targetLength) {
            return cells.slice(0, targetLength);
          }
        }
      }
    }

    return null;
  },

  /**
   * Returns true if the player has a line of the given length.
   *
   * @param {Board} board
   * @param {number} boardSize
   * @param {number} playerIndex
   * @param {number} targetLength
   * @returns {boolean}
   */
  hasLineOfLength(board, boardSize, playerIndex, targetLength) {
    return !!this.findLineOfLength(board, boardSize, playerIndex, targetLength);
  },

  /**
   * Checks whether making a move would cause that player to lose by forming 3,
   * unless the move would already win by forming 4.
   *
   * @param {Board} board
   * @param {number} boardSize
   * @param {number} playerIndex
   * @param {number} r
   * @param {number} c
   * @returns {boolean}
   */
  moveWouldCauseLoss(board, boardSize, playerIndex, r, c) {
    if (board[r][c] !== null) return false;

    board[r][c] = playerIndex;
    const madeFour = this.hasLineOfLength(board, boardSize, playerIndex, 4);
    const madeThree = this.hasLineOfLength(board, boardSize, playerIndex, 3);
    board[r][c] = null;

    if (madeFour) return false;
    return madeThree;
  },

  /**
   * Finds all cells where this player could move right now to make 4 in a row.
   *
   * @param {Board} board
   * @param {number} boardSize
   * @param {number} playerIndex
   * @returns {BoardCell[]}
   */
  findWinningMovesForPlayer(board, boardSize, playerIndex) {
    /** @type {BoardCell[]} */
    const moves = [];

    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c] !== null) continue;

        board[r][c] = playerIndex;
        const isWinningMove = this.hasLineOfLength(board, boardSize, playerIndex, 4);
        board[r][c] = null;

        if (isWinningMove) {
          moves.push({ r, c });
        }
      }
    }

    return moves;
  },

  /**
   * Validates whether a move is legal, including the 3-player forced-block rule.
   *
   * @param {Board} board
   * @param {MonexSettings} settings
   * @param {MonexPlayer[]} players
   * @param {number} currentPlayerIndex
   * @param {number} r
   * @param {number} c
   * @returns {MoveValidationResult}
   */
  validateMove(board, settings, players, currentPlayerIndex, r, c) {
    if (board[r][c] !== null) {
        return { ok: false, reason: "Cell already occupied." };
    }
    const activePlayers = this.getActivePlayerIndices(players);
    if (activePlayers.length !== 3) {
    return { ok: true };
    }

    const current = currentPlayerIndex;

    if (players[current].isOut) {
      return { ok: false, reason: "This player has been eliminated." };
    }

    const next = this.getNextActivePlayerIndex(players, current);

    const selfWinningMoves = this.findWinningMovesForPlayer(
      board,
      settings.boardSize,
      current
    );
    if (selfWinningMoves.length > 0) {
      return { ok: true };
    }

    const nextWinningMoves = this.findWinningMovesForPlayer(
      board,
      settings.boardSize,
      next
    );
    if (nextWinningMoves.length === 0) {
      return { ok: true };
    }

    const isBlockingMove = nextWinningMoves.some((move) => move.r === r && move.c === c);
    if (isBlockingMove) {
      return { ok: true };
    }

    const safeBlockingMoves = nextWinningMoves.filter((move) => {
      return !this.moveWouldCauseLoss(board, settings.boardSize, current, move.r, move.c);
    });

    if (safeBlockingMoves.length === 0) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: "You must block the next player's winning move unless you can win now or every block would lose by 3."
    };
  }
};