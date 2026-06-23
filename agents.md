# agents.md

## Project

X（Twitter）キャンペーン抽選プラットフォーム

---

## Overview

X上で実施されるキャンペーンに対し、応募条件を自由に組み合わせて抽選を行うWebアプリ。

主催者は以下のような条件を組み合わせてキャンペーンを作成できる。

* RTのみ
* フォローのみ
* RT + フォロー
* RT + いいね
* フォロー + いいね
* RT + フォロー + いいね

将来的には条件を追加できるプラグイン形式を採用する。

---

# Goals

* 誰でも簡単に抽選キャンペーンを作成できる
* 条件の組み合わせを柔軟にする
* API変更に強い構造にする
* 抽選結果の公平性・再現性を担保する

---

# User Roles

## Organizer

キャンペーンを作成し、抽選を実施するユーザー。

### 権限

* ログイン
* キャンペーン作成
* キャンペーン編集
* 応募者取得
* 抽選実施
* 再抽選
* CSVエクスポート

---

# Functional Requirements

## Authentication

### Login

* X OAuth2 Login
* Access Token保存
* Refresh Token保存

### User Information

保存する情報

```ts
{
  id: string;
  xUserId: string;
  username: string;
  name: string;
  iconUrl: string;
}
```

---

# Campaign

## Create Campaign

```ts
interface CreateCampaign {
  title: string;
  postUrl: string;
  winnerCount: number;
  endAt?: Date;
  conditions: CampaignCondition[];
}
```

---

# Campaign Condition

```ts
enum ConditionType {
  RETWEET,
  FOLLOW,
  LIKE,
  REPLY,
  QUOTE,
  HASHTAG,
  KEYWORD_REPLY
}
```

---

```ts
interface CampaignCondition {
  type: ConditionType;
  enabled: boolean;
  params?: Record<string, unknown>;
}
```

---

## Example

### RT Only

```json
[
  {
    "type": "RETWEET",
    "enabled": true
  }
]
```

---

### RT + Follow

```json
[
  {
    "type": "RETWEET",
    "enabled": true
  },
  {
    "type": "FOLLOW",
    "enabled": true
  }
]
```

---

### Complex Conditions

```json
[
  {
    "type": "RETWEET",
    "enabled": true
  },
  {
    "type": "FOLLOW",
    "enabled": true
  },
  {
    "type": "KEYWORD_REPLY",
    "enabled": true,
    "params": {
      "keyword": "にる"
    }
  }
]
```

---

# Supported Conditions

| Condition     | Description    |
| ------------- | -------------- |
| RETWEET       | 対象ポストをRTした     |
| FOLLOW        | 主催者をフォローしている   |
| LIKE          | 対象ポストをいいねした    |
| REPLY         | 対象ポストに返信した     |
| QUOTE         | 対象ポストを引用RTした   |
| HASHTAG       | 特定ハッシュタグを投稿した  |
| KEYWORD_REPLY | 特定キーワードを含むリプライ |

---

# Participant Collection

## Flow

```text
Campaign
    ↓
Fetch Participants
    ↓
Evaluate Conditions
    ↓
Eligible Users
    ↓
Draw Winners
```

---

# Condition Evaluation

```ts
interface ConditionEvaluator {
  type: ConditionType;

  evaluate(
    campaign: Campaign,
    participant: Participant
  ): Promise<boolean>;
}
```

---

## Implementations

```ts
RetweetEvaluator
FollowEvaluator
LikeEvaluator
ReplyEvaluator
QuoteEvaluator
HashtagEvaluator
KeywordReplyEvaluator
```

---

# Eligibility

```ts
eligible = conditions.every(
  condition => evaluate(condition)
);
```

---

# Draw

## Input

```ts
{
  participants: Participant[];
  winnerCount: number;
}
```

---

## Output

```ts
{
  winners: Participant[];
}
```

---

# Rules

* 重複当選禁止
* 再抽選可能
* 当選履歴保持
* 抽選結果固定可能

---

# Fairness

抽選結果を再現できるようにSeedを保存する。

```ts
{
  seed: string;
  participantHash: string;
  winners: string[];
}
```

---

# Database

## users

```sql
id
x_user_id
username
name
icon_url
created_at
```

---

## campaigns

```sql
id
owner_id
title
tweet_id
winner_count
end_at
status
created_at
updated_at
```

---

## campaign_conditions

```sql
id
campaign_id
type
params
created_at
```

---

## participants

```sql
id
campaign_id
user_id
username
display_name
icon_url
conditions_result
eligible
created_at
```

---

## winners

```sql
id
campaign_id
user_id
drawn_at
```

---

# conditions_result Example

```json
{
  "RETWEET": true,
  "FOLLOW": true,
  "LIKE": false
}
```

---

# APIs

## Create Campaign

```http
POST /api/campaigns
```

---

## Get Campaigns

```http
GET /api/campaigns
```

---

## Get Participants

```http
POST /api/campaigns/:id/fetch
```

---

## Draw Winners

```http
POST /api/campaigns/:id/draw
```

---

## Redraw

```http
POST /api/campaigns/:id/redraw
```

---

## Export CSV

```http
GET /api/campaigns/:id/export
```

---

# UI

## Campaign List

* キャンペーン名
* 応募者数
* 条件達成者数
* 当選者数
* 作成日時

---

## Campaign Detail

### Conditions

