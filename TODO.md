# TODO（実行タスク）

このファイルは `ROADMAP.md` を日々の実行単位に分解したチェックリストです。  
原則: upstream 追従優先、写経優先、再設計しない。

## 0. 運用準備

- [x] `MAPPING.md` の pinned commit を最新同期 ref に更新する（upstream 更新のたび）
- [x] `MAPPING.md` の directory mapping と実ディレクトリ差分を確認する
- [x] `src/` の初期ディレクトリ骨格を作る（`core/model`, `core/util`, `core/io`, `core/process`）
- [x] `tests/` 配下に parity テスト置き場を作る（`tests/upstream-parity`）
- [x] `TODO.md` の「進行中」セクションを毎回更新する

## 1. Phase 1: model 写経

### 1-1. MVPモデル

- [x] `src/core/model/Project.ts` を追加
- [x] `src/core/model/Track.ts` を追加
- [x] `src/core/model/Note.ts` を追加
- [x] `src/core/model/Tempo.ts` を追加
- [x] `src/core/model/TimeSignature.ts` を追加
- [x] `extras?: Record<string, unknown>` を MVP 対象型に追加
- [x] 判別キー命名を確認（upstream 語彙優先、無ければ `kind`）

### 1-2. model 全体写経（upstream/core/model）

- [x] `Constants.kt -> src/core/model/Constants.ts`
- [x] `ConversionParams.kt -> src/core/model/ConversionParams.ts`
- [x] `ExportNotification.kt -> src/core/model/ExportNotification.ts`
- [x] `ExportResult.kt -> src/core/model/ExportResult.ts`
- [x] `Feature.kt -> src/core/model/Feature.ts`
- [x] `Format.kt -> src/core/model/Format.ts`
- [x] `ImportParams.kt -> src/core/model/ImportParams.ts`
- [x] `ImportWarning.kt -> src/core/model/ImportWarning.ts`
- [x] `JapaneseLyricsType.kt -> src/core/model/JapaneseLyricsType.ts`
- [x] `PhonemesMappingPreset.kt -> src/core/model/PhonemesMappingPreset.ts`
- [x] `Pitch.kt -> src/core/model/Pitch.ts`
- [x] `ProjectContainer.kt -> src/core/model/ProjectContainer.ts`
- [x] `TickCounter.kt -> src/core/model/TickCounter.ts`
- [x] `ValueTree.kt -> src/core/model/ValueTree.ts`

### 1-3. 不変条件と安全整数

- [x] `tickOn < tickOff` の assert を実装
- [x] `duration > 0` の assert を実装
- [x] `ppq > 0` の assert を実装
- [x] `tempo > 0` の assert を実装
- [x] tick/position 系に `Number.isSafeInteger` チェックを実装

### 1-4. 最小 util（upstream/core/util）

- [x] `Result.kt -> src/core/util/Result.ts`
- [x] `ChainCall.kt -> src/core/util/ChainCall.ts`
- [x] `TextUtil.kt -> src/core/util/TextUtil.ts`
- [x] `EncodingUtil.kt -> src/core/util/EncodingUtil.ts`
- [ ] 必要なら `XmlExtension.kt -> src/core/util/XmlExtension.ts`
- [ ] 必要なら `MidiUtil.kt -> src/core/util/MidiUtil.ts`

### 1-5. Phase 1 検証

- [x] 型チェックを通す
- [x] model の最小バリデーションテストを追加
- [x] `MAPPING.md` の file mapping と status を更新

## 2. Phase 2: UFDATA 写経

### 2-1. API

- [x] `src/core/io/UfData.ts` を追加
- [x] `parseUfdata(json: string | object): Project` を実装
- [x] `writeUfdata(project: Project, opts?): string` を実装
- [x] upstream versioning 仕様を確認して反映

### 2-2. 比較可能性

- [x] JSON canonicalize 方針をテスト実装
- [x] 並べ替え/丸めを勝手に行っていないことを確認
- [x] diagnostics 形式を固定（最低限）

### 2-3. フィクスチャとテスト

- [x] `tests/fixtures/ufdata` の置き場を作成
- [x] golden ufdata ケースを 1 件追加
- [x] `project -> ufdata -> project` round-trip テストを追加
- [x] semantic 同一（notes/tempo/timeSignatures）検証を追加
- [x] `extras` は比較対象外（Phase 1-2）をテストに明記

## 3. Phase 3: VSQX 写経

### 3-1. MVP入出力

- [x] `src/core/io/Vsqx.ts` を追加
- [x] tempo/timeSignatures/notes/tracks の parse 実装
- [x] 必要十分な VSQX write 実装
- [x] `extras.vsqx` 退避方針を実装（保存中心）

### 3-2. ZIP/XML 比較

- [x] ZIP 展開比較ユーティリティを実装
- [x] XML 最小正規化比較を実装
- [x] 要素順序の保持を検証
- [ ] `vsqx -> project -> vsqx` 一致テストを追加
- [ ] UFDATA 意味比較の二層検証を追加

## 4. Phase 4: MusicXML 写経

### 4-1. generate

- [ ] `src/core/io/MusicXml.ts` を追加
- [ ] generate モード実装
- [ ] XML正規化比較 + UFDATA比較テストを追加

### 4-2. preserve

- [ ] preserve モード実装
- [ ] no-op で入力テキスト完全一致（diff 0）を実装
- [ ] 変更ありケースの XML/UFDATA 比較テストを追加

## 5. 追従タスク（upstream更新ごと）

- [ ] `./scripts/sync-upstream.sh <ref>` を実行
- [ ] upstream 差分（rename/move）を先に TS 側へ反映
- [ ] `MAPPING.md` の mapping/status を更新
- [ ] fixtures 再生成
- [ ] テスト実行して差分を分類（整形/意味/仕様変更）

## 進行中（1つだけ）

- [ ] `vsqx -> project -> vsqx` 一致テストを追加

## テスト先行チェックポイント（TESTING.md 準拠）

- [x] Phase 1: 型追加と同時に不変条件テスト（`tickOn < tickOff`, `duration > 0`, `Number.isSafeInteger`）を追加する
- [x] Phase 2: `parseUfdata` 実装直後に `project -> ufdata -> project` round-trip テストを追加する
- [x] Phase 2: golden ufdata を少数ケースで先に固定し、実装をそれに合わせる
- [ ] Phase 3: VSQX は機能追加ごとに「ZIP構造比較 + UFDATA意味比較」の二層テストを追加する
- [ ] Phase 4: MusicXML preserve は最初に no-op diff 0 テストを追加し、以後の変更をガードする
