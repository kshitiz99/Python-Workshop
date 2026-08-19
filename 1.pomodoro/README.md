## エージェント Workflow のセットアップ（Pomodoro Documentation Sync）

`.github/workflows/pomodoro-docs-sync.md`（Agentic Workflow）は `1.pomodoro/` 配下のコード変更を検知し、ドキュメントを自動更新する GitHub Actions ワークフローです。このワークフローは実行時に GitHub Copilot CLI エンジンを使用するため、リポジトリに以下のシークレットが設定されている必要があります。

- **`COPILOT_GITHUB_TOKEN`**: GitHub Copilot Requests 権限（Read）を持つ fine-grained personal access token

このシークレットが未設定の場合、ワークフロー起動時のシークレット検証ステップが失敗し、`⚠️ Secret Verification Failed` という内容の Issue が自動生成されます（本リポジトリは Organization ではなく個人リポジトリのため、`copilot-requests: write` 権限による `GITHUB_TOKEN` 代替は利用できません）。

### 設定手順

1. GitHub 上でこのリポジトリの **Settings** を開く
2. **Secrets and variables** → **Actions** を選択
3. **New repository secret** をクリック
4. Name に `COPILOT_GITHUB_TOKEN`、Secret に Copilot Requests（Read）権限を付与した fine-grained PAT を入力して保存

詳細は [GitHub Agentic Workflows の認証ドキュメント](https://github.github.com/gh-aw/reference/auth/) を参照してください。
