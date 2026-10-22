import { AUTO, Game, Scale, type Types } from 'phaser';
import { PALETTE } from '../shared/palette';
import { SCENES } from './scenes';

/** Khung dọc 360×640, co giãn vừa màn hình điện thoại hoặc máy tính. */
export function createGame(parent: string): Game {
  const config: Types.Core.GameConfig = {
    type: AUTO,
    parent,
    width: 360,
    height: 640,
    backgroundColor: PALETTE.ink,
    // Tắt làm mịn khi phóng to để pixel giữ nét.
    pixelArt: true,
    scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
    scene: SCENES,
  };
  return new Game(config);
}
