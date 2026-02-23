# 移植ロードマップ（写経順）

このロードマップは「Kotlin の形をできる限り保った TypeScript への転写」を目的とします。  
TypeScript 的な最適化より、上流構造への忠実性を優先します。

## Phase 0: リポジトリ骨格（追従前提の確立）

### ゴール

- 上流追従可能な構造を先に固定する。

### 作業

- `upstream/` に上流を配置（submodule 運用）。
- `src/` を upstream の主要パスに寄せて配置方針を固定。
- `MAPPING.md` で `upstream path -> ts path` 対応を管理。
- 上流固定 ref（commit SHA）を明記。

### 追従ルール

- upstream で移動/rename が発生したら、TS 側も内容変更より先に同じ移動/rename を行う。

### Done 条件

- `MAPPING.md` が初期埋めされている。
- `scripts/sync-upstream.sh` で ref 固定更新できる。

## Phase 1: model を写経（最優先）

### ゴール

- 以降の全変換が依存する内部モデルを upstream と同型で確立する。

### 仕様

- Kotlin `data class` -> TS `interface`
- Kotlin `sealed class` -> TS discriminated union（判別キーは upstream 語彙優先。upstream に既存語彙がない場合のみ `kind` を使う）
- `Long` -> `number`（安全整数範囲を前提）
- 内部時間単位は `tick`、`ppq` を `Project` に保持
- MVP フィールド: `Project/tracks/tempos/timeSignatures/ppq`, `Track/notes`, `Note/tickOn/tickOff/key/lyric`
- `extras?: Record<string, unknown>` を段階導入前提で保持

### 不変条件（Phase 1 で固定）

- `tickOn < tickOff`
- `duration = tickOff - tickOn` かつ `duration > 0`
- `ppq > 0`
- `tempo > 0`
- tick/position 系の値は `Number.isSafeInteger` を満たす

### Done 条件

- model がコンパイル可能
- 必要最小限の `deepClone` / `assert` / `normalize` 系 util を配置
- tick/position 系に `Number.isSafeInteger` のバリデーションが存在
- 上記不変条件をチェックする最小バリデーションが存在

## Phase 2: UFDATA を写経（内部モデルI/O）

### ゴール

- `Project <-> UFDATA` 往復を成立させる。

### 仕様

- API:
  - `parseUfdata(json: string | object): Project`
  - `writeUfdata(project: Project, opts?): string`
- versioning は upstream を踏襲
- 保存時に恣意的な並べ替え・丸めはしない
- validation は軽量に開始し、diagnostics 形式を先に固定

### Done 条件

- `project -> ufdata -> project` で semantic 同一（notes/tempo/timeSignatures）
- golden UFDATA テストが動作

## Phase 3: VSQX を写経（必須フォーマット1）

### ゴール

- `VSQX <-> Project` の基本変換を成立させる。

### 仕様（MVP）

- 入力: tempo, time signatures, notes（tick/duration/key/lyric）, tracks
- 出力: 必要十分な VSQX を生成
- `extras.vsqx` の退避余地を残す（初期は保存中心）
- ZIP/XML 処理は TS で実施
- XML 正規化は最小限（追従性優先）

### Done 条件

- `vsqx -> project -> vsqx` で以下が一致
  - note count
  - `tickOn` / `tickOff`
  - `key`
  - `lyric`
  - `tempo` / `timeSignatures`
- 比較は「構造比較 + UFDATA 意味比較」の二層で検証

## Phase 4: MusicXML を写経（必須フォーマット2）

### ゴール

- generate / preserve の両モードを成立させる。

### 仕様

- `generate`: `Project -> MusicXML` 新規生成
- `preserve`: 入力 MusicXML を保持し、必要箇所のみ反映
- preserve の原則:
  - no-op は入力テキストをそのまま返す（diff 0）
  - 自動正規化はしない

### Done 条件

- `musicxml -> project -> musicxml(generate)` が成立
- `musicxml -> project -> musicxml(preserve)` で no-op は diff 0

## 運用メモ

- 各 Phase で `MAPPING.md` の `status` を更新する。
- 上流更新時は `scripts/sync-upstream.sh` を使い ref 固定で同期する。
- 実装より先に「対応関係」と「比較可能性」を維持する。
