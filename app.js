// @ts-check

/**
 * @typedef {Object} MonexApp
 * @property {MonexSettings} settings
 * @property {MonexSettings} draftSettings
 * @property {MonexPlayer[]} players
 * @property {DraftPlayer[]} draftPlayers
 * @property {Board} board
 * @property {number} currentPlayerIndex
 * @property {boolean} menuOpen
 * @property {boolean} newGameOpen
 * @property {boolean} showRulesInMenu
 * @property {boolean} gameOver
 * @property {boolean} gameStarted
 * @property {boolean} aiThinking
 * @property {string} message
 * @property {number | null} timerInterval
 * @property {number | null} turnStartedAt
 * @property {number} nowTick
 * @property {BoardCell | null} lastMove
 * @property {ResultLine | null} resultLine
 * @property {MonexSnapshot[]} moveHistory
 * @property {MonexSnapshot[]} redoHistory
 * @property {boolean} canUndo
 * @property {boolean} canRedo
 *
 * @property {() => void} resetDraft
 * @property {() => void} initialiseEmptyBoard
 * @property {() => void} clearTimerInterval
 * @property {() => void} startTurnClock
 * @property {() => MonexSnapshot} createSnapshot
 * @property {() => void} undoMove
 * @property {() => void} redoMove
 * @property {() => void} startNewGameFromDraft
 * @property {() => void} openMenu
 * @property {() => void} openNewGameSheet
 * @property {() => void} restartFromMenu
 * @property {(playerIndex: number) => void} finishByTimeout
 * @property {(ms: number) => string} formatTime
 * @property {() => void} commitElapsedToCurrentPlayer
 * @property {(playerIndex: number, text: string) => void} finishWithWin
 * @property {(playerIndex: number) => void} handlePlayerLoss
 * @property {() => void} restartWithCurrentSettings
 * @property {() => void} runAIMove
 * @property {() => void} maybeTriggerAI
 * @property {(r: number, c: number) => void} handleCellClick
 */

const appWindow =
  /** @type {Window & { Vue?: any, MonexConstants?: any, MonexCore?: any, MonexTemplate?: string, MonexAI?: any }} */ (window);

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
const AI = appWindow.MonexAI;

