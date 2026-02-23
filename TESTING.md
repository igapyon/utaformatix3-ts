# テスト方針（Testing Strategy）

## 概要

本プロジェクトのテストは、上流 UtaFormatix を正本（oracle）とする写経型検証モデルを採用します。
目的は以下の通りです：

- TypeScript 実装が上流と意味的に一致していることを保証する
- 上流変更を機械的に検知し、追従可能にする
- 構造差分と意味差分を分離して診断できるようにする

テストは「再設計のため」ではなく、「忠実性を保証するため」に存在します。

## 1. オラクルモデル（Oracle Model）

### 1.1 正本の定義

上流 UtaFormatix 実装を正本とします。
本プロジェクトでは：

- 上流リポジトリを submodule 等で保持
- 上流を実行して期待値（fixtures）を生成
- TypeScript 実装の出力と比較

という方式を採用します。

### 1.2 fixtures の生成

fixtures は上流実行によって生成されます。
各テストケースは以下を持ちます：

```text
tests/fixtures/<format>/<case>/
  input.*
  oracle.ufdata.json
  oracle.out.vsqx        (必要な場合)
  oracle.out.musicxml    (必要な場合)
  meta.json
```

`meta.json` 例

```json
{
  "id": "vsqx_tiny_01",
  "features": ["notes", "tempo", "timesig", "lyrics"],
  "knownLimitations": []
}
```

fixtures は手動編集しません。
上流更新時は再生成します。

## 2. 比較モデル（Layered Comparison Model）

出力比較は多層構造で行います。

### 2.1 UFDATA（JSON）

比較方法

- JSON canonicalize（キー順ソート）
- 数値は整数として比較
- 配列順序は仕様通り保持

保証対象

- ノート（tickOn/tickOff/key/lyric）
- テンポ
- 拍子
- トラック構造
- extras は段階導入（初期は比較対象外でも可）

写経強化の実装ポイント（upstream準拠）:

- `parseUfdataDocument` / `generateUfdataDocument` の document API を提供
- `parseUfdata(..., { simpleImport: true })` で pitch を非読込にできる
- parse時に `validateNotes` 相当のノート整形を適用
- write時に `includePitch: false` でも空 pitch 構造（`ticks/values/isAbsolute`）を保持

### 2.2 VSQX（ZIP）

VSQX はバイナリ一致を要求しません。

比較手順

- ZIP展開
- エントリ名集合一致
- 各エントリ比較
- XMLエントリ比較

XMLは最小正規化後に比較します：

- 無意味な空白削除
- 属性名ソート
- 自動閉じタグ統一
- XML宣言統一

要素順序は変更しません。

セマンティック保険

必要に応じて：

- VSQX → 再パース → UFDATA → oracle.ufdata と比較

これにより：

- 整形差分
- 実質的意味差分

を分離します。

### 2.3 MusicXML

generate モード

- XML正規化比較
- UFDATAセマンティック比較

preserve モード

- no-op
入力テキストと完全一致（diff 0）
- 変更あり
XML正規化比較
UFDATA比較

### 2.4 比較ルール（厳密比較 / 許容差分）

| layer | 比較対象 | 厳密比較 | 許容差分 | 備考 |
|---|---|---|---|---|
| UFDATA | notes/tempo/timeSignatures/tracks | Yes | No | semantic 同一の主判定 |
| UFDATA | extras | Phase 1-2: No | Yes | Phase 3 以降で段階導入 |
| VSQX ZIP | エントリ名集合 | Yes | No | 欠落/過剰は失敗 |
| VSQX XML | 意味に無関係な整形 | No | Yes | 空白・属性順・XML宣言のみ |
| VSQX XML | 要素順序 | Yes | No | 順序変更は失敗 |
| MusicXML preserve no-op | 入力テキスト | Yes | No | diff 0 を絶対保証 |

## 3. テスト分類（写経順）

テストは実装フェーズに対応して構成します。

Phase 1: Model

- 型整合性
- 不変条件（tickOn < tickOff 等）
- nullability 仕様

Phase 2: UFDATA

- project → ufdata → project round-trip
- golden UFDATA との一致

Phase 3: VSQX

- parse 一致（oracle.ufdata 比較）
- write 一致（ZIP展開比較）
- round-trip 一致

Phase 4: MusicXML

- generate 一致
- preserve no-op 一致
- preserve 変更一致

## 4. 上流追従フロー

上流更新時は以下を実行します。

- submodule update
- fixtures 再生成（`./scripts/regenerate-fixtures.sh`）
- テスト実行
- 差分確認

差分は以下のどれかに分類されます：

- 整形差分（canonicalize調整）
- 意味差分（TS実装修正）
- 上流仕様変更（仕様更新）

## 5. 診断ポリシー

テスト失敗時は、どのレイヤーで落ちたかを出力します。

- ZIP構造不一致
- XML構造不一致
- UFDATA意味不一致

これにより追従箇所を特定します。

## 6. ブラウザ配布物の動作確認（IIFE）

ブラウザ直読み込み用の配布物（`dist-lib`）は以下で生成します。

```bash
npm run build:lib
```

生成後、`playground.html` をブラウザで開いて以下を確認します。

- `IIFE loaded.` が表示されること
- `window.Utaformatix3Ts` 経由の最小 API 呼び出し結果が表示されること

## 7. 原則

- fixtures は編集しない
- 上流を正本とする
- テストは再設計の場ではない
- canonicalize は最小限
- preserve no-op は絶対保証

## まとめ

本プロジェクトのテストは、再解釈ではなく、忠実性の検証である。
上流との構造整合性を維持しながら、意味同一性を保証するための仕組みである。
