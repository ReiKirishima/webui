# TrueNAS UI を翻訳する

## TL;DR

:point_right: `src/assets/i18n` 内にあるファイルを翻訳してプルリクを送信してください。
日本語は
src/assets/i18n/ja.json

## 詳細

TrueNAS UI を翻訳するための JSON ファイルはすべて [src/assets/i18n](https://github.com/truenas/webui/tree/master/src/assets/i18n)にあります。 \
これらのファイルは、お好みのエディタを使って編集するか、GitHub上で直接編集することができます。

翻訳は文字列の右側に追加する必要があります。例えば:

```
"1 day": "",
```

は

```
"1 day": "1 日",
```

となります。

## ブランチ

異なるブランチは異なるバージョンの TrueNAS に対応しています。

物事をシンプルにするために、`master` ブランチに変更を加えることをお勧めします。\
あなたの PR がマージされた後、変更は次のナイトリーに表示されます。

## コツ

- ソースファイルはしばしば変更されるので、衝突を避けるためには、一度にすべてを翻訳しようとするのではなく、複数の小さなPRを作成する方がよいでしょう。
- CIジョブはあなたの変更を検証し、問題があれば失敗する。
- 翻訳文字列をローカルで検証したい場合は、Node.jsと`yarn`をインストールし、`yarn install`を行い、プロジェクトのルートで`yarn validate-translations`を実行する必要がある。

## プレースホルダ トークン

文字列の中には、プレースホルダトークン `{curly braces}` が使われています。

例えば:

```
"Delete {file}?": "",
```

UIでは`{file}`はファイル名に置き換えられ、`"Delete myfile.txt?"`のような文字列になります。

これらのトークンは翻訳された文字列の中にそのまま残しておくべきですが、必要に応じて移動させることもできます。

```
"Delete {file}?": "{file}を削除しますか？",
```

## 複数形

文字列によっては[ICU Message Format](https://formatjs.io/docs/core-concepts/icu-syntax/#plural-format)を使って複数形にすることができます。

例えば、

```
{n, plural, one {User} other {# users}} deleted
```

は `n` の値によって `User deleted` または `5 users deleted` のどちらかを表示します。

中括弧の中はすべてICUメッセージフォーマットの一部です。

この例は次のように読めます：

1. `n`の値を見てください。
2. `n` が `one` なら `User` と表示する。
3. もし `n` がそれ以外の値なら、 `# users` と表示する。
4. 最後に `deleted` を追加する。

## さまざまな言語における複数形

言語によって複数形の表現方法は異なります。

英語では複数形は名詞の形を変えることで表現されます：`User -> users`。

スペイン語では、名詞と動詞の両方が変化することがあります：`Usuario eliminado -> Usuarios eliminados`。

次のように表現できます：

```
{n, plural, one {Usuario eliminado} other {# usuarios eliminados}}
```

もしあなたの言語が、単数形か複数形かに関係なく同じ形の単語を持っているなら、適切な部分を単一の形に置き換えればいいです：

```
"({n, plural, =1 {# widget} other {# widgets}})": "({n} 个小部件)",
```

ロシア語はさらに複雑な複数形を持つ言語の一例です。

ロシア語では、「ユーザー」という単語は、ユーザーの数によって3つの異なる形があります：

- `1` (one) - `пользователь`
- `2, 3, 4` (few) - `пользователя`
- `5, 6, 7, 8, 9, 0` (other) - `пользователей`

これは次のように表現することができます：

```
{n, plural, =1 {Пользователь удален} few{# пользователя удалено} other {# пользователей удалено}}
```

複数形をどのように表現するかは、その言語のICUメッセージ・フォーマットを調べる必要があります。

[オンラインエディター](http://format-message.github.io/icu-message-format-for-translators/editor.html)で複数形の文字列をテストするのも役に立つでしょう。

## コードで貢献する
ちなみに、コードの投稿も歓迎します。\
[貢献する方法を学ぶ](https://github.com/ReiKirishima/webui/blob/Japanese-Translation/docs/contributing_code.md)
