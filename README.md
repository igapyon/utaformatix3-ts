# Project Philosophy

## Overview

This project is a faithful, structure-preserving TypeScript port of UtaFormatix's conversion core.
It intentionally avoids refactoring, architectural reinterpretation, or stylistic redesign.
Instead, it follows a mechanical translation approach from Kotlin to TypeScript in order to:

- Preserve semantic equivalence
- Maintain structural alignment with upstream
- Enable deterministic and low-friction upstream tracking

The goal is not to redesign UtaFormatix, but to reproduce its core behavior in TypeScript while keeping the implementation mechanically traceable to the original source.

## Scope

This port focuses exclusively on the conversion core and does not include any UI components.

Currently supported formats:

- VSQX
- MusicXML
- UFDATA (UtaFormatix standard format)

Other formats and UI-related modules are intentionally excluded to keep the port minimal and structurally aligned.

## Design Principles

### 1. Structure-Preserving Translation

The directory structure, module boundaries, naming conventions, and responsibility separation mirror the upstream Kotlin implementation as closely as possible.
The intent is to make it possible to:

- Map upstream files to corresponding TypeScript files directly
- Track upstream changes mechanically
- Apply diffs with minimal interpretation

No refactoring is performed during the initial port unless strictly required by language differences.

### 2. Semantic Equivalence First

The primary correctness guarantee is semantic equivalence, not textual identity.

For example:

- Notes, timing, tempo, and time signatures must remain equivalent across conversions.
- XML formatting differences are tolerated as long as the musical semantics remain unchanged.
- MusicXML preserve-mode is treated as a special case where no-op transformations must return byte-identical output.

### 3. Mechanical Upstream Tracking

Upstream UtaFormatix is treated as the canonical reference implementation.
This project is designed so that:

- Upstream changes can be mirrored via submodule updates.
- Behavioral differences are detected automatically.
- Port updates remain localized and traceable.

Structural similarity is prioritized over idiomatic TypeScript optimization.

### 4. Minimal Interpretation

The port does not attempt to "improve" or "simplify" upstream logic.
If the upstream implementation contains:

- Explicit ordering
- Seemingly redundant transformations
- Specific serialization patterns

They are preserved unless proven incorrect.
The goal is fidelity, not reinterpretation.

### 5. Layered Comparison Model (Conversion Integrity)

Output verification is performed at multiple layers:

- Archive structure comparison (for VSQX ZIP containers)
- XML canonicalized comparison
- Semantic comparison via UFDATA

This layered approach ensures:

- Robust detection of structural drift
- Isolation of formatting-only differences
- Clear diagnostics when semantic divergence occurs

## Non-Goals

- UI replication
- Architectural modernization
- Aggressive optimization
- Reinterpretation of conversion logic

These may be explored in future derivative projects, but not in this repository.

## Philosophy Summary

This project treats the original Kotlin implementation as a canonical text.
The TypeScript codebase is not a redesign.
It is a transcription: careful, deliberate, and structure-preserving.
Upstream alignment is a first-class concern.
Stability and traceability take precedence over elegance.

## Acknowledgements

We express our sincere gratitude and respect to the upstream UtaFormatix project and its contributors.
UtaFormatix is licensed under the Apache License 2.0, and this TypeScript port inherits and follows the same Apache-2.0 license.

## Upstream Intake Policy

- Upstream sources are stored only under `upstream/`.
- `upstream/` is treated as read-only. Do not edit files there.
- Upstream updates must be pinned to a specific ref (tag or commit SHA) and performed via `scripts/sync-upstream.sh`.

```bash
./scripts/sync-upstream.sh <ref>
```

## Browser Distribution (IIFE)

For direct browser `<script>` usage, build the single-file IIFE bundle:

```bash
npm run build:lib
```

Output files:

- `dist-lib/utaformatix3-ts.iife.js` (global `window.Utaformatix3Ts`)
- `dist-lib/utaformatix3-ts.esm.js` (ES module)

Quick check:

- Open `playground.html` in a browser after `npm run build:lib`.
- It loads `dist-lib/utaformatix3-ts.iife.js` and shows a minimal API call result.

---

# プロジェクト理念（Project Philosophy）

## 概要