```text
☑ RT
☑ Follow
☐ Like
☐ Reply
☐ Quote
☐ Hashtag
☐ Keyword Reply
```

### Statistics

```text
応募者数: 12,345
条件達成者数: 3,456
当選人数: 10
```

---

# Non Functional Requirements

## Performance

* 10万人規模の応募者に対応
* API Rate Limitを考慮した非同期処理
* BullMQによるバックグラウンドジョブ

---

## Security

* OAuth2
* Token Encryption
* CSRF Protection
* Rate Limiting

---

## Architecture

```text
Frontend
├── Next.js
├── React
├── TypeScript
└── TailwindCSS

Backend
├── NestJS
├── GraphQL
├── BullMQ
├── Redis
└── PostgreSQL

External
└── X API
```

---

# Future Features

* 条件ビルダー（AND / OR）
* 複数ポスト対応
* Discord参加条件
* メール登録条件
* Webhook通知
* 当選DM送信
* スケジュール抽選
* 公開抽選ページ
* 抽選結果の証明機能

---

# 開発ルール・ガイドライン

開発における基本方針、共通コーディング規約、および Docker Compose のビルド高速化ガイドラインについては、[AGENTS_BASE.md](file:///home/n1lsqn/workspaces/Ataru-X/AGENTS_BASE.md) を参照・厳守してください。

---

## 作業ログ

> エージェントはタスク完了時に必ずここに追記すること。
> 形式: `## YYYY-MM-DD <作業タイトル>`

<!-- ↓ここから追記 -->
## 2026-06-23 プロジェクト要件の追加
- ユーザーから提示された「Xキャンペーン抽選プラットフォーム」の要件定義を `agents.md` に追記・統合しました。

## 2026-06-23 キャンペーン抽選プラットフォームのフル実装
- モノレポ構造のセットアップ（ルート、frontend/、backend/）。
- PostgreSQLとRedisをDocker Composeで稼働するよう構成（ポート衝突回避対応）。
- バックエンド（NestJS / TypeORM / GraphQL / BullMQ）の構築：
  - データベースエンティティ（User, Campaign, CampaignCondition, Participant, Winner）を定義。
  - キャンペーン応募条件（RT, Follow, Like, Reply, Quote, Hashtag, Keyword Reply）の自動評価エンジンを実装。
  - BullMQを用いた応募者データの非同期取得・評価プロセスを実装。
  - SHA-256を用いた公平かつ再現可能な抽選ロジックを実装。
  - RESTコントローラーとGraphQLリゾルバーを完備。CSVエクスポート機能を搭載。
- フロントエンド（Next.js / TypeScript / TailwindCSS）の構築：
  - リアルタイム非同期進捗ポーリングに対応したインタラクティブなダッシュボードを作成。
  - キャンペーン一覧、条件設定画面、詳細スタッツ、抽選・再抽選機能、当選者一覧の表示に対応。

## 2026-06-23 アプリケーション全体のDocker Compose対応
- バックエンド（`backend/Dockerfile`）とフロントエンド（`frontend/Dockerfile`）のDockerfileを作成。
- `docker-compose.yml` を更新し、PostgreSQL・Redisに加えて、`backend`（NestJS）と `frontend`（Next.js）のビルド・コンテナ実行定義を追加。
- コンテナ間通信のための環境変数定義を調整。
- モノレポ構成内の package-lock.json 不整合による `npm ci` のビルドエラーを解決するため、Dockerfile のパッケージインストールを `npm install` に変更。
- npmピア依存関係のエラー（Apollo Server等のバージョン衝突）を解決するため、`--legacy-peer-deps` オプションを指定してインストールするように変更。
- ホスト側のポート衝突（ポート 3000）を回避するため、フロントエンドのホスト側ポートを `3009` に変更。
- `CampaignsModule` と `DrawsModule` 間の相互モジュールインポートによる `UndefinedModuleException` エラーを解消するため、両モジュールとサービス・コントローラーに `forwardRef` を適用して循環参照を回避。
- Dockerビルドの高速化（2および3）に向け、`.dockerignore`の定義に加え、Dockerfileの `npm install` 実行時に BuildKit の `npm` キャッシュマウント（`--mount=type=cache`）を導入。
- 共通開発ルールや Docker 高速化設定などの使い回せる項目を [AGENTS_BASE.md](file:///home/n1lsqn/workspaces/Ataru-X/AGENTS_BASE.md) へ切り出し、本ファイルを要件仕様にスリム化。

## 2026-06-23 本物の X (Twitter) API v2 連携機能の実装
- `twitter-api-v2` ライブラリをバックエンドに追加。
- X APIとのやり取りを行う [XApiService](file:///home/n1lsqn/workspaces/Ataru-X/backend/src/x-api/x-api.service.ts) を実装。
- `.env` に `X_BEARER_TOKEN` が定義されている場合は、本物の X API v2 にアクセスして指定ポストのRTユーザー・いいねしたユーザー・返信や引用RTの投稿データを取得・評価するよう構成。
- `X_BEARER_TOKEN` が定義されていない場合は、アプリケーションが停止せずデモ検証を行えるよう、ダミーデータを自動生成して動作する「シミュレーションモード」をフォールバックとして実装。
- 非同期応募者収集プロセス（`ParticipantFetchProcessor`）を更新し、取得した実際のXアクションのユーザーデータを集計・マッピングしてデータベース（PostgreSQL）に保存・評価するよう改修。