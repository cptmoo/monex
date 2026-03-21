// @ts-check

/**
 * @typedef {Object} MonexApp
 * @property {MonexSettings} settings
 * @property {MonexSettings} draftSettings
 * @property {MonexPlayer[]} players
 * @property {DraftPlayer[]} draftPlayers
 * @property {((number|null)[][])} board
 * @property {number} currentPlayerIndex
 * @property {boolean} openSetup
 * @property {boolean} gameOver
 * @property {boolean} gameStarted
 * @property {string} message
 * @property {number | null} timerInterval
 * @property {number | null} turnStartedAt
 * @property {number} nowTick
 * @property {BoardCell | null} lastMove
 * @property {ResultLine | null} resultLine
 * @property {MonexSnapshot[]} moveHistory
 * @property {boolean} canUndo
 * 
 * @property {() => void} resetDraft
 * @property {() => void} initialiseEmptyBoard
 * @property {() => void} clearTimerInterval
 * @property {() => void} startTurnClock
 * @property {() => MonexSnapshot} createSnapshot
 * @property {() => void} undoMove
 * @property {() => void} startNewGameFromDraft
 * @property {(playerIndex: number) => void} finishByTimeout
 * @property {(ms: number) => string} formatTime
 * @property {() => void} commitElapsedToCurrentPlayer 
 * @property {(playerIndex: number, text: string) => void} finishWithWin
 * @property {(playerIndex: number) => void} handlePlayerLoss
 * 
 */

const appWindow =
  /** @type {Window & { Vue?: any, MonexConstants?: any, MonexCore?: any, MonexTemplate?: string }} */ (window);

if (!appWindow.Vue) {
  throw new Error("Vue is not loaded.");
}
if (!appWindow.MonexConstants) {
  throw new Error("MonexConstants is not loaded.");
}
if (!appWindow.MonexCore) {
  throw new Error("MonexCore is not loaded.");
}
if (!appWindow.MonexTemplate) {
  throw new Error("MonexTemplate is not loaded.");
}

const { createApp } = appWindow.Vue;
const C = appWindow.MonexConstants;
const Core = appWindow.MonexCore;