本プロジェクトは、UtaFormatix の変換コアを TypeScript に移植した、構造保持型（structure-preserving）の忠実なポートです。
本移植は、設計の再解釈やリファクタリングを目的としたものではありません。
Kotlin 実装を可能な限り機械的に TypeScript へ翻訳することを基本方針とし、以下を実現することを目的とします。

- 意味（セマンティクス）の同一性を保つこと
- 上流実装との構造的整合性を維持すること
- 上流変更への機械的かつ低コストな追従を可能にすること

本プロジェクトの目標は、UtaFormatix を再設計することではなく、その挙動を忠実に TypeScript へ転写（transcription）することにあります。

## 対象範囲（Scope）

本ポートは変換コアのみに焦点を当てています。
UI コンポーネントは含みません。

現在対象とするフォーマットは以下です。

- VSQX
- MusicXML
- UFDATA（UtaFormatix 標準形式）

その他のフォーマットおよび UI 関連機能は、構造整合性を保つため意図的に除外しています。

## 設計原則（Design Principles）

### 1. 構造保持型翻訳（Structure-Preserving Translation）

ディレクトリ構造、モジュール境界、命名規則、責務分離は、上流 Kotlin 実装を可能な限り踏襲します。
目的は以下の通りです。

- 上流ファイルと TypeScript ファイルの直接対応を可能にする
- 上流変更を機械的に追跡できるようにする
- 差分適用時の解釈コストを最小化する

言語差異により必要な場合を除き、初期段階ではリファクタリングを行いません。

### 2. 意味同一性の優先（Semantic Equivalence First）

本プロジェクトが保証する正しさは、テキスト一致ではなく意味同一性です。

例えば：

- ノート、タイミング、テンポ、拍子は変換前後で意味的に一致すること
- XML の整形差異は、音楽的意味が変わらない限り許容すること
- ただし MusicXML の preserve モードでは、No-op 変換時にバイト単位での完全一致（diff 0）を保証します。

### 3. 機械的上流追従（Mechanical Upstream Tracking）

上流 UtaFormatix は正本（canonical implementation）として扱います。
本プロジェクトは以下を前提に設計されています。

- 上流更新を submodule 等で取り込めること
- 挙動差分を自動検出できること
- 変更箇所を局所的かつ追跡可能な形で修正できること

TypeScript らしさよりも、構造的整合性を優先します。

### 4. 解釈の最小化（Minimal Interpretation）

本ポートは、上流ロジックの改善や簡略化を目的としません。
上流実装に以下が存在する場合でも、誤りであると証明されない限り保持します。

- 明示的な順序処理
- 冗長に見える変換
- 特定のシリアライズ手順

目標は再設計ではなく、忠実性です。

### 5. 多層比較モデル（Conversion Integrity）

出力検証は多層構造で行います。

- VSQX ZIP コンテナの構造比較
- XML の最小正規化比較
- UFDATA による意味比較

この多層比較により、以下を可能にします。

- 構造ドリフトの検出
- 整形差分と意味差分の分離
- 問題箇所の明確化

## 非目標（Non-Goals）

本リポジトリは以下を目的としません。

- UI の再現
- 設計の近代化
- 積極的な最適化
- 変換ロジックの再解釈

これらは将来の派生プロジェクトで扱う可能性がありますが、本リポジトリでは扱いません。

## 哲学的まとめ（Philosophy Summary）

本プロジェクトは、元の Kotlin 実装を「正典」として扱います。
TypeScript 実装は再設計ではなく、転写です。
慎重で、意図的で、構造を保持した移植です。
上流との整合性は第一級の関心事項です。
優雅さよりも、安定性と追跡可能性を優先します。

## 謝辞（Acknowledgements）

上流である UtaFormatix プロジェクトと、その開発に携わる皆様に深い敬意と感謝を表します。
UtaFormatix は Apache License 2.0 の下で提供されており、この TypeScript 移植も同じ Apache-2.0 ライセンスを継承し、それに従います。

## upstream 受信ポリシー（Upstream Intake Policy）

- 上流ソースは `upstream/` 配下のみに格納します。
- `upstream/` は read-only 扱いとし、手編集しません。
- 上流更新は特定の ref（タグまたはコミットSHA）を指定して行い、`scripts/sync-upstream.sh` 経由で実施します。

```bash
./scripts/sync-upstream.sh <ref>
```
