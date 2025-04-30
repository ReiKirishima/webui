# 開発環境のセットアップ

## 必要条件

- yarn >= 1.22
- Node.js >= 18.19.1
- 実行中のTrueNASナイトリーのインスタンス（VMでもいいです）。

> [!TIP]
> `master`ブランチは通常TrueNASのナイトリーに対応しますが、比較的新しいTrueNASインスタンスであれば、masterでないTrueNASインスタンスでもmaster WebUIを実行できる場合があります。

## コードの取得
- WebUI repoをクローンする：

```sh
$ git clone <webui リポジトリまたはあなたのフォークの url>
$ cd webui
```

- パッケージをインストールする：

```sh
$ yarn
```

- 環境ファイルを作成し、TrueNAS インスタンスを指定します：

```sh
$ yarn ui remote -i <TrueNAS が稼働しているサーバーの IP アドレスまたはホスト名>
```

> [!TIP]
> 環境ファイルに何か問題がある場合は、`yarn ui reset` で環境ファイルを再設定し、再度 `yarn ui remote -i ` を実行してください。

## アプリケーションの実行

- WebUIを開発モードで起動します：

```sh
yarn start
```

- ブラウザでWebUIを開く。デフォルトでは、http://localhost:4200。



