const { createApp } = Vue;

createApp({
  template: `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-title">Monex</div>
          <div class="brand-subtitle">Make 4. Avoid 3.</div>
        </div>

        <button class="icon-button" @click="openSetupFromCurrent">
          ☰
        </button>
      </header>

      <main class="main">
        <section class="board-panel">
          <div
            class="board"
            :class="[
              'size-' + settings.boardSize,
              { 'board-locked': gameOver || !gameStarted }
            ]"
            :style="boardStyle"
          >
            <button
              v-for="cell in flatBoard"
              :key="cell.key"
              class="cell"
              :class="cellClasses(cell.r, cell.c)"
              :disabled="!gameStarted || gameOver || isCellFilled(cell.r, cell.c)"
              @click="handleCellClick(cell.r, cell.c)"
            >
              <span
                v-if="isCellFilled(cell.r, cell.c)"
                class="cell-symbol"
                :style="{ color: players[getCellValue(cell.r, cell.c)].colour }"
              >
                {{ players[getCellValue(cell.r, cell.c)].symbol }}
              </span>
            </button>
          </div>
        </section>

        <section class="status-panel">
          <div class="status-card">
            <div class="label">Clock</div>
            <div class="timers">
              <div
                v-for="(player, index) in players"
                :key="'timer-' + index"
                class="timer-chip"
                :class="{
                  active: index === currentPlayerIndex && !gameOver && gameStarted && !player.isOut,
                  out: player.isOut
                }"              >
                <span
                  class="timer-symbol"
                  :style="{ color: player.colour }"
                >
                  {{ player.symbol }}
                </span>
                  <span class="timer-value">
                    {{ player.isOut ? 'OUT' : displayTimeForPlayer(index) }}
                  </span>              
                </div>
            </div>
          </div>

          <div class="status-card">
            <div class="label">Message</div>
            <div class="message-area">
              {{ message }}
            </div>
          </div>

          <div class="status-card rules-card">
            <div class="label">Rules</div>
            <div class="rules-text">
              Make 4 in a row to win. If your move makes 3 in a row, you lose —
              unless that same move also makes 4, which counts as a win.
              <template v-if="settings.playerCount === 3">
                In 3-player mode, you must block an immediate winning move for the
                next player, unless you can win now or every blocking move would
                make you lose by forming 3.
              </template>
            </div>
          </div>

          <div class="action-row action-row-3">
            <button class="primary-button" @click="openSetup = true">
              New game
            </button>
            <button class="secondary-button" @click="restartWithCurrentSettings">
              Restart
            </button>
            <button
              class="secondary-button"
              :disabled="!canUndo"
              @click="undoMove"
            >
              Undo
            </button>
          </div>
        </section>
      </main>

      <div v-if="openSetup" class="overlay" @click.self="openSetup = false">
        <section class="sheet">
          <div class="sheet-header">
            <div>
              <div class="sheet-title">New game</div>
              <div class="sheet-subtitle">Configure players, board and timer</div>
            </div>
            <button class="icon-button" @click="openSetup = false">✕</button>
          </div>

          <div class="setup-group">
            <div class="group-title">Players</div>
            <div class="segmented">
              <button
                v-for="count in [2, 3]"
                :key="'pc-' + count"
                class="segment"
                :class="{ active: draftSettings.playerCount === count }"
                @click="setDraftPlayerCount(count)"
              >
                {{ count }} players
              </button>
            </div>
          </div>

          <div class="setup-group">
            <div class="group-title">Board size</div>
            <div class="segmented">
              <button
                v-for="size in [5, 6]"
                :key="'bs-' + size"
                class="segment"
                :class="{ active: draftSettings.boardSize === size }"
                @click="draftSettings.boardSize = size"
              >
                {{ size }} × {{ size }}
              </button>
            </div>
          </div>

          <div class="setup-group">
            <div class="group-title">Clock per player</div>
            <div class="segmented segmented-wrap">
              <button
                v-for="minutes in [1, 2, 3, 5, 10]"
                :key="'tm-' + minutes"
                class="segment"
                :class="{ active: draftSettings.timerMinutes === minutes }"
                @click="draftSettings.timerMinutes = minutes"
              >
                {{ minutes }} min
              </button>
            </div>
          </div>

          <div class="setup-group">
            <div class="group-title">AI level</div>
            <div class="segmented segmented-wrap">
              <button
                v-for="level in aiLevels"
                :key="'ai-' + level"
                class="segment"
                :class="{ active: draftSettings.aiLevel === level }"
                @click="draftSettings.aiLevel = level"
              >
                {{ level }}
              </button>
            </div>
            <div class="help-text">Placeholder only for now.</div>
          </div>

          <div
            v-for="(player, index) in draftPlayers"
            :key="'draft-player-' + index"
            class="player-card"
          >
            <div class="player-card-header">
              <div class="player-preview">
                <span
                  class="player-preview-symbol"
                  :style="{ color: player.colour }"
                >
                  {{ player.symbol }}
                </span>
                <span class="player-preview-meta">Player {{ index + 1 }}</span>
              </div>

              <div class="segmented ai-toggle">
                <button
                  class="segment"
                  :class="{ active: !player.isAI }"
                  @click="player.isAI = false"
                >
                  Human
                </button>
                <button
                  class="segment"
                  :class="{ active: player.isAI }"
                  @click="player.isAI = true"
                >
                  AI
                </button>
              </div>
            </div>

            <div class="picker-block">
              <div class="picker-label">Symbol</div>
              <div class="option-grid symbol-grid">
                <button
                  v-for="symbol in symbolOptions"
                  :key="'symbol-' + index + '-' + symbol"
                  class="option-chip symbol-chip"
                  :class="{ active: player.symbol === symbol }"
                  @click="player.symbol = symbol"
                >
                  {{ symbol }}
                </button>
              </div>
            </div>

            <div class="picker-block">
              <div class="picker-label">Colour</div>
              <div class="option-grid colour-grid">
                <button
                  v-for="colour in colourOptions"
                  :key="'colour-' + index + '-' + colour"
                  class="colour-swatch"
                  :class="{ active: player.colour === colour }"
                  :style="{ backgroundColor: colour }"
                  @click="player.colour = colour"
                ></button>
              </div>
            </div>
          </div>

          <div class="help-text">
            Duplicate symbols or colours are allowed, but clearer games usually use different ones.
          </div>

          <div class="sheet-actions">
            <button class="secondary-button" @click="openSetup = false">
              Cancel
            </button>
            <button class="primary-button" @click="startNewGameFromDraft">
              Start game
            </button>
          </div>
        </section>
      </div>
    </div>
  `,

  data() {
    return {
      symbolOptions: ["✕", "◯", "△", "□", "◆", "●", "★", "✦", "⬟", "◇"],
      colourOptions: [
        "#d62828",
        "#1d4ed8",
        "#15803d",
        "#7c3aed",
        "#ea580c",
        "#0891b2",
        "#c026d3",
        "#374151",
        "#111827",
        "#b45309"
      ],
      aiLevels: ["Easy", "Medium", "Hard"],

      settings: {
        playerCount: 2,
        boardSize: 5,
        timerMinutes: 3,
        aiLevel: "Easy"
      },

      players: [],

      draftSettings: {
        playerCount: 2,
        boardSize: 5,
        timerMinutes: 3,
        aiLevel: "Easy"
      },

      draftPlayers: [],

      board: [],
      currentPlayerIndex: 0,
      openSetup: true,
      gameOver: false,
      gameStarted: false,
      message: "Set up a new game.",
      timerInterval: null,
      turnStartedAt: null,
      nowTick: Date.now(),
      lastMove: null,
      resultLine: null,
      moveHistory: []
    };
  },

  computed: {
    currentPlayer() {
      return this.players[this.currentPlayerIndex] || {
        symbol: "?",
        colour: "#000000",
        isAI: false
      };
    },

    flatBoard() {
      const cells = [];
      for (let r = 0; r < this.settings.boardSize; r++) {
        for (let c = 0; c < this.settings.boardSize; c++) {
          cells.push({
            r,
            c,
            key: `${r}-${c}`
          });
        }
      }
      return cells;
    },

    boardStyle() {
      return {
        gridTemplateColumns: `repeat(${this.settings.boardSize}, 1fr)`,
        gridTemplateRows: `repeat(${this.settings.boardSize}, 1fr)`
      };
    },

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
    createDefaultPlayers(count) {
      const defaults = [
        { symbol: "✕", colour: "#d62828", isAI: false },
        { symbol: "◯", colour: "#1d4ed8", isAI: false },
        { symbol: "△", colour: "#15803d", isAI: false }
      ];

    return defaults.slice(0, count).map(player => ({
      ...player,
      timeLeftMs: 0,
      timerStarted: false,
      isOut: false
    }));
    },
    getActivePlayerIndices() {
      const indices = [];
      for (let i = 0; i < this.players.length; i++) {
        if (!this.players[i].isOut) indices.push(i);
      }
      return indices;
    },

    getNextActivePlayerIndex(fromIndex) {
      if (!this.players.length) return 0;

      let idx = fromIndex;
      for (let step = 0; step < this.players.length; step++) {
        idx = (idx + 1) % this.players.length;
        if (!this.players[idx].isOut) return idx;
      }

      return fromIndex;
    },
    initialiseEmptyBoard() {
      this.board = Array.from({ length: this.settings.boardSize }, () =>
        Array.from({ length: this.settings.boardSize }, () => null)
      );
    },

    getCellValue(r, c) {
      return this.board?.[r]?.[c] ?? null;
    },

    isCellFilled(r, c) {
      return this.getCellValue(r, c) !== null;
    },

    isLastMove(r, c) {
      return !!this.lastMove && this.lastMove.r === r && this.lastMove.c === c;
    },
    cellClasses(r, c) {
      return {
        "last-move": this.isLastMove(r, c) && !this.isResultCell(r, c),
        "win-cell": this.isResultCellOfType(r, c, "win"),
        "loss-cell": this.isResultCellOfType(r, c, "loss")
      };
    },

    isResultCell(r, c) {
      return this.resultLine?.cells?.some(cell => cell.r === r && cell.c === c) ?? false;
    },

    isResultCellOfType(r, c, type) {
      return this.resultLine?.type === type &&
        this.resultLine.cells.some(cell => cell.r === r && cell.c === c);
    },    

    resetDraft() {
      this.draftSettings = {
        playerCount: this.settings.playerCount,
        boardSize: this.settings.boardSize,
        timerMinutes: this.settings.timerMinutes,
        aiLevel: this.settings.aiLevel
      };

      this.draftPlayers = this.createDefaultPlayers(this.draftSettings.playerCount);

      if (this.players.length) {
        for (let i = 0; i < Math.min(this.players.length, this.draftPlayers.length); i++) {
          this.draftPlayers[i].symbol = this.players[i].symbol;
          this.draftPlayers[i].colour = this.players[i].colour;
          this.draftPlayers[i].isAI = this.players[i].isAI;
        }
      }
    },

    openSetupFromCurrent() {
      this.resetDraft();
      this.openSetup = true;
    },

    setDraftPlayerCount(count) {
      const oldPlayers = this.draftPlayers.slice();
      this.draftSettings.playerCount = count;
      this.draftPlayers = this.createDefaultPlayers(count);

      for (let i = 0; i < Math.min(oldPlayers.length, this.draftPlayers.length); i++) {
        this.draftPlayers[i].symbol = oldPlayers[i].symbol;
        this.draftPlayers[i].colour = oldPlayers[i].colour;
        this.draftPlayers[i].isAI = oldPlayers[i].isAI;
      }
    },

    startNewGameFromDraft() {
      this.settings = {
        ...this.draftSettings
      };

      const newPlayers = this.draftPlayers.map(player => ({
        symbol: player.symbol,
        colour: player.colour,
        isAI: player.isAI,
        timeLeftMs: this.draftSettings.timerMinutes * 60 * 1000,
        timerStarted: false,
        isOut: false
      }));

      this.players = this.shuffleArray(newPlayers);

      this.board = Array.from({ length: this.settings.boardSize }, () =>
        Array.from({ length: this.settings.boardSize }, () => null)
      );

      this.currentPlayerIndex = 0;      this.gameOver = false;
      this.gameStarted = true;
      this.openSetup = false;
      this.lastMove = null;
      this.moveHistory = [];
      this.resultLine = null;
      this.message = this.players.some(p => p.isAI)
        ? `${this.players[this.currentPlayerIndex].symbol} starts. AI is not implemented yet.`
        : `${this.players[this.currentPlayerIndex].symbol} starts.`;

      this.startTurnClock();
    },

    restartWithCurrentSettings() {
      this.draftSettings = { ...this.settings };
      this.draftPlayers = this.players.length
        ? this.players.map(p => ({
            symbol: p.symbol,
            colour: p.colour,
            isAI: p.isAI,
            timeLeftMs: 0
          }))
        : this.createDefaultPlayers(this.settings.playerCount);

      this.startNewGameFromDraft();
    },

    clearTimerInterval() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    startTurnClock() {
      this.clearTimerInterval();
      this.turnStartedAt = Date.now();
      this.nowTick = Date.now();

      this.timerInterval = setInterval(() => {
        if (!this.gameStarted || this.gameOver || !this.players.length) return;

        this.nowTick = Date.now();

        const player = this.players[this.currentPlayerIndex];
        if (player.isOut) return;
        if (!player.timerStarted) return;

        const elapsed = this.nowTick - this.turnStartedAt;
        const remaining = player.timeLeftMs - elapsed;

        if (remaining <= 0) {
          player.timeLeftMs = 0;
          this.turnStartedAt = this.nowTick;
          this.finishByTimeout(this.currentPlayerIndex);
        }
      }, 100);
    },

    commitElapsedToCurrentPlayer() {
      if (!this.players.length || this.turnStartedAt === null) return;

      const player = this.players[this.currentPlayerIndex];
      const now = Date.now();

      if (player.timerStarted) {
        const elapsed = now - this.turnStartedAt;
        player.timeLeftMs = Math.max(0, player.timeLeftMs - elapsed);
      }

      this.turnStartedAt = now;
      this.nowTick = now;
    },

    displayTimeForPlayer(index) {
      if (!this.players[index]) return "0:00";

      const player = this.players[index];
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

    formatTime(ms) {
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.max(0, totalSeconds % 60);
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    },

    handleCellClick(r, c) {
      if (this.gameOver) return;
      if (!this.gameStarted) return;
      if (this.board[r][c] !== null) return;

      const legalResult = this.validateMove(r, c);

      if (!legalResult.ok) {
        this.message = legalResult.reason;
        return;
      }

      this.moveHistory.push(this.createSnapshot());
      this.commitElapsedToCurrentPlayer();
      this.resultLine = null;

      const playerIndex = this.currentPlayerIndex;
      this.board[r][c] = playerIndex;
      this.players[playerIndex].timerStarted = true;
      this.lastMove = { r, c };

      const winningLine = this.findLineOfLength(playerIndex, 4);
      const losingLine = this.findLineOfLength(playerIndex, 3);

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

      if (this.isBoardFull()) {
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = "Draw. The board is full.";
        return;
      }

      this.currentPlayerIndex = this.getNextActivePlayerIndex(this.currentPlayerIndex);
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      this.message = `${nextPlayer.symbol} to move.`;
    },

    createSnapshot() {
      return {
        board: this.board.map(row => [...row]),
        currentPlayerIndex: this.currentPlayerIndex,
        players: this.players.map(player => ({
          ...player
        })),
        gameOver: this.gameOver,
        gameStarted: this.gameStarted,
        message: this.message,
        lastMove: this.lastMove ? { ...this.lastMove } : null,
        resultLine: this.resultLine
          ? {
              type: this.resultLine.type,
              cells: this.resultLine.cells.map(cell => ({ ...cell }))
            }
          : null
      };
    },

    undoMove() {
      if (!this.canUndo) return;

      const snapshot = this.moveHistory.pop();
      this.board = snapshot.board.map(row => [...row]);
      this.currentPlayerIndex = snapshot.currentPlayerIndex;
      this.players = snapshot.players.map(player => ({ ...player }));
      this.gameOver = snapshot.gameOver;
      this.gameStarted = snapshot.gameStarted;
      this.message = "Move undone.";
      this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
      this.resultLine = snapshot.resultLine
        ? {
            type: snapshot.resultLine.type,
            cells: snapshot.resultLine.cells.map(cell => ({ ...cell }))
          }
        : null;

      if (this.gameStarted && !this.gameOver) {
        this.startTurnClock();
      } else {
        this.clearTimerInterval();
      }
    },

    validateMove(r, c) {
      if (this.settings.playerCount !== 3) {
        return { ok: true };
      }

      const current = this.currentPlayerIndex;
      if (this.players[current].isOut) {
        return { ok: false, reason: "This player has been eliminated." };
      }
      const next = this.getNextActivePlayerIndex(current);

      const selfWinningMoves = this.findWinningMovesForPlayer(current);
      if (selfWinningMoves.length > 0) {
        return { ok: true };
      }

      const nextWinningMoves = this.findWinningMovesForPlayer(next);
      if (nextWinningMoves.length === 0) {
        return { ok: true };
      }

      const isBlockingMove = nextWinningMoves.some(move => move.r === r && move.c === c);
      if (isBlockingMove) {
        return { ok: true };
      }

      const safeBlockingMoves = nextWinningMoves.filter(move => {
        return !this.moveWouldCauseLoss(current, move.r, move.c);
      });

      if (safeBlockingMoves.length === 0) {
        return { ok: true };
      }

      return {
        ok: false,
        reason: "You must block the next player's winning move unless you can win now or every block would lose by 3."
      };
    },

    finishWithWin(playerIndex, text) {
      this.gameOver = true;
      this.clearTimerInterval();
      const player = this.players[playerIndex];
      this.message = `${player.symbol} ${text}`;
    },

    finishWithLoss(playerIndex, text) {
      this.gameOver = true;
      this.clearTimerInterval();
      const player = this.players[playerIndex];
      this.message = `${player.symbol} ${text}`;
    },

    handlePlayerLoss(playerIndex) {
      const player = this.players[playerIndex];

      if (this.players.length === 2) {
        const winnerIndex = this.getNextActivePlayerIndex(playerIndex);
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} loses by making 3 in a row. ${this.players[winnerIndex].symbol} wins.`;
        return;
      }

      player.isOut = true;

      const activePlayers = this.getActivePlayerIndices();

      if (activePlayers.length === 1) {
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} loses by making 3 in a row. ${this.players[activePlayers[0]].symbol} wins.`;
        return;
      }

      this.currentPlayerIndex = this.getNextActivePlayerIndex(playerIndex);
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      this.message = `${player.symbol} is out for making 3 in a row. ${nextPlayer.symbol} to move.`;
    },

    finishByTimeout(playerIndex) {
      const player = this.players[playerIndex];

      if (this.players.length === 2) {
        const winnerIndex = this.getNextActivePlayerIndex(playerIndex);
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} ran out of time. ${this.players[winnerIndex].symbol} wins.`;
        return;
      }

      player.isOut = true;

      const activePlayers = this.getActivePlayerIndices();

      if (activePlayers.length === 1) {
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = `${player.symbol} ran out of time. ${this.players[activePlayers[0]].symbol} wins.`;
        return;
      }

      this.currentPlayerIndex = this.getNextActivePlayerIndex(playerIndex);
      this.turnStartedAt = Date.now();
      this.nowTick = this.turnStartedAt;

      const nextPlayer = this.players[this.currentPlayerIndex];
      this.message = `${player.symbol} ran out of time and is out. ${nextPlayer.symbol} to move.`;
    },

    shuffleArray(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    isBoardFull() {
      return this.board.every(row => row.every(cell => cell !== null));
    },

    moveWouldCauseLoss(playerIndex, r, c) {
      if (this.board[r][c] !== null) return false;

      this.board[r][c] = playerIndex;
      const madeFour = this.hasLineOfLength(playerIndex, 4);
      const madeThree = this.hasLineOfLength(playerIndex, 3);
      this.board[r][c] = null;

      if (madeFour) return false;
      return madeThree;
    },

    findWinningMovesForPlayer(playerIndex) {
      const moves = [];

      for (let r = 0; r < this.settings.boardSize; r++) {
        for (let c = 0; c < this.settings.boardSize; c++) {
          if (this.board[r][c] !== null) continue;

          this.board[r][c] = playerIndex;
          const isWinningMove = this.hasLineOfLength(playerIndex, 4);
          this.board[r][c] = null;

          if (isWinningMove) {
            moves.push({ r, c });
          }
        }
      }

      return moves;
    },

    hasLineOfLength(playerIndex, targetLength) {
      return !!this.findLineOfLength(playerIndex, targetLength);
    },
    findLineOfLength(playerIndex, targetLength) {
      const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1]
      ];

      for (let r = 0; r < this.settings.boardSize; r++) {
        for (let c = 0; c < this.settings.boardSize; c++) {
          if (this.board[r][c] !== playerIndex) continue;

          for (const [dr, dc] of dirs) {
            const prevR = r - dr;
            const prevC = c - dc;

            if (this.inBounds(prevR, prevC) && this.board[prevR][prevC] === playerIndex) {
              continue;
            }

            const cells = [];
            let rr = r;
            let cc = c;

            while (this.inBounds(rr, cc) && this.board[rr][cc] === playerIndex) {
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

    inBounds(r, c) {
      return (
        r >= 0 &&
        c >= 0 &&
        r < this.settings.boardSize &&
        c < this.settings.boardSize
      );
    }
  }
}).mount("#app");