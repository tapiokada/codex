# 教材・出典の再点検（2026-10-26）

## 点検結果

旧 `SAMPLE-1` は、10種類の基礎問題を4プールに複製した40件でした。引用元・参照資料・公式スキルへの対応は未登録で、単一選択の正答位置もAに偏っていました。AI-900相当の用語理解が中心で、AI-103対策としての難易度や範囲への適合を主張できる内容ではありませんでした。

新パック `LEARN-SCENARIOS-2026-10-26-1` は、Microsoft Learnの公式公開教材から確認した内容を根拠に独自作成した48種類のシナリオです。実際の試験問題、試験ダンプ、Microsoft Learnの知識チェック、第三者問題集の問題文は使用していません。参照資料からの長文引用ではなく、要件と選択肢の理由を日本語で新たに作成しました。

## 確認した資料

MicrosoftDocs公式の [MicrosoftDocs/learn](https://github.com/MicrosoftDocs/learn) 公開リポジトリを取得し、Microsoft Learn教材の本文を確認しました。

- 固定コミット：`bf8489b9abc678d81eddcd091127c6be70181eae`（リポジトリ上の最終更新日2026-10-24）
- 確認した参照候補：23ファイル。実際の48問が参照する原文：22ファイル。
- ファイルごとのURL・SHA-256・教材更新日・内容確認日：`content/sources.json`
- 個々の設問への対応：`questions.js` が参照IDを各問題の `sources` に展開。
- 現在のLearnページと、実際に確認した固定版の原文リンクを両方表示。

|教材の学習テーマ|確認したMicrosoft Learn教材の例|練習の狙い|
|---|---|---|
|モデル選定・SDK・認証|[Foundry SDK](https://learn.microsoft.com/en-us/training/modules/foundry-sdk/)、[モデル選定](https://learn.microsoft.com/en-us/training/modules/model-catalog-evaluate/)|管理と推論のAPI境界、エンドポイント、本番認証、性能・費用・機能の比較|
|生成AI・プロンプト・最適化|[モデル最適化](https://learn.microsoft.com/en-us/training/modules/optimize-generative-ai-model-performance/)|few-shot、RAGとfine-tuningの使い分け、パラメーターの限界、品質と費用の比較|
|RAG・知識検索・根拠付け|[Foundry IQ](https://learn.microsoft.com/en-us/training/modules/introduction-foundry-iq/)、上記のRAG教材|ハイブリッド検索、引用、フォールバック、データ鮮度、複数根拠の統合|
|エージェント・ツール連携|[カスタムツール](https://learn.microsoft.com/en-us/training/modules/build-agent-with-custom-tools/)、[MCP](https://learn.microsoft.com/en-us/training/modules/connect-agent-to-mcp-tools/)|関数の契約と実行、OpenAPI、MCPの接続と実行承認|
|責任あるAI・安全性|[責任ある生成AI](https://learn.microsoft.com/en-us/training/modules/responsible-ai-studio/)|多層防御、リスク優先付け、フィルターと事実性の違い、利用者への説明、公開後の改善|
|評価・監視・運用改善|[監視](https://learn.microsoft.com/en-us/training/modules/monitor-generative-ai-app/)、[エージェント評価](https://learn.microsoft.com/en-us/training/modules/evaluate-optimize-agents/)、[自動評価](https://learn.microsoft.com/en-us/training/modules/automated-evaluation-genaiops/)|groundednessとrelevanceの区別、評価データ、trace/span、費用分析、CIでの比較|

教材側の更新日・SDK/API例には版の違いがあります。全SDKで同じ機能が同時に使えるとは扱っていません。特定のSDK例を暗記するより、必要な機能と対応バージョンを照合する方針を説明しています。

## 公式試験範囲との照合：未完了

以下の候補URLへの直接取得を試しましたが、この環境の通信プロキシから403で拒否され、本文を確認できませんでした。

- `https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-103/`
- `https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103`

403はURLが不存在である証拠ではありません。試験名、最新の評価スキル、配点、改定日、全範囲への網羅性は未確認です。公式リポジトリの教材は確認できましたが、これを公式試験ガイドの確認と同一視していません。環境設定のネットワーク許可に `learn.microsoft.com` を追加した下書きを保存しています。実行環境への反映・ページ取得の成功は未確認です。

アプリの `exam_scope.status` は `not_verified` とし、「学習範囲・出典」と拠点に未照合と表示します。6テーマはこの教材の整理であり、公式の評価スキル区分や配点ではありません。「出題確実」「全範囲準拠」「公式模擬試験」とは表示しません。公式ガイドへ到達できた際には、スキル項目単位で対応・不足・対象外を整理し、問題・対応表・テストを同時に更新する必要があります。

## 設問と解説の構造

- 通常戦24・分野ボス12・最終ボス6・診断6。モード間で同じ問題文を複製しません。
- 単一選択42・複数選択6。単一選択の正答位置はA10/B11/C11/D10。
- 全192選択肢に、それぞれの正答・誤答の理由を記述。
- 各問に `objective`、`takeaway`、`difficulty`、`sources` を記録。難易度は教材内の編集上の目安で、試験の統計的難度を再現した値ではありません。
- 回答結果と履歴の両方で、選んだ選択肢・正答・誤答の区別、判断ポイント、原文へのリンクを表示。
- 回答前の現在問題レスポンスに `correct`、`explanation`、`choice_explanations`、`takeaway` を含めません。ヒントは明示的な支援操作後のみ表示します。
- 旧パックと旧問題の履歴は残し、旧問の解説が新問の解説へ置き換わらないことを検証します。

## 検証方法

`npm test` で従来の状態遷移テストに加えて、全問題の正答・誤答採点、プール間重複、通常戦の複数選択、選択肢別の解説・参照データ、回答前の情報漏えい防止、既存データからの切替、安全なリンクとエスケープを確認します。

内容の正しさは原文との人手による照合を含みます。構造テストに通ることだけで内容の正しさ・本試験との一致を証明したことにはしません。
