# AI-103 QUEST

日本語の資格学習 RPG。Node.js 24 と組み込み SQLite を使った、単一利用者向け Web アプリです。外部 API キー、外部 DB、npm の実行時依存パッケージは不要です。

## 起動

```sh
cd /workspace/codex
npm ci --ignore-scripts
npm test
npm start
```

標準ポートは `3000`。`PORT`・`HOST`・`QUEST_DB` で変更できます。開発時は `npm run dev` でサーバーを再起動します。フロントエンドはビルド不要です。

## 使い方

- 「冒険の拠点」から通常戦を始め、選択肢を選んで回答を確定します。
- ヒントは MP を 1 消費し、その問題を支援ありとして記録します。
- 「クエスト」で分野・問題数・モードを指定できます。ボスは実時間 5 分、ヒントなしです。
- 空回答は回答数に含まれますが、HP・習熟度・経験値を変更しません。
- 宿屋への帰還は通常戦を終了して HP・MP を回復します。単なる再読み込みやタブ閉鎖では冒険を終了しません。
- 「知識の図鑑」で学習状態、「冒険の記録」で結果・解説を確認できます。
- 「設定・データ」で問題パックを読み込み、バックアップの保存・復元、監査ログの保存ができます。

初期データは **サンプル問題** です。実際の AI-103 試験範囲への準拠・公式教材であることは保証していません。通常戦・分野ボス・最終ボス・診断の各プールに10問ずつあります。

## 保存

`data/quest.sqlite` に学習状態・固定された問題パック・問題 revision・Attempt・Progress・EndState・冪等性記録・監査ログを保存します。サーバーを再起動しても継続できます。ブラウザーのローカルストレージには業務データを保存しません。

`data/backup.key` は、この環境のバックアップを認証する HMAC-SHA256 鍵です。値を公開・コミットしないでください。バックアップ JSON は暗号化されていません。別のマシンへ移す場合は SQLite を停止した状態で `data/` 全体を安全に移し、同じ鍵を保持してください。環境スナップショットには data/ を含め、アプリのプロセスは起動し直します。

この初期版にログイン・利用者分離はありません。同じサーバーへ接続するブラウザーは同じ学習データを操作します。認証のないインターネット公開には対応していません。

## 問題パック

JSON の形式：

```json
{
  "version": "MY-PACK-1",
  "schema_version": 1,
  "app_version": 1,
  "questions": [{
    "id": "P-001",
    "revision": 1,
    "change_type": "initial",
    "pool": "practice",
    "domain": "AI の基本",
    "type": "single",
    "text": "教師あり学習で通常必要なものは？",
    "choices": [{"id": "A", "text": "正解ラベル"}, {"id": "B", "text": "ラベルのない入力のみ"}],
    "correct": ["A"],
    "explanation": "入力と正解の対応を学習します。",
    "hint": "正解を教える方式です。"
  }]
}
```

- `pool`: `practice` / `domain_boss` / `final_boss` / `diagnostic`。
- `type`: `single` / `multiple`。複数選択は正答集合との完全一致で完全正答です。
- 問題 ID はパック内で一意。revision は正の整数。選択肢 ID、正答、パック互換性を検証します。
- 同じ version は上書きできません。既存 ID の変更は revision を上げ、`change_type` を `typographic`（表記修正）または `semantic`（意味変更）にします。
- 進行中のセッションがある場合、パック切り替えを拒否します。旧パックはアーカイブとして DB に残ります。
- 初期版では意味変更後の最初の通常戦の有効 Attempt で `unseen` に戻します。表記修正では既存の習熟度を保持します。

CSV の列順（UTF-8、ヘッダー必須）：

```csv
id,revision,pool,domain,type,text,choices,correct,explanation,hint,change_type
```

`choices` と `correct` は JSON を CSV セルとして引用します。ダブルクォートは `""` としてエスケープ。セル内のカンマ・改行・日本語を扱えます。CSV の場合、画面で新しいパック version も入力してください。

## 検証

`npm test` は独立したインメモリー DB と注入可能なサーバー時計を使用します。二重送信、キー衝突、空回答、支援、期限境界、ボスの成績分離、HP0、失敗ロールバック、復元、パック検証を検査します。

詳細な仕様対応、初期版の仮定、制限は [docs/implementation.md](docs/implementation.md) を参照してください。
