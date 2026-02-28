# Multi-Agent Debate with GitHub Copilot SDK

この repository は複数のエージェント（AI アクター）を協調させて議論・ディベートを行うアプリケーションを実装しています。GitHub Copilot SDK を統合し、複数の AI エージェントが同期して議論を進める仕組みを提供します。

## 主な機能

- **Agent インターフェース** (`src/agent.ts`): エージェントの基本契約を定義。
- **CopilotAgent** (`src/copilotAdapter.ts`): GitHub Copilot SDK との実装（完成済み）。
  - シングルトン `CopilotClient` でリソース効率化。
  - 各エージェント。本クラスを使用することで、ログイン済み Copilot CLI を通じて実際の LLM 応答を取得できます。
- **MockAgent** (`src/copilotAdapter.ts`): ローカル開発・テスト用のモック実装。決定的な応答を生成するため、テストに向いています。
- **Orchestrator** (`src/orchestrator.ts`): 複数エージェントをラウンド制で協調。各ラウンドで全エージェントが順番に応答を追加します。
- **CLI デモ** (`src/index.ts`): 3 つのエージェント（Alice：提案者、Bob：反対者、Carol：調停者）が議題について議論します。

## インストール

```bash
# 依存をインストール（Node 20 以上が必要）
npm install
```

## 実行

### MockAgent を使用したデモ（すぐに実行可能）
```bash
npm run build
node dist/src/index.js
```
出力: タイムスタンプ付きの議論の書き起こし（3 ラウンド、3 エージェント）

### CopilotAgent を使用したデモ（Copilot CLI 認証必須）

1. Copilot CLI をインストール・ログイン:
```bash
# WSL or Linux/macOS
npm install -g @github/copilot
copilot login
# またはローカルインストール版:
npx copilot login
```

2. `src/index.ts` の import と agent インスタンスを修正:
```typescript
import { CopilotAgent } from "./copilotAdapter.js";
// ...
const agents = [
  new CopilotAgent("a1", "Alice", "提案者"),
  new CopilotAgent("a2", "Bob", "反対者"),
  new CopilotAgent("a3", "Carol", "調停者"),
];
```

3. ビルドして実行:
```bash
npm run build
node dist/src/index.js
```

## テスト

```bash
npm test
```

Jest でオーケストレータとエージェントの動作を検証します。

## 技術詳細

### アーキテクチャ
- **タイプセーフ**: TypeScript で型セーフな実装。
- **プラガブル設計**: Agent インターフェースを実装すれば、任意の LLM (Copilot、OpenAI、Anthropic など）を接続可能。
- **ESM モジュール**: TypeScript を ESM にコンパイル。`@github/copilot-sdk` の ESM exports に対応。

### CopilotAgent の実装
- **動的 import**: `@github/copilot-sdk` を動的に読み込み、ランタイムでの モジュール解決エラーを回避。
- **シングルトン Client**: 複数エージェント間で CopilotClient を共有し、複数の CLI プロセス起動を防止。
- **per-Agent Session**: 各エージェントは独立したセッションを保持し、context を独立して管理。
- **sendAndWait**: `session.sendAndWait()` でエージェントの応答を同期的に取得。

### 環境変数
- `COPILOT_MODEL`: 使用するモデル指定（デフォルト: `gpt-5-mini`）。
- `COPILOT_GITHUB_TOKEN`: ギットハブ トークン（オプション；CLI のログイン状態から自動取得）。

## 構成図

```
Orchestrator (オーケストレータ)
  ├─ Agent 1 (Alice - CopilotAgent or MockAgent)
  │   └─ Session（Copilot SDK 経由）
  ├─ Agent 2 (Bob)
  │   └─ Session
  └─ Agent 3 (Carol)
      └─ Session

各ラウンド：
  → Alice.reply(history) → Session.sendAndWait() → Copilot CLI → LLM 応答
  → Bob.reply(history)
  → Carol.reply(history)
  → 次ラウンド
```

## 制限事項と既知の問題

### Copilot CLI の sqlite3 依存
CopilotAgent で実際の Copilot CLI を起動する場合、CLI が内部で `node:sqlite` モジュールを要求します。Node.js ネイティブ sqlite3 バインディングが必要になる場合があります。この場合：
- **回避策**: MockAgent を使用するか、別途 sqlite3 環境を整備。
- **推奨**: 開発・テスト段階では MockAgent、本番環境では環境構築後に CopilotAgent に切り替え。

## 今後の拡張可能性

- 議論ルール強化: ターンタイムアウト、発言長さ制限、スコアリング。
- 最終要約エージェント: 議論内容を自動要約。
- REST API: HTTP エンドpoint を追加してウェブアプリに統合。
- ストレージ: 議論トランスクリプトをデータベースに保存。

## ライセンス

MIT