createApp({
  template: appWindow.MonexTemplate,

  data() {
    return {
      symbolOptions: /** @type {string[]} */ (C.symbolOptions),
      colourOptions: /** @type {string[]} */ (C.colourOptions),
      aiLevels: /** @type {string[]} */ (C.aiLevels),

      settings: /** @type {MonexSettings} */ ({ ...C.defaultSettings }),
      players: /** @type {MonexPlayer[]} */ ([]),

      draftSettings: /** @type {MonexSettings} */ ({ ...C.defaultSettings }),
      draftPlayers: /** @type {DraftPlayer[]} */ ([]),

      board: /** @type {((number|null)[][])} */ ([]),
      currentPlayerIndex: 0,
      openSetup: true,
      gameOver: false,
      gameStarted: false,
      message: "Set up a new game.",
      timerInterval: /** @type {number | null} */ (null),
      turnStartedAt: /** @type {number | null} */ (null),
      nowTick: Date.now(),
      lastMove: /** @type {BoardCell | null} */ (null),
      resultLine: /** @type {ResultLine | null} */ (null),
      moveHistory: /** @type {MonexSnapshot[]} */ ([])
    };
  },

  computed: {
    /** @this {MonexApp} */
    flatBoard() {
      return Core.buildFlatBoard(this.settings.boardSize);
    },

    /** @this {MonexApp} */
    boardStyle() {
      return Core.buildBoardStyle(this.settings.boardSize);
    },

    /** @this {MonexApp} */
    canUndo() {
      return this.gameStarted && this.moveHistory.length > 0;
    }
  },

  mounted() {
    this.resetDraft();
    this.initialiseEmptyBoard();
  },

  beforeUnmount() {
    this.clearTimerInterval();
  },

  methods: {
    /**
     * Rebuilds the board as an empty grid for the current board size.
     * 
     * @this {MonexApp}
     */
    initialiseEmptyBoard() {
      this.board = Core.createEmptyBoard(this.settings.boardSize);
    },

    /**
     * Safely reads a cell from the board.
     *
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {number | null}
     */
    getCellValue(r, c) {
      return Core.getCellValue(this.board, r, c);
    },

    /**
     * Checks whether a board cell is already occupied.
     *
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {boolean}
     */
    isCellFilled(r, c) {
      return Core.isCellFilled(this.board, r, c);
    },

    /**
     * Returns the CSS class object for a board cell.
     *
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {Record<string, boolean>}
     */
    cellClasses(r, c) {
      return Core.cellClasses(this.lastMove, this.resultLine, r, c);
    },

    /**
     * Resets the setup sheet to match the current settings and players.
     * 
     * @this {MonexApp}
     */
    resetDraft() {
      this.draftSettings = { ...this.settings };
      this.draftPlayers = /** @type {DraftPlayer[]} */ (
        Core.createDefaultPlayers(this.draftSettings.playerCount)
      );

      if (this.players.length) {
        for (let i = 0; i < Math.min(this.players.length, this.draftPlayers.length); i++) {
          this.draftPlayers[i].symbol = this.players[i].symbol;
          this.draftPlayers[i].colour = this.players[i].colour;
          this.draftPlayers[i].isAI = this.players[i].isAI;
        }
      }
    },

    /**
     * Opens the setup sheet using the current game values as the starting point.
     * 
     * @this {MonexApp}
     */
    openSetupFromCurrent() {
      this.resetDraft();
      this.openSetup = true;
    },

    /**
     * Changes the draft player count and preserves existing draft choices where possible.
     *
     * @this {MonexApp}
     * @param {number} count
     */
    setDraftPlayerCount(count) {
      const oldPlayers = this.draftPlayers.slice();
      this.draftSettings.playerCount = count;
      this.draftPlayers = /** @type {DraftPlayer[]} */ (Core.createDefaultPlayers(count));

      for (let i = 0; i < Math.min(oldPlayers.length, this.draftPlayers.length); i++) {
        this.draftPlayers[i].symbol = oldPlayers[i].symbol;
        this.draftPlayers[i].colour = oldPlayers[i].colour;
        this.draftPlayers[i].isAI = oldPlayers[i].isAI;
      }
    },

    /**
     * Starts a fresh game from the current draft setup.
     * 
     * @this {MonexApp}
     */
    startNewGameFromDraft() {
      this.settings = { ...this.draftSettings };

      const newPlayers = /** @type {MonexPlayer[]} */ (
        Core.createConfiguredPlayers(this.draftPlayers, this.draftSettings.timerMinutes)
      );

      this.players = Core.shuffleArray(newPlayers);
      this.board = Core.createEmptyBoard(this.settings.boardSize);

      this.currentPlayerIndex = 0;
      this.gameOver = false;
      this.gameStarted = true;
      this.openSetup = false;
      this.lastMove = null;
      this.resultLine = null;
      this.moveHistory = [];

      this.message = this.players.some((/** @type {MonexPlayer} */ p) => p.isAI)
        ? `${this.players[this.currentPlayerIndex].symbol} starts. AI is not implemented yet.`
        : `${this.players[this.currentPlayerIndex].symbol} starts.`;

      this.startTurnClock();
    },

    /**
     * Restarts a game using the current live settings and player choices.
     * 
     * @this {MonexApp}
     */
    restartWithCurrentSettings() {
      this.draftSettings = { ...this.settings };
      this.draftPlayers = this.players.length
        ? this.players.map((/** @type {MonexPlayer} */ p) => ({
            symbol: p.symbol,
            colour: p.colour,
            isAI: p.isAI
          }))
        : /** @type {DraftPlayer[]} */ (Core.createDefaultPlayers(this.settings.playerCount));

      this.startNewGameFromDraft();
    },

    /**
     * Clears the active timer interval if one exists.
     * 
     * @this {MonexApp}
     */
    clearTimerInterval() {
      if (this.timerInterval !== null) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    /**
     * Starts the live ticking display for the current player's clock.
     * 
     * @this {MonexApp}
     */
    startTurnClock() {
      this.clearTimerInterval();
      this.turnStartedAt = Date.now();
      this.nowTick = Date.now();

      this.timerInterval = window.setInterval(() => {
        if (!this.gameStarted || this.gameOver || !this.players.length) return;

        this.nowTick = Date.now();

        const player = this.players[this.currentPlayerIndex];
        if (!player) return;
        if (player.isOut) return;
        if (!player.timerStarted) return;
        if (this.turnStartedAt === null) return;

        const elapsed = this.nowTick - this.turnStartedAt;
        const remaining = player.timeLeftMs - elapsed;

        if (remaining <= 0) {
          player.timeLeftMs = 0;
          this.turnStartedAt = this.nowTick;
          this.finishByTimeout(this.currentPlayerIndex);
        }
      }, 100);
    },

    /**
     * Commits the elapsed live time to the current player's stored clock.
     * 
     * @this {MonexApp}
     */
    commitElapsedToCurrentPlayer() {
      if (!this.players.length || this.turnStartedAt === null) return;

      const player = this.players[this.currentPlayerIndex];
      if (!player) return;

      const now = Date.now();

      if (player.timerStarted) {
        const elapsed = now - this.turnStartedAt;
        player.timeLeftMs = Math.max(0, player.timeLeftMs - elapsed);
      }

      this.turnStartedAt = now;
      this.nowTick = now;
    },

    /**
     * Returns the display string for one player's clock.
     *
     * @this {MonexApp}
     * @param {number} index
     * @returns {string}
     */
    displayTimeForPlayer(index) {
      const player = this.players[index];
      if (!player) return "0:00";

      let ms = player.timeLeftMs;

      if (
        player.timerStarted &&
        this.gameStarted &&
        !this.gameOver &&
        index === this.currentPlayerIndex &&
        this.turnStartedAt !== null
      ) {
        ms -= (this.nowTick - this.turnStartedAt);
      }

      return this.formatTime(Math.max(0, ms));
    },

    /**
     * Formats milliseconds as m:ss.
     *
     * @param {number} ms
     * @returns {string}
     */
    formatTime(ms) {
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.max(0, totalSeconds % 60);
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    },

    /**
     * Handles a player tapping a board cell.
     *
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     */
    handleCellClick(r, c) {
      if (this.gameOver) return;
      if (!this.gameStarted) return;
      if (this.board[r]?.[c] !== null) return;

      const legalResult = Core.validateMove(
        this.board,
        this.settings,
        this.players,
        this.currentPlayerIndex,
        r,
        c
      );

      if (!legalResult.ok) {
        this.message = legalResult.reason || "Illegal move.";
        return;
      }

      this.moveHistory.push(this.createSnapshot());
      this.commitElapsedToCurrentPlayer();
      this.resultLine = null;

      const playerIndex = this.currentPlayerIndex;
      this.board[r][c] = playerIndex;
      this.players[playerIndex].timerStarted = true;
      this.lastMove = { r, c };

      const winningLine = Core.findLineOfLength(
        this.board,
        this.settings.boardSize,
        playerIndex,
        4
      );

      const losingLine = Core.findLineOfLength(
        this.board,
        this.settings.boardSize,
        playerIndex,
        3
      );

      if (winningLine) {
        this.resultLine = {
          type: "win",
          cells: winningLine
        };
        this.finishWithWin(playerIndex, "wins by making 4 in a row.");
        return;
      }

      if (losingLine) {
        this.resultLine = {
          type: "loss",
          cells: losingLine
        };
        this.handlePlayerLoss(playerIndex);
        return;
      }

      if (Core.isBoardFull(this.board)) {
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = "Draw. The board is full.";
        return;
      }

      this.currentPlayerIndex = Core.getNextActivePlayerIndex(
        this.players,
        this.currentPlayerIndex
      );
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      if (!nextPlayer) return;

      this.message = `${nextPlayer.symbol} to move.`;
    },

    /**
     * Captures the current game state for undo.
     *
     * @this {MonexApp}
     * @returns {MonexSnapshot}
     */
    createSnapshot() {
      return {
        board: Core.cloneBoard(this.board),
        currentPlayerIndex: this.currentPlayerIndex,
        players: Core.clonePlayers(this.players),
        gameOver: this.gameOver,
        gameStarted: this.gameStarted,
        message: this.message,
        lastMove: this.lastMove ? { ...this.lastMove } : null,
        resultLine: Core.cloneResultLine(this.resultLine)
      };
    },

    /**
     * Restores the previous move state if available.
     * 
     * @this {MonexApp}
     */
    undoMove() {
      if (!this.canUndo) return;

      const snapshot = this.moveHistory.pop();
      if (!snapshot) return;

      this.board = Core.cloneBoard(snapshot.board);
      this.currentPlayerIndex = snapshot.currentPlayerIndex;
      this.players = Core.clonePlayers(snapshot.players);
      this.gameOver = snapshot.gameOver;
      this.gameStarted = snapshot.gameStarted;
      this.message = "Move undone.";
      this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
      this.resultLine = Core.cloneResultLine(snapshot.resultLine);

      if (this.gameStarted && !this.gameOver) {
        this.startTurnClock();
      } else {
        this.clearTimerInterval();
      }
    },

    /**
     * Ends the game with a win message.
     *
     * @this {MonexApp}
     * @param {number} playerIndex
     * @param {string} text
     */
    finishWithWin(playerIndex, text) {
      this.gameOver = true;
      this.clearTimerInterval();

      const player = this.players[playerIndex];
      if (!player) return;

      this.message = `${player.symbol} ${text}`;
    },

    /**
     * Applies the loss rule for a player who formed 3 in a row.
     * In 2-player, this ends the game immediately.
     * In 3-player, the player is eliminated and the others continue.
     *
     * @this {MonexApp}
     * @param {number} playerIndex
     */
    handlePlayerLoss(playerIndex) {
      const player = this.players[playerIndex];
      if (!player) return;

      if (this.players.length === 2) {
        const winnerIndex = Core.getNextActivePlayerIndex(this.players, playerIndex);
        const winner = this.players[winnerIndex];
        if (!winner) return;

        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} loses by making 3 in a row. ${winner.symbol} wins.`;
        return;
      }

      player.isOut = true;

      /** @type {number[]} */
      const activePlayers = Core.getActivePlayerIndices(this.players);

      if (activePlayers.length === 1) {
        const winner = this.players[activePlayers[0]];
        if (!winner) return;

        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} loses by making 3 in a row. ${winner.symbol} wins.`;
        return;
      }

      this.currentPlayerIndex = Core.getNextActivePlayerIndex(this.players, playerIndex);
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      if (!nextPlayer) return;

      this.message = `${player.symbol} is out for making 3 in a row. ${nextPlayer.symbol} to move.`;
    },

    /**
     * Applies the timeout rule for a player whose clock expired.
     *
     * @this {MonexApp}
     * @param {number} playerIndex
     */
    finishByTimeout(playerIndex) {
      const player = this.players[playerIndex];
      if (!player) return;

      if (this.players.length === 2) {
        const winnerIndex = Core.getNextActivePlayerIndex(this.players, playerIndex);
        const winner = this.players[winnerIndex];
        if (!winner) return;

        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} ran out of time. ${winner.symbol} wins.`;
        return;
      }

      player.isOut = true;

      /** @type {number[]} */
      const activePlayers = Core.getActivePlayerIndices(this.players);

      if (activePlayers.length === 1) {
        const winner = this.players[activePlayers[0]];
        if (!winner) return;

        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} ran out of time. ${winner.symbol} wins.`;
        return;
      }

      this.currentPlayerIndex = Core.getNextActivePlayerIndex(this.players, playerIndex);
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      if (!nextPlayer) return;

      this.message = `${player.symbol} ran out of time and is out. ${nextPlayer.symbol} to move.`;
    }
  }
}).mount("#app");