// ESLint vừa bắt lỗi code, vừa là "cảnh sát kiến trúc": các đường cấm trong CLAUDE.md mục 4
// được máy chặn ở đây thay vì chỉ dựa vào lời dặn.
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// Code thuần: luật chơi và tiện ích dùng chung. Phải chạy được trong Node, không cần trình duyệt.
const PURE_CODE = ['src/shared/**/*.ts', 'src/features/*/logic/**/*.ts'];
// Code hiển thị/khởi động chạy trong Phaser.
const VIEW_CODE = ['src/app/**/*.ts', 'src/features/*/view/**/*.ts', 'src/main.ts'];

// Đường cấm #10 (trả DEBT-005, đợt 3 — có tính năng thứ hai): một tính năng chỉ dùng tính năng khác qua
// index.ts của nó, không import vào ruột (logic/, view/). Mẫu khớp chuỗi import tương đối từ file trong
// src/features/<f>/ (index.ts) hoặc src/features/<f>/<logic|view>/.
const NO_CROSS_FEATURE = {
  group: ['../*/logic/**', '../*/view/**', '../../*/logic/**', '../../*/view/**'],
  message: 'Chỉ dùng tính năng khác qua index.ts của nó (CLAUDE.md đường cấm #10).',
};

const NO_FOCUSED_TESTS = ['it', 'test', 'describe'].map((object) => ({
  object,
  property: 'only',
  message: 'Cấm .only: CI sẽ chạy thiếu test (CLAUDE.md đường cấm #6).',
}));

const NO_HEX_COLORS = [
  {
    selector: 'Literal[raw=/^[\'"]#[0-9a-fA-F]{3,8}[\'"]$/]',
    message: 'Chỉ dùng màu từ PALETTE trong src/shared/palette.ts (đường cấm #4).',
  },
  {
    selector: 'Literal[raw=/^0x[0-9a-fA-F]{6}$/]',
    message: 'Chỉ dùng màu từ PALETTE trong src/shared/palette.ts (đường cấm #4).',
  },
];

export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', 'playwright-report/', 'test-results/', '.cache/'],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      'no-restricted-properties': ['error', ...NO_FOCUSED_TESTS],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_HEX_COLORS],
    },
  },
  {
    // Bảng màu là nơi duy nhất được viết mã hex.
    files: ['src/shared/palette.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: PURE_CODE,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'Code thuần không được dùng Phaser (đường cấm #1).' }],
          patterns: [
            {
              group: ['**/view/**', '**/app/**'],
              message: 'Code thuần không được phụ thuộc view/app.',
            },
            NO_CROSS_FEATURE,
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'performance', 'Date', 'localStorage', 'process'].map((name) => ({
          name,
          message: 'Code thuần phải lặp lại được: không dùng môi trường/đồng hồ (đường cấm #2).',
        })),
        ...['setTimeout', 'setInterval'].map((name) => ({
          name,
          message: 'Code thuần không hẹn giờ (đường cấm #2).',
        })),
      ],
      'no-restricted-properties': [
        'error',
        ...NO_FOCUSED_TESTS,
        {
          object: 'Math',
          property: 'random',
          message: 'Dùng RNG có seed trong src/shared/random.ts (đường cấm #2).',
        },
      ],
    },
  },
  {
    files: ['src/features/*/view/**/*.ts', 'src/features/*/index.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [NO_CROSS_FEATURE] }] },
  },
  {
    files: VIEW_CODE,
    rules: {
      'no-restricted-globals': [
        'error',
        ...['setTimeout', 'setInterval'].map((name) => ({
          name,
          message: 'Dùng this.time / this.tweens của Phaser (đường cấm #9).',
        })),
        { name: 'process', message: 'Không có process trong trình duyệt.' },
      ],
    },
  },
  prettier,
);