createApp({
  template: appWindow.MonexTemplate,

  data() {
    return {
      menuOpen: false,
      newGameOpen: true,
      showRulesInMenu: false,
      aiThinking: false,

      symbolOptions: /** @type {string[]} */ (C.symbolOptions),
      colourOptions: /** @type {string[]} */ (C.colourOptions),
      aiLevels: /** @type {string[]} */ (C.aiLevels),

      settings: /** @type {MonexSettings} */ ({ ...C.defaultSettings }),
      players: /** @type {MonexPlayer[]} */ ([]),

      draftSettings: /** @type {MonexSettings} */ ({ ...C.defaultSettings }),
      draftPlayers: /** @type {DraftPlayer[]} */ ([]),

      board: /** @type {Board} */ ([]),
      currentPlayerIndex: 0,
      gameOver: false,
      gameStarted: false,
      message: "Set up a new game.",
      timerInterval: /** @type {number | null} */ (null),
      turnStartedAt: /** @type {number | null} */ (null),
      nowTick: Date.now(),
      lastMove: /** @type {BoardCell | null} */ (null),
      resultLine: /** @type {ResultLine | null} */ (null),
      moveHistory: /** @type {MonexSnapshot[]} */ ([]),
      redoHistory: /** @type {MonexSnapshot[]} */ ([])
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
    },

    /** @this {MonexApp} */
    canRedo() {
      return this.redoHistory.length > 0;
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
    /** @this {MonexApp} */
    initialiseEmptyBoard() {
      this.board = Core.createEmptyBoard(this.settings.boardSize);
    },

    /**
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {number | null}
     */
    getCellValue(r, c) {
      return Core.getCellValue(this.board, r, c);
    },

    /**
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {boolean}
     */
    isCellFilled(r, c) {
      return Core.isCellFilled(this.board, r, c);
    },

    /**
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     * @returns {Record<string, boolean>}
     */
    cellClasses(r, c) {
      return Core.cellClasses(this.lastMove, this.resultLine, r, c);
    },

    /** @this {MonexApp} */
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

    /** @this {MonexApp} */
    openMenu() {
      this.showRulesInMenu = false;
      this.menuOpen = true;
    },

    /** @this {MonexApp} */
    openNewGameSheet() {
      this.resetDraft();
      this.menuOpen = false;
      this.showRulesInMenu = false;
      this.newGameOpen = true;
    },

    /** @this {MonexApp} */
    restartFromMenu() {
      this.menuOpen = false;
      this.showRulesInMenu = false;
      this.restartWithCurrentSettings();
    },

    /**
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

    /** @this {MonexApp} */
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
      this.menuOpen = false;
      this.newGameOpen = false;
      this.showRulesInMenu = false;
      this.lastMove = null;
      this.resultLine = null;
      this.moveHistory = [];
      this.redoHistory = [];

      this.message = `${this.players[this.currentPlayerIndex].symbol} starts.`;

      this.startTurnClock();

      //AI trigger check
      this.maybeTriggerAI();
    },

    /** @this {MonexApp} */
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

    /** @this {MonexApp} */
    clearTimerInterval() {
      if (this.timerInterval !== null) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    /** @this {MonexApp} */
    startTurnClock() {
      this.clearTimerInterval();

      if (this.settings.timerMinutes <= 0) {
        this.turnStartedAt = null;
        return;
      }

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

    /** @this {MonexApp} */
    commitElapsedToCurrentPlayer() {
      if (this.settings.timerMinutes <= 0) return;
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
     * @this {MonexApp}
     * @param {number} index
     * @returns {string}
     */
    displayTimeForPlayer(index) {
      if (this.settings.timerMinutes <= 0) return "";

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
     * @this {MonexApp}
     * @param {number} r
     * @param {number} c
     */
    handleCellClick(r, c) {
      if (this.gameOver) return;
      if (!this.gameStarted) return;
      if (this.board[r]?.[c] !== null) return;
      if (this.aiThinking) return;

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
      this.redoHistory = [];
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

      //AI trigger check
      this.maybeTriggerAI();      
    },

    /** @this {MonexApp} */
    maybeTriggerAI() {
      if (!this.gameStarted) return;
      if (this.gameOver) return;

      const player = this.players[this.currentPlayerIndex];
      if (!player) return;
      if (!player.isAI) return;

      this.aiThinking = true;
      this.message = `${player.symbol} is thinking...`;

      // Small delay so UI updates first
      setTimeout(() => {
        this.runAIMove();
      }, 150);
    },

    /** @this {MonexApp} */
    runAIMove() {
      if (this.gameOver) {
        this.aiThinking = false;
        return;
      }

      try {
        const move = AI.chooseMove(
          this.board,
          this.settings,
          this.players,
          this.currentPlayerIndex
        );
        this.aiThinking = false;
        
        if (!move) {
          this.message = `The AI did not find a valid move, please complete their move`;
          return;
        }

        const validation = Core.validateMove(
          this.board,
          this.settings,
          this.players,
          this.currentPlayerIndex,
          move.r,
          move.c
        );

        if (this.board[move.r][move.c] !== null || !validation.ok) {
          this.message = `The AI did not find a valid move, please complete their move`;
          return;
        }

        this.handleCellClick(move.r, move.c);
      } finally {
        this.aiThinking = false;
      }
    },

    /**
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

    /** @this {MonexApp} */
    undoMove() {
      if (!this.canUndo) return;

      do {
        this.redoHistory.push(this.createSnapshot());
        const snapshot = this.moveHistory.pop();
        if (!snapshot) break;

        this.board = Core.cloneBoard(snapshot.board);
        this.currentPlayerIndex = snapshot.currentPlayerIndex;
        this.players = Core.clonePlayers(snapshot.players);
        this.gameOver = snapshot.gameOver;
        this.gameStarted = snapshot.gameStarted;
        this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
        this.resultLine = Core.cloneResultLine(snapshot.resultLine);

      } while (
        this.canUndo &&
        this.players[this.currentPlayerIndex]?.isAI
      );

      this.message = "Move undone.";

      if (this.gameStarted && !this.gameOver) {
        this.startTurnClock();
      } else {
        this.clearTimerInterval();
      }
    },

    /** @this {MonexApp} */
    redoMove() {
      if (!this.canRedo) return;

      const snapshot = this.redoHistory.pop();
      if (!snapshot) return;

      this.moveHistory.push(this.createSnapshot());

      this.board = Core.cloneBoard(snapshot.board);
      this.currentPlayerIndex = snapshot.currentPlayerIndex;
      this.players = Core.clonePlayers(snapshot.players);
      this.gameOver = snapshot.gameOver;
      this.gameStarted = snapshot.gameStarted;
      this.message = "Move redone.";
      this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
      this.resultLine = Core.cloneResultLine(snapshot.resultLine);

      if (this.gameStarted && !this.gameOver) {
        this.startTurnClock();
      } else {
        this.clearTimerInterval();
      }
    },

    /**
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
      //AI trigger check
      this.maybeTriggerAI();        
    },

    /**
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
      //AI trigger check
      this.maybeTriggerAI();        
    }
  }
}).mount("#app");