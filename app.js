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
              { 'board-locked': gameOver }
            ]"
            :style="boardStyle"
          >
            <button
              v-for="cell in flatBoard"
              :key="cell.key"
              class="cell"
              :disabled="gameOver || isCellFilled(cell.r, cell.c)"
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
          <div class="status-card next-turn-card">
            <div class="label">Next turn</div>
            <div class="turn-line" v-if="!gameOver">
              <span
                class="turn-symbol"
                :style="{ color: currentPlayer.colour }"
              >
                {{ currentPlayer.symbol }}
              </span>
              <span class="turn-meta">
                {{ currentPlayer.isAI ? 'AI (placeholder)' : 'Human' }}
              </span>
            </div>
            <div class="turn-line" v-else>
              <span class="game-over-label">Game over</span>
            </div>
          </div>

          <div class="status-card">
            <div class="label">Clock</div>
            <div class="timers">
              <div
                v-for="(player, index) in players"
                :key="'timer-' + index"
                class="timer-chip"
                :class="{ active: index === currentPlayerIndex && !gameOver }"
              >
                <span
                  class="timer-symbol"
                  :style="{ color: player.colour }"
                >
                  {{ player.symbol }}
                </span>
                <span class="timer-value">{{ formatTime(player.timeLeftMs) }}</span>
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

          <div class="action-row">
            <button class="primary-button" @click="openSetup = true">
              New game
            </button>
            <button class="secondary-button" @click="restartWithCurrentSettings">
              Restart
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
      message: "Set up a new game.",
      timerInterval: null,
      turnStartedAt: null
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
        timeLeftMs: 0
      }));
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

      this.players = this.draftPlayers.map(player => ({
        symbol: player.symbol,
        colour: player.colour,
        isAI: player.isAI,
        timeLeftMs: this.draftSettings.timerMinutes * 60 * 1000
      }));

      this.board = Array.from({ length: this.settings.boardSize }, () =>
        Array.from({ length: this.settings.boardSize }, () => null)
      );

      this.currentPlayerIndex = 0;
      this.gameOver = false;
      this.openSetup = false;
      this.message = this.players.some(p => p.isAI)
        ? "AI is not implemented yet. AI players are placeholders and can still be tapped manually."
        : "Game started.";

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

      this.timerInterval = setInterval(() => {
        if (this.gameOver || !this.players.length) return;

        const now = Date.now();
        const elapsed = now - this.turnStartedAt;
        const player = this.players[this.currentPlayerIndex];
        const remaining = player.timeLeftMs - elapsed;

        if (remaining <= 0) {
          player.timeLeftMs = 0;
          this.turnStartedAt = now;
          this.finishByTimeout(this.currentPlayerIndex);
        }
      }, 100);
    },

    commitElapsedToCurrentPlayer() {
      if (!this.players.length || this.turnStartedAt === null) return;
      const now = Date.now();
      const elapsed = now - this.turnStartedAt;
      const player = this.players[this.currentPlayerIndex];
      player.timeLeftMs = Math.max(0, player.timeLeftMs - elapsed);
      this.turnStartedAt = now;
    },

    formatTime(ms) {
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.max(0, totalSeconds % 60);
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    },

    handleCellClick(r, c) {
      if (this.gameOver) return;
      if (this.board[r][c] !== null) return;

      const legalResult = this.validateMove(r, c);

      if (!legalResult.ok) {
        this.message = legalResult.reason;
        return;
      }

      this.commitElapsedToCurrentPlayer();

      const playerIndex = this.currentPlayerIndex;
      this.board[r][c] = playerIndex;

      const madeFour = this.hasLineOfLength(playerIndex, 4);
      const madeThree = this.hasLineOfLength(playerIndex, 3);

      if (madeFour) {
        this.finishWithWin(playerIndex, "wins by making 4 in a row.");
        return;
      }

      if (madeThree) {
        this.finishWithLoss(
          playerIndex,
          "loses by making 3 in a row."
        );
        return;
      }

      if (this.isBoardFull()) {
        this.gameOver = true;
        this.clearTimerInterval();
        this.message = "Draw. The board is full.";
        return;
      }

      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      this.turnStartedAt = Date.now();

      const nextPlayer = this.players[this.currentPlayerIndex];
      this.message = `${nextPlayer.symbol} to move.`;
    },

    validateMove(r, c) {
      if (this.settings.playerCount !== 3) {
        return { ok: true };
      }

      const current = this.currentPlayerIndex;
      const next = (current + 1) % this.players.length;

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
        reason: `You must block the next player's winning move unless you can win now or every block would lose by 3.`
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

    finishByTimeout(playerIndex) {
      this.gameOver = true;
      this.clearTimerInterval();
      const player = this.players[playerIndex];
      this.message = `${player.symbol} ran out of time.`;
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

            let len = 0;
            let rr = r;
            let cc = c;

            while (this.inBounds(rr, cc) && this.board[rr][cc] === playerIndex) {
              len++;
              rr += dr;
              cc += dc;
            }

            if (len >= targetLength) {
              return true;
            }
          }
        }
      }

      return false;
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