# AI-103 公式範囲と教材の対応

確認日：2026-10-26。公式の評価スキル適用日：2026-04-16。
出典：[Microsoft Learn AI-103 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-103)

通常戦150問を50問×3セットへ重複なく分割。ボス・診断24問は別枠です。
「対応」は各箇条書きに関連した問題が存在することを示し、箇条書き内の全機能・全APIの実装を網羅する保証ではありません。50問は教材の構成であり、本番の固定問題数を表すものではありません。

|領域|公式比率|通常戦|セット1|セット2|セット3|
|---|---|---:|---:|---:|---:|
|AIソリューションの計画・管理|25–30%|42|14|14|14|
|生成AI・エージェント|30–35%|48|16|16|16|
|画像・動画|10–15%|20|7|7|6|
|テキスト・音声|10–15%|20|7|6|7|
|情報抽出・検索|10–15%|20|6|7|7|

## AIソリューションの計画・管理

|ID|公式スキルの箇条書き|通常戦の問題ID|
|---|---|---|
|plan-01|Choose an appropriate model for each task, including large language models (LLMs), small language models, multimodal models, and Foundry Tools|LEARN-01-04, LEARN-06-05, P150-plan-001|
|plan-02|Choose the appropriate Foundry services for generative tasks, grounding, vector search, agent workflows, or multimodal processing|LEARN-01-01, LEARN-01-05, P150-plan-002|
|plan-03|Choose an appropriate method for retrieval and indexing|P150-plan-029|
|plan-04|Choose appropriate memory, tool, and knowledge integration services for agent solutions|P150-plan-030|
|plan-05|Design Azure infrastructure for AI apps and agent-based solutions|P150-plan-005, P150-plan-006|
|plan-06|Choose appropriate deployment options|P150-plan-003, P150-plan-004|
|plan-07|Configure model and agent deployments|LEARN-01-03, P150-plan-007, P150-plan-008|
|plan-08|Integrate Foundry projects with continuous integration and continuous deployment (CI/CD) pipelines|P150-plan-009, P150-plan-010|
|plan-09|Manage quotas, scaling, rate limits, and cost footprints for model and agent workloads|LEARN-06-04, P150-plan-011, P150-plan-012|
|plan-10|Monitor model performance, drift, safety events, and grounding quality|LEARN-06-01, P150-plan-013, P150-plan-014|
|plan-11|Monitor data ingestion quality, search index health, and relevance performance|P150-plan-015, P150-plan-016|
|plan-12|Configure security, including managed identity, private networking, keyless credentials, and role policies|P150-plan-017, P150-plan-018, P150-plan-019, P150-plan-020|
|plan-13|Configure safety filters, guardrails, risk detection, and content moderation|LEARN-05-01, LEARN-05-03, P150-plan-021, P150-plan-022|
|plan-14|Apply responsible AI instrumentation, including evaluators, safety evaluations, and explanation tooling|LEARN-05-05, P150-plan-023, P150-plan-024|
|plan-15|Implement auditing through trace logging, provenance metadata, and approval workflows|LEARN-06-03, P150-plan-025, P150-plan-026|
|plan-16|Govern agent behavior with oversight modes, constraints, and tool-access controls|LEARN-05-04, P150-plan-027, P150-plan-028|

## 生成AI・エージェント

|ID|公式スキルの箇条書き|通常戦の問題ID|
|---|---|---|
|gen-01|Deploy and consume LLMs, small models, code models, and multimodal models|P150-gen-001, P150-gen-002|
|gen-02|Implement retrieval-augmented generation (RAG) in an application|LEARN-02-01, LEARN-02-05, P150-gen-003, P150-gen-004, P150-gen-005, P150-gen-037|
|gen-03|Design workflows, tool-augmented flows, and multistep reasoning pipelines|P150-gen-006, P150-gen-007, P150-gen-008|
|gen-04|Evaluate models and apps, including detecting fabrications, relevance, quality, and safety|P150-gen-009, P150-gen-010, P150-gen-038|
|gen-05|Integrate generative workflows into applications by using Foundry SDKs and connectors|P150-gen-011|
|gen-06|Configure an application to connect to a Foundry project|P150-gen-012|
|gen-07|Define agent roles, goals, conversation-tracking approach, and tool schemas|P150-gen-013, P150-gen-014|
|gen-08|Build agents that integrate retrieval, function-calling, and conversation memory|LEARN-04-04, P150-gen-015, P150-gen-016|
|gen-09|Integrate agent tools, including APIs, knowledge stores, search, content understanding, and custom functions|LEARN-04-01, LEARN-04-03, P150-gen-017, P150-gen-018|
|gen-10|Implement orchestrated multi-agent solutions|P150-gen-019, P150-gen-020, P150-gen-021|
|gen-11|Build autonomous or semiautonomous workflows with safeguards and approval flow controls|LEARN-04-05, P150-gen-022, P150-gen-023, P150-gen-024|
|gen-12|Integrate monitoring into deployed agents, evaluate agent behavior, and perform error analysis|P150-gen-025, P150-gen-026|
|gen-13|Tune generation behavior, such as prompt engineering and adjusting model parameters|LEARN-02-03, LEARN-02-04, P150-gen-027, P150-gen-039|
|gen-14|Implement model reflection, chain-of-thought evaluations, and self-critique loops|P150-gen-028, P150-gen-029, P150-gen-030|
|gen-15|Set up observability by implementing tracing, token analytics, safety signals, and latency breakdowns|P150-gen-031, P150-gen-032, P150-gen-033, P150-gen-040|
|gen-16|Orchestrate multiple models, flows, or hybrid LLM and rules engines|P150-gen-034, P150-gen-035, P150-gen-036|

