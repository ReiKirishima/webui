# 特定の UI バージョンのテスト

TrueNAS WebUI の最新バージョンと各 PR は、Docker イメージの形でテストすることもできます。

UI を指すには、実行中の TrueNAS インスタンスが必要です。

例:

```sh
$ docker container run -it -e TNIP=<TrueNASのIPまたはホスト名> -p 8080:80 ixsystems/truenas-webui:latest
```

こうすると、http://localhost:8080 で実行中のWebUIでアクセスすることができます。

この方法でプルリクエストをテストするには、`:latest`をプルリクエストIDに置き換えてください。

```sh
$ docker container run -it -e TNIP=<TrueNASのIPまたはホスト名> -p 8080:80 ixsystems/truenas-webui:5167
```
