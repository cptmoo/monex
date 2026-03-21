// @ts-check

/**
 * A single board coordinate.
 * @typedef {Object} BoardCell
 * @property {number} r
 * @property {number} c
 */


/**
 * The game board: a square grid storing player indices or null.
 * board[r][c] = playerIndex | null
 * 
 * @typedef {(number | null)[][]} Board
 */

/**
 * A plain game state used for AI search and simulation.
 * @typedef {Object} MonexGameState
 * @property {Board} board
 * @property {MonexSettings} settings
 * @property {MonexPlayer[]} players
 * @property {number} currentPlayerIndex
 * @property {boolean} gameOver
 * @property {number | null} winnerIndex
 * @property {BoardCell | null} lastMove
 * @property {ResultLine | null} resultLine
 */

/**
 * A highlighted result line on the board.
 * @typedef {Object} ResultLine
 * @property {"win"|"loss"} type
 * @property {BoardCell[]} cells
 */

/**
 * A player in an active game.
 * @typedef {Object} MonexPlayer
 * @property {string} symbol
 * @property {string} colour
 * @property {boolean} isAI
 * @property {number} timeLeftMs
 * @property {boolean} timerStarted
 * @property {boolean} isOut
 */

/**
 * Draft player data used in setup before the live game starts.
 * @typedef {Object} DraftPlayer
 * @property {string} symbol
 * @property {string} colour
 * @property {boolean} isAI
 */

/**
 * Game settings.
 * @typedef {Object} MonexSettings
 * @property {number} playerCount
 * @property {number} boardSize
 * @property {number} timerMinutes
 * @property {string} aiLevel
 */

/**
 * Undo snapshot.
 * @typedef {Object} MonexSnapshot
 * @property {((number|null)[][])} board
 * @property {number} currentPlayerIndex
 * @property {MonexPlayer[]} players
 * @property {boolean} gameOver
 * @property {boolean} gameStarted
 * @property {string} message
 * @property {BoardCell | null} lastMove
 * @property {ResultLine | null} resultLine
 */