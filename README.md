# SocialDetox

YouTube・SNS などの閲覧を曜日・時間帯でブロックする個人用 Chrome 拡張機能。

## 機能

- **ドメイン単位のブロック** — ブロック対象サイトを自由に追加・削除
- **曜日・時間帯スケジュール** — 曜日ごとにON/OFFと時間帯（開始〜終了）を設定
- **ポップアップで設定完結** — ツールバーアイコンからすべて操作可能

### スケジュールの動作

| 状態 | 動作 |
|---|---|
| 全曜日OFF（デフォルト） | 常時ブロック |
| 特定の曜日をON + 時間帯設定 | その曜日の指定時間帯のみブロック |
| 曜日がONだが時間帯外 | ブロックしない |
| 曜日がOFF | ブロックしない |

### デフォルトのブロック対象

- www.youtube.com
- www.twitter.com
- x.com
- www.instagram.com
- www.tiktok.com

## インストール

1. このリポジトリをクローンまたはダウンロード
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」→ このフォルダを選択

## 技術構成

- Manifest V3
- declarativeNetRequest API（ブロック処理）
- chrome.storage（設定の永続化）
- chrome.alarms（1分ごとのスケジュール再評価）