## 画像・動画

|ID|公式スキルの箇条書き|通常戦の問題ID|
|---|---|---|
|vision-01|Implement a solution that generates images from text prompts and reference media|P150-vision-001, P150-vision-002|
|vision-02|Implement a solution that generates videos from text prompts and reference media|P150-vision-003, P150-vision-004|
|vision-03|Configure image-editing workflows, including inpainting, mask‑based edits, and prompt‑driven modifications|P150-vision-005, P150-vision-006|
|vision-04|Implement workflows to edit generated videos|P150-vision-007|
|vision-05|Select and apply appropriate generation and editing controls provided by the platform|P150-vision-008|
|vision-06|Build a solution that analyzes visual context by using multimodal models|P150-vision-009|
|vision-07|Configure apps to produce concise or detailed captions for single or multiple images|P150-vision-010|
|vision-08|Implement a solution that enables question‑answering grounded in visual evidence|P150-vision-011, P150-vision-020|
|vision-09|Configure generation of alt‑text and extended image descriptions aligned to accessibility guidelines|P150-vision-012|
|vision-10|Implement visual understanding by configuring Azure Content Understanding in Foundry Tools to extract visual characteristics|P150-vision-013|
|vision-11|Implement video analysis workflows to process and interpret video segments|P150-vision-014|
|vision-12|Configure single‑task and pro‑mode Content Understanding pipelines|P150-vision-015|
|vision-13|Implement solutions that identify objects, components, or regions within images or video|P150-vision-016|
|vision-14|Implement filters to classify unsafe or disallowed visual content|P150-vision-017|
|vision-15|Detect and mitigate indirect prompt injection by using embedded text in images|P150-vision-018|
|vision-16|Enforce visual policy rules, such as applying watermarks, flagging prohibited symbols, upholding brand usage requirements, and detecting potentially inappropriate content|P150-vision-019|

## テキスト・音声

|ID|公式スキルの箇条書き|通常戦の問題ID|
|---|---|---|
|text-01|Implement solutions to extract entities, topics, summaries, and structured JSON outputs by using generative prompting and Foundry Tools|P150-text-001, P150-text-002, P150-text-003|
|text-02|Configure detection of sentiment, tone, safety issues, and sensitive content|P150-text-004, P150-text-005, P150-text-006|
|text-03|Build solutions that translate text by using Azure Translator in Foundry Tools or LLM‑powered translation flows|P150-text-007, P150-text-008, P150-text-009|
|text-04|Customize language model outputs for domain tasks, such as compliance summarization and domain extraction|P150-text-010, P150-text-011|
|text-05|Implement workflows to convert speech to text and text to speech for agentic interactions|P150-text-012, P150-text-013, P150-text-014|
|text-06|Integrate speech as an agent modality, including custom speech models|P150-text-015, P150-text-016|
|text-07|Enable multimodal reasoning from audio inputs|P150-text-017, P150-text-018|
|text-08|Translate speech into other languages by using language models and Foundry Tools|P150-text-019, P150-text-020|

## 情報抽出・検索

|ID|公式スキルの箇条書き|通常戦の問題ID|
|---|---|---|
|extract-01|Ingest and index content, such as documents, images, audio, and video|LEARN-03-04, LEARN-03-05, P150-extract-001, P150-extract-002|
|extract-02|Configure semantic search, hybrid search, and vector search for grounding|LEARN-03-01, P150-extract-003, P150-extract-004|
|extract-03|Implement enrichment by using custom or built-in skills for text, images, and layout|P150-extract-005, P150-extract-006|
|extract-04|Configure RAG ingestion flow, including documents and using optical character recognition (OCR)|P150-extract-007, P150-extract-008|
|extract-05|Connect retrieval pipelines directly to workflows and agent tools|LEARN-03-03, P150-extract-009, P150-extract-010|
|extract-06|Extract information by using multimodal pipelines that combine OCR, layout analysis, and field extraction|P150-extract-011, P150-extract-012|
|extract-07|Produce clean, grounded representations to use with agents and RAG by using Content Understanding|P150-extract-013, P150-extract-014|
|extract-08|Implement analyzers for generating structured or markdown outputs for downstream reasoning by using Content Understanding|P150-extract-015, P150-extract-016|

画像のsingle-task/pro-modeに関する設問は、対象API版の機能・設定と解析範囲を比較する設計判断を扱います。旧名称と現行APIのモードを無条件に同一視せず、具体的な設定や利用可能性は使用する版の公式仕様で確認してください。
