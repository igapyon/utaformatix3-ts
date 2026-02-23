# Kotlin -> TypeScript 対応表（MAPPING）

このファイルは、上流 Kotlin 実装と TypeScript 実装の 1:1 対応を管理するための台帳です。  
目的は「再設計」ではなく「写経的移植」の追跡可能性を担保することです。

## ルール

- 上流の正本は `upstream/utaformatix` とする。
- 上流ファイルの移動/rename が発生した場合、TS 側もまず同じ移動/rename を行う。
- 実装改善や整理は、対応関係を壊さない範囲でのみ行う。
- 本表は「追加・移動・削除」の都度更新する。
- 本表に未登録の TS ファイルを増やさない。
- 判別キー名は upstream 語彙を優先する。upstream に既存の判別語彙がない場合のみ `kind` を使う。
- 命名（ファイル名・型名・関数名）は upstream 語彙を優先する。
- TS 都合で命名を変更する場合は、対応表の `notes` に理由を必ず記録する。

## 上流固定情報

- Upstream repository: `https://github.com/sdercolin/utaformatix3.git`
- Pinned commit: `f3c83354f57894492410bbc5ba03f7e97169c92c`
- Sync command: `./scripts/sync-upstream.sh <ref>`

## ディレクトリ対応（初期）

| upstream path | ts path | scope | status | notes |
|---|---|---|---|---|
| `upstream/utaformatix/core/src/main/kotlin/core/model` | `src/core/model` | Core model | planned | Phase 1 最優先 |
| `upstream/utaformatix/core/src/main/kotlin/core/util` | `src/core/util` | Core utility | planned | Phase 1 で最小導入 |
| `upstream/utaformatix/core/src/main/kotlin/core/process` | `src/core/process` | Format process | planned | Phase 2-4 |
| `upstream/utaformatix/core/src/main/kotlin/core/io` | `src/core/io` | I/O, parser/writer | planned | Phase 2-4 |
| `upstream/utaformatix/core/src/main/kotlin/core/exception` | `src/core/exception` | Error model | planned | diagnostics 方針に合わせる |
| `upstream/utaformatix/core/src/main/kotlin/core/external` | `src/core/external` | External bindings | planned | 必要最小限で移植 |
| `upstream/utaformatix/core/src/main/resources/format_templates` | `src/resources/format_templates` | Templates | planned | 実装進捗に応じて追加 |
| `upstream/utaformatix/core/src/main/resources/texts` | `src/resources/texts` | Text resources | planned | 必要時のみ導入 |
| `upstream/utaformatix/src/jsMain/kotlin/ui` | `(excluded)` | UI | excluded | 本リポジトリのスコープ外 |
| `upstream/utaformatix/src/jsMain/resources/images` | `(excluded)` | UI assets | excluded | 本リポジトリのスコープ外 |
| `upstream/utaformatix/src/jsTest/kotlin` | `tests/upstream-parity` | Parity tests | planned | Phase 2 以降で段階導入 |

## ファイル対応（着手時に追記）

形式:

`upstream/utaformatix/<...>.kt -> src/<...>.ts`

例:

`upstream/utaformatix/core/src/main/kotlin/core/model/Project.kt -> src/core/model/Project.ts`

## ステータス定義

- `planned`: まだ未着手
- `in_progress`: 実装中
- `ported`: 写経実装済み
- `verified`: テストで上流同等を確認済み
- `excluded`: スコープ外
