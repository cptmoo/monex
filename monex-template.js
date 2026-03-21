window.MonexTemplate = `
  <div class="app-shell">
    <header class="topbar">
      <button class="icon-button" @click="openMenu">
        ☰
      </button>

      <div class="topbar-spacer"></div>

      <div class="topbar-actions">
        <button
          class="icon-button nav-button"
          :disabled="!canUndo"
          @click="undoMove"
        >
          ◀
        </button>

        <button
          class="icon-button nav-button"
          :disabled="!canRedo"
          @click="redoMove"
        >
          ▶
        </button>
      </div>
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
          <div class="timers">
            <div
              v-for="(player, index) in players"
              :key="'timer-' + index"
              class="timer-chip"
              :class="{
                active: index === currentPlayerIndex && !gameOver && gameStarted && !player.isOut,
                out: player.isOut
              }"
            >
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
          <div class="message-area">
            {{ message }}
          </div>
        </div>
      </section>
    </main>

    <div v-if="menuOpen" class="overlay menu-overlay" @click.self="menuOpen = false">
      <section class="sheet menu-sheet">
        <div class="sheet-header">
          <div class="sheet-title">Monex</div>
          <button class="icon-button" @click="menuOpen = false">✕</button>
        </div>

        <div class="sheet-actions menu-actions">
          <button class="primary-button" @click="openNewGameSheet">
            New game
          </button>
          <button class="secondary-button" @click="restartFromMenu">
            Restart
          </button>
          <button class="secondary-button" @click="showRulesInMenu = !showRulesInMenu">
            Rules
          </button>
        </div>

        <div v-if="showRulesInMenu" class="setup-group">
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
      </section>
    </div>

    <div v-if="newGameOpen" class="overlay" @click.self="newGameOpen = false">
      <section class="sheet">
        <div class="sheet-header">
          <div class="sheet-title">New game</div>
          <button class="icon-button" @click="newGameOpen = false">✕</button>
        </div>

        <div class="setup-grid">
            <div class="setup-group compact-group">
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

            <div class="setup-group compact-group">
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

            <div class="setup-group compact-group">
                <div class="group-title">Clock</div>
                <div class="select-wrap">
                <select v-model="draftSettings.timerMinutes" class="select-input">
                    <option :value="0">No clock</option>
                    <option :value="1">1 min</option>
                    <option :value="2">2 min</option>
                    <option :value="3">3 min</option>
                    <option :value="5">5 min</option>
                    <option :value="10">10 min</option>
                </select>
                </div>
            </div>

            <div class="setup-group compact-group">
                <div class="group-title">AI level</div>
                <div class="select-wrap">
                <select v-model="draftSettings.aiLevel" class="select-input">
                    <option
                    v-for="level in aiLevels"
                    :key="'ai-' + level"
                    :value="level"
                    >
                    {{ level }}
                    </option>
                </select>
                </div>
                <div class="help-text">Placeholder only for now.</div>
            </div>
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

        <div class="sheet-actions">
          <button class="secondary-button" @click="newGameOpen = false">
            Cancel
          </button>
          <button class="primary-button" @click="startNewGameFromDraft">
            Start game
          </button>
        </div>
      </section>
    </div>
  </div>
`;