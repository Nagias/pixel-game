// Điểm khởi động duy nhất của game.
import { createGame } from './app/createGame';
import { installTestBridge } from './app/testBridge';
import { PALETTE } from './shared/palette';

document.body.style.backgroundColor = PALETTE.ink;
installTestBridge(window);
createGame('game');
