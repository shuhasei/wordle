# 5文字英単語チェーン

Cloudflare Pages Functionsを利用し、Datamuse APIから5文字の英単語を取得するゲームです。

## ファイル構成

```text
word-chain/
├── index.html
├── _headers
├── .gitignore
├── wrangler.toml
└── functions/
    └── api/
        └── words.js
```

## Cloudflare Pagesで公開する方法

1. このフォルダをGitHubリポジトリへアップロードします。
2. Cloudflare Dashboardで「Workers & Pages」を開きます。
3. 「Create application」→「Pages」→「Connect to Git」を選択します。
4. 対象のGitHubリポジトリを選択します。
5. フレームワークプリセットは「None」にします。
6. ビルドコマンドは空欄にします。
7. ビルド出力ディレクトリは `.` にします。
8. デプロイします。

## ローカル確認

Node.jsとWranglerを利用できる環境では、プロジェクトフォルダで次を実行します。

```bash
npx wrangler pages dev .
```

表示されたローカルURLをブラウザで開いてください。

`index.html`を直接ダブルクリックしただけでは、Pages Functionの `/api/words` が動かないため、ゲームは開始できません。
