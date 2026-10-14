---
layout: post
title: "uvによるPythonパッケージ管理"
date: 2026-10-12 14:04:10 +0900
categories: ["Python"]
tags: ["Python", "uv", "パッケージ管理"]
---

# uvによるパッケージ管理📦

Pythonの開発環境を構築する際、`pip`や`venv`、`pyenv`など、複数のツールを組み合わせて利用している方も多いのではないでしょうか。

Pythonでは、パッケージのインストールだけでなく、仮想環境の管理、Python本体のバージョン管理、依存関係の固定など、開発環境を整えるためにさまざまな作業が必要です。

こうした作業を統合し、効率化できるツールが**uv**です。

本記事では、uvの基本的な仕組みを紹介したうえで、実際の開発現場を想定し、以下の内容を解説します。

- uvの特徴と従来のパッケージ管理ツールとの違い
- uvのインストールと初期設定
- プロジェクトの作成とパッケージ管理
- 依存関係の固定と開発環境の再現
- 既存のPythonプロジェクトへの導入
- DockerおよびGitHub Actionsでの活用
- 実務で利用する際の注意点

なお、本記事は2026年10月時点の公式ドキュメントを参考にしています。

---

## uvとは

**uvは、Astral社が開発しているRust製の高速なPythonパッケージ・プロジェクト管理ツールです。**

従来の`pip`や`pip-tools`、`virtualenv`などが担ってきた機能を統合し、Pythonの開発環境を一元的に管理できます。

公式サイトでは、次のように紹介されています。

> An extremely fast Python package and project manager, written in Rust.

uvの特徴は、単にパッケージのインストールを高速化しただけではない点です。

Python本体のインストールから仮想環境の構築、依存関係の管理、プログラムの実行まで、一連の作業をuvだけで実施できます。

Rustのパッケージマネージャである`Cargo`に近い操作体系を備えていることも特徴です。

公式サイト：https://docs.astral.sh/uv/

### 従来のパッケージ管理ツールとの違い

Pythonでは、用途ごとに異なるツールを利用することが一般的でした。

| ツール | 主な役割 |
|---|---|
| pip | Pythonパッケージのインストール |
| venv | 仮想環境の作成 |
| pyenv | Python本体のバージョン管理 |
| pip-tools | 依存関係の解決・固定 |
| pipx | CLIツールの分離インストール・実行 |
| Poetry | プロジェクトと依存関係の管理 |
| uv | これらの主要機能を統合 |

例えば、従来の構成では次のような手順で開発環境を構築していました。

```bash
# Pythonバージョンの指定
pyenv install 3.12
pyenv local 3.12

# 仮想環境の作成
python -m venv .venv

# 仮想環境の有効化
source .venv/bin/activate

# パッケージのインストール
pip install requests
```

uvを利用すると、次のように簡略化できます。

```bash
# プロジェクト作成
uv init --python 3.12 sample-project

cd sample-project

# パッケージの追加
uv add requests

# Pythonプログラムの実行
uv run python -c "import requests; print(requests.__version__)"
```

uvはプロジェクトに必要な仮想環境を自動的に構築・管理します。

また、必要なPythonがインストールされていない場合、対応するPythonを自動で取得することも可能です。

従来のように仮想環境を手動で有効化する必要はありません。

### uvを利用するメリット

実務上、特に重要なメリットは次の3つです。

**1. パッケージ管理の高速化**

uvはRustで実装されており、依存関係の解決、並列ダウンロード、キャッシュの再利用などによって高速なパッケージインストールを実現しています。

公式ベンチマークでは、条件によってpipより大幅に高速になることが報告されています。

特に、CI/CDなどで繰り返し開発環境を構築する場合に効果が期待できます。

**2. 開発環境の管理を統一できる**

Python本体、仮想環境、パッケージの依存関係を一元管理できます。

複数のプロジェクトを扱う場合でも、環境ごとの違いを管理しやすくなります。

**3. 依存関係を固定して環境を再現できる**

uvは`uv.lock`というロックファイルを利用します。

これにより、開発者間やCI/CD環境で同じ依存パッケージのバージョンを利用できます。

ただし、OSやCPUアーキテクチャによって必要なバイナリが異なるため、すべての環境で完全に同一のファイルがインストールされるわけではありません。

参考：[uv公式ドキュメント：プロジェクト管理](https://docs.astral.sh/uv/guides/projects/) [Astral Docs](https://docs.astral.sh/uv/guides/projects/)

---

## uvのインストール

uvはWindows、macOS、Linuxに対応しています。

ここでは代表的なインストール方法を紹介します。

### Windows

Windowsでは、PowerShellからインストールできます。

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Windows Package Manager（winget）を利用する場合は、次のコマンドでもインストールできます。

```powershell
winget install --id=astral-sh.uv -e
```

### macOS

Homebrewを利用する場合は、次のコマンドです。

```bash
brew install uv
```

公式インストーラーを利用する場合は、次のように実行します。

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Linux

Linuxでも公式インストーラーを利用できます。

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

実務環境では、インストールスクリプトを実行する前に内容を確認し、必要に応じてバージョンを固定することを推奨します。

### インストール確認

インストール後、次のコマンドで動作を確認します。

```bash
uv --version
```

uvのバージョンが表示されれば、インストールは完了です。

参考：[uv公式ドキュメント：インストール](https://docs.astral.sh/uv/getting-started/installation/) [Astral Docs](https://docs.astral.sh/uv/getting-started/installation/)

---

## uvを利用したPythonプロジェクトの構築

ここからは、実際にuvを利用してPythonプロジェクトを作成します。

今回は実務での利用を想定し、FastAPIを使用した簡単なWeb APIを構築します。

### 1. Pythonのインストール

まず、利用するPythonのバージョンを指定します。

今回はPython 3.12を使用します。

```bash
uv python install 3.12
```

インストール可能なPythonのバージョンは、次のコマンドで確認できます。

```bash
uv python list
```

uvで管理するPythonは、システムにインストールされているPythonとは別に管理できます。

そのため、システムのPython環境を変更せずに、複数のバージョンを使い分けることが可能です。

### 2. プロジェクトの作成

続いて、プロジェクトを作成します。

```bash
uv init --no-package --python 3.12 sample-api

cd sample-api
```

`uv init`はPythonプロジェクトを初期化するコマンドです。

今回は`--no-package`を指定しています。

これは、Pythonパッケージとして配布するのではなく、Webアプリケーションとして動作させるためです。

なお、uv 0.12以降では、通常の`uv init`はビルドシステムと`src/`ディレクトリを持つ構成を標準で生成します。

今回は説明を簡単にするため、`main.py`を直接実行する構成を採用しています。

作成されるディレクトリは、概ね次のようになります。

```text
sample-api/
├── .git/
├── .gitignore
├── .python-version
├── README.md
├── main.py
└── pyproject.toml
```

各ファイルの役割は次のとおりです。

| ファイル | 役割 |
|---|---|
| `.python-version` | 利用するPythonのバージョンを指定 |
| `pyproject.toml` | プロジェクト情報と依存パッケージの定義 |
| `main.py` | Pythonの実行ファイル |
| `.gitignore` | Git管理対象から除外するファイルの設定 |

プロジェクトの初期化時点では、まだ`uv.lock`や`.venv`が作成されていない場合があります。

これらは依存関係の追加や同期など、必要になったタイミングで生成されます。

### 3. パッケージの追加

FastAPIとASGIサーバーのUvicornをインストールします。

```bash
uv add fastapi uvicorn
```

`uv add`を実行すると、次の処理が行われます。

1. 指定したパッケージの依存関係を解決します。
2. `pyproject.toml`に依存関係を追記します。
3. `uv.lock`を作成または更新します。
4. 仮想環境にパッケージをインストールします。

従来の`pip install`とは異なり、**パッケージのインストールとプロジェクトの依存関係管理を一度に実行できます。**

追加されたパッケージは、`pyproject.toml`の`dependencies`に記録されます。

```toml
[project]
name = "sample-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi",
    "uvicorn",
]
```

※上記は説明用の簡略例です。実際にはuvがバージョン制約などを自動的に付与します。

### 4. Pythonアプリケーションの実装

`main.py`を次のように編集します。

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Hello, uv!"}


@app.get("/health")
def health():
    return {"status": "ok"}
```

今回は、次の2つのエンドポイントを実装しています。

| エンドポイント | 用途 |
|---|---|
| `/` | 動作確認 |
| `/health` | ヘルスチェック |

### 5. アプリケーションの実行

uvからアプリケーションを実行します。

```bash
uv run uvicorn main:app --reload
```

ブラウザで以下のURLにアクセスします。

http://127.0.0.1:8000/

次のJSONが表示されれば成功です。

```json
{
  "message": "Hello, uv!"
}
```

`uv run`はプロジェクトの仮想環境を利用してコマンドを実行します。

そのため、事前に次のような操作を行う必要はありません。

```bash
source .venv/bin/activate
```

また、`uv run`は通常、実行前に依存関係の整合性を確認して環境を同期します。

なお、`--reload`は開発用途のオプションです。本番環境では使用しません。

---

## 依存関係の管理

uvを実務で利用する場合、最も重要になるのが依存関係の管理です。

### パッケージの追加と削除

新しいパッケージを追加する場合は、`uv add`を実行します。

```bash
uv add requests
```

不要になった場合は、`uv remove`で削除できます。

```bash
uv remove requests
```

これらのコマンドでは、`pyproject.toml`と`uv.lock`の更新も行われます。

### 開発用パッケージの管理

Pythonプロジェクトでは、アプリケーションの実行に必要なパッケージと、開発時だけ使用するパッケージを分離することが重要です。

例えば、テストフレームワークの`pytest`や、リンターの`Ruff`は、本番アプリケーションの実行には不要です。

uvでは、`--dev`オプションで開発用の依存関係を追加できます。

```bash
uv add --dev pytest httpx ruff
```

追加したパッケージは、`pyproject.toml`の`[dependency-groups]`に記録されます。

```toml
[dependency-groups]
dev = [
    "pytest",
    "httpx",
    "ruff",
]
```

※実際のファイルにはバージョン制約が付与されます。

開発用パッケージは、通常の`uv sync`では標準でインストール対象に含まれます。

一方、本番環境では次のオプションを指定することで除外できます。

```bash
uv sync --no-dev
```

これにより、本番環境に不要なテストツールなどをインストールせずに済みます。

### 依存関係の確認

依存関係をツリー形式で確認するには、次のコマンドを使用します。

```bash
uv tree
```

例えば、FastAPIが内部で利用しているパッケージを確認できます。

依存関係の競合や、間接的にインストールされているパッケージを調査する際に便利です。

---

## uv.lockによる依存関係の固定

uvでは、プロジェクトの依存関係を`uv.lock`で管理します。

`pyproject.toml`と`uv.lock`には、明確な役割の違いがあります。

| ファイル | 内容 |
|---|---|
| `pyproject.toml` | パッケージの名前と許容するバージョン範囲 |
| `uv.lock` | 依存関係を解決した結果と正確なバージョン情報 |

例えば、`pyproject.toml`で次のように定義している場合です。

```toml
dependencies = [
    "requests>=2.31.0",
]
```

この定義では、`requests`の2.31.0以降がインストール対象になります。

そのため、実行する時期によって異なるバージョンが選択される可能性があります。

一方、`uv.lock`には依存関係の解決結果が記録されます。

これにより、ロックされたバージョンを利用して環境を再構築できます。

### ロックファイルの作成

ロックファイルを明示的に作成・更新する場合は、次のコマンドを使用します。

```bash
uv lock
```

ただし、通常は`uv add`などの実行時に自動更新されるため、毎回手動で実行する必要はありません。

### ロックファイルから環境を再構築する

例えば、GitHubからPythonプロジェクトをクローンした場合を考えます。

```bash
git clone https://github.com/example/sample-api.git

cd sample-api
```

開発環境を再構築するには、次のコマンドを実行します。

```bash
uv sync --locked
```

`--locked`は、`uv.lock`が`pyproject.toml`と整合していることを確認し、ロックファイルを更新せずに同期するオプションです。

整合していない場合はエラーになります。

CI/CDでは、意図せず依存関係が変更されることを防ぐため、`--locked`の使用を推奨します。

### --lockedと--frozenの違い

この2つは混同しやすいため、違いを整理します。

| オプション | 動作 |
|---|---|
| `--locked` | ロックファイルを変更せず、最新の定義と整合しているか確認 |
| `--frozen` | ロックファイルの整合性確認を省略し、記録された内容を利用 |

例えば、次のコマンドです。

```bash
uv sync --frozen
```

この場合、`pyproject.toml`が変更されていても、ロックファイルが古いことを検出せずに同期する可能性があります。

したがって、**CI/CDで依存関係の整合性を保証したい場合は、基本的に`--locked`を利用する方が適切です。**

参考：[uv公式ドキュメント：Locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/) [Astral Docs](https://docs.astral.sh/uv/concepts/projects/sync/)

---

## パッケージのアップデート

開発を継続するうえで、依存パッケージの更新は避けられません。

特に、セキュリティ上の脆弱性が発見された場合、影響を受けるパッケージを更新する必要があります。

### 特定パッケージの更新

例えば、`requests`を更新する場合です。

```bash
uv lock --upgrade-package requests
```

このコマンドは、既存のバージョン制約を満たす範囲で、指定したパッケージの更新を試みます。

実行後、仮想環境にも反映します。

```bash
uv sync --locked
```

### すべてのパッケージの更新

すべての依存パッケージを更新する場合は、次のコマンドです。

```bash
uv lock --upgrade
```

続いて環境を同期します。

```bash
uv sync --locked
```

ただし、一括更新には注意が必要です。

依存パッケージの更新によってAPIの仕様や動作が変更され、アプリケーションに影響する可能性があります。

実務では、セキュリティ上の理由などがない限り、影響範囲を確認しながら段階的に更新することを推奨します。

なお、`uv lock --upgrade`でも`pyproject.toml`に記述されたバージョン制約を超えて更新されるわけではありません。

---

## pytest・Ruffとの連携

続いて、先ほど作成したFastAPIアプリケーションにテストとコードチェックを導入します。

### pytestによるテスト

プロジェクト内に`tests`ディレクトリを作成し、`test_main.py`を配置します。

```text
sample-api/
├── tests/
│   └── test_main.py
├── main.py
├── pyproject.toml
└── uv.lock
```

`tests/test_main.py`に次のコードを記述します。

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

テストを実行します。

```bash
uv run pytest
```

`uv run`を利用することで、プロジェクトに定義された開発用パッケージを使用してテストできます。

### Ruffによるコードチェック

RuffはRust製のPython向けリンター・フォーマッターです。

先ほど`uv add --dev ruff`で追加したため、次のコマンドで実行できます。

```bash
uv run ruff check .
```

コードの整形には、次のコマンドを使用します。

```bash
uv run ruff format .
```

CI/CDではコードを自動変更しないよう、チェックモードを利用します。

```bash
uv run ruff format --check .
```

これにより、Pythonの実行環境だけでなく、開発ツールもプロジェクト単位で管理できます。

---

## 既存のpipプロジェクトから移行する

既存プロジェクトで`requirements.txt`を使用している場合でも、uvを導入できます。

移行方法は大きく2つあります。

### 方法1：requirements.txtを維持する

既存のファイル構成を変更せず、インストール処理だけをuvに置き換える方法です。

まず、仮想環境を作成します。

```bash
uv venv
```

続いて、依存パッケージをインストールします。

```bash
uv pip install -r requirements.txt
```

これにより、従来の`pip install`に近い操作方法でuvを利用できます。

ただし、`uv pip`は通常のプロジェクト管理コマンドとは異なり、`uv.lock`を自動管理しません。

この方法は、既存プロジェクトへの影響を最小限に抑えたい場合に向いています。

### 方法2：uvのプロジェクト管理に移行する

uvの機能を本格的に利用する場合は、`pyproject.toml`へ移行します。

プロジェクトに`pyproject.toml`がない場合は、まずuvで初期化します。

```bash
uv init --no-package
```

続いて、`requirements.txt`に記載されたパッケージを追加します。

```bash
uv add -r requirements.txt
```

これにより、依存関係が`pyproject.toml`に取り込まれ、`uv.lock`が生成されます。

以降は、次のコマンドで環境を管理できます。

```bash
uv sync
```

ただし、Git依存関係やローカルパッケージ、プライベートリポジトリなどを利用している場合は、移行後の設定を確認する必要があります。

また、既存の`requirements.txt`に開発用パッケージが含まれている場合、必要に応じて開発用依存関係へ分離してください。

### requirements.txtの出力

uvで管理している依存関係を`requirements.txt`形式で出力することも可能です。

```bash
uv export --format requirements.txt --no-dev --output-file requirements.txt
```

従来のpipベースのデプロイ環境と連携する場合に利用できます。

参考：[uv公式ドキュメント：pipからの移行](https://docs.astral.sh/uv/guides/migration/pip-to-project/) [Astral Docs](https://docs.astral.sh/uv//guides/migration/pip-to-project/?utm_source=chatgpt.com)

---

## Dockerでuvを利用する

ここからは、DevOpsの観点でuvを活用する方法を紹介します。

Pythonアプリケーションをコンテナ化する場合、依存関係のインストール時間はDockerイメージのビルド時間に影響します。

uvを利用することで、パッケージのインストールを高速化しつつ、ロックファイルに基づいて環境を構築できます。

### Dockerfileの作成

先ほど作成したFastAPIアプリケーションをコンテナ化します。

```dockerfile
FROM python:3.12-slim

# uvの導入
COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /uvx /bin/

WORKDIR /app

# Pythonの自動ダウンロードを無効化
ENV UV_PYTHON_DOWNLOADS=0

# 依存関係の定義ファイルをコピー
COPY pyproject.toml uv.lock ./

# 本番用の依存パッケージをインストール
RUN uv sync --locked --no-dev --no-install-project

# アプリケーションをコピー
COPY main.py ./

# 仮想環境のコマンドを利用
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

このDockerfileには、いくつかの工夫があります。

**① uvのバージョンを固定する**

```dockerfile
COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /uvx /bin/
```

uvのバージョンを固定することで、ツールの更新によってビルド結果が変化するリスクを抑えます。

厳密な再現性が必要な場合は、イメージタグではなくダイジェストで固定することが望ましいです。

**② 開発用パッケージを除外する**

```dockerfile
RUN uv sync --locked --no-dev --no-install-project
```

`--no-dev`で開発用パッケージを除外します。

また、`--no-install-project`を指定することで、プロジェクト本体をインストール対象から除外します。

今回のサンプルは`--no-package`で作成しているため、プロジェクト自体のインストールは不要です。

**③ Dockerのレイヤーキャッシュを活用する**

```dockerfile
COPY pyproject.toml uv.lock ./

RUN uv sync --locked --no-dev --no-install-project

COPY main.py ./
```

依存関係のインストールとアプリケーションのコピーを分離しています。

これにより、`main.py`だけを変更した場合、依存関係のインストール済みレイヤーを再利用できます。

### .dockerignoreの設定

次のファイルをDockerのビルドコンテキストから除外します。

```gitignore
.venv/
.git/
__pycache__/
.pytest_cache/
.ruff_cache/
```

特に`.venv`は、開発環境とコンテナでOSやアーキテクチャが異なる可能性があるため、コンテナ内で再構築することが重要です。

### Dockerイメージのビルド

```bash
docker build -t sample-api .
```

コンテナを起動します。

```bash
docker run --rm -p 8000:8000 sample-api
```

ブラウザで以下にアクセスします。

http://localhost:8000/health

```json
{
  "status": "ok"
}
```

これで、uvを利用したPythonアプリケーションをDocker上で実行できます。

本番環境ではさらに、非rootユーザーでの実行、ベースイメージの固定、ヘルスチェック、マルチステージビルドなども検討します。

参考：[uv公式ドキュメント：Dockerでの利用](https://docs.astral.sh/uv/guides/integration/docker/) [Astral Docs](https://docs.astral.sh/uv/guides/integration/docker/?utm_source=chatgpt.com)

---

## GitHub Actionsでuvを利用する

uvはCI/CDパイプラインでも利用できます。

GitHub Actionsには、uv公式の`astral-sh/setup-uv`アクションが用意されています。

これを利用することで、uvのインストールやキャッシュ管理を簡単に設定できます。

### ワークフローの作成

`.github/workflows/test.yml`を作成します。

```yaml
name: Python CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Install uv
        uses: astral-sh/setup-uv@c771a70e6277c0a99b617c7a806ffedaca235ff9 # v9.0.0
        with:
          version: "0.13.0"
          enable-cache: true

      - name: Install Python
        run: uv python install 3.12

      - name: Install dependencies
        run: uv sync --locked

      - name: Run tests
        run: uv run --locked pytest

      - name: Run linter
        run: uv run --locked ruff check .

      - name: Check formatting
        run: uv run --locked ruff format --check .
```

このワークフローでは、次の処理を実行します。

1. GitHubリポジトリのソースコードを取得します。
2. uvとPythonをインストールします。
3. ロックファイルに基づいて依存関係をインストールします。
4. pytestによる単体テストを実行します。
5. Ruffによるコードチェックを実行します。

### CI/CDでuvを利用するメリット

特に重要なのは、ローカルの開発環境とCI/CD環境で同じロックファイルを使用する点です。

```text
開発者のPC
    │
    ├── pyproject.toml
    ├── uv.lock
    │
    ▼
GitHub Repository
    │
    ▼
GitHub Actions
    │
    ├── uv sync --locked
    │
    ├── pytest
    │
    └── ruff
```

これにより、開発者のPCとCI/CDで異なる依存バージョンが利用されるリスクを減らせます。

また、`enable-cache: true`を指定することで、uvのパッケージキャッシュをワークフロー間で再利用できます。

ただし、キャッシュの効果は依存パッケージや実行環境によって異なります。

参考：[uv公式ドキュメント：GitHub Actions](https://docs.astral.sh/uv/guides/integration/github/) [Astral Docs](https://docs.astral.sh/uv/guides/integration/github/)

---

## uvxによるCLIツールの実行

uvには、`uvx`というコマンドも用意されています。

これは、Python製のCLIツールを隔離された環境で実行するためのコマンドです。

例えば、Ruffを試したい場合です。

```bash
uvx ruff check .
```

対象のツールが存在しなければ、必要なパッケージを取得して実行します。

取得したパッケージはキャッシュされるため、再実行時にはキャッシュを利用できます。

`uvx`は、`uv tool run`のエイリアスです。

一時的にCLIツールを利用したい場合に便利ですが、**プロジェクトのCI/CDで利用するツールは、`uv add --dev`で依存関係に追加することを推奨します。**

`uvx`はプロジェクトとは別の隔離環境を使用するため、そのままではプロジェクトの`uv.lock`で管理されません。

---

## 実務でuvを利用する際の注意点

uvは便利なツールですが、導入するだけで開発環境に関する問題がすべて解決するわけではありません。

特に、以下の点には注意が必要です。

### 1. uv.lockはGitで管理する

`uv.lock`はGit管理対象に含めます。

一方、`.venv`はGitで管理する必要はありません。

```gitignore
.venv/
```

ロックファイルを共有することで、複数の開発者が同じ依存バージョンを利用できるようになります。

### 2. Pythonのバージョンも明示する

パッケージだけでなく、Python本体のバージョンも重要です。

```bash
uv python pin 3.12
```

このコマンドは、`.python-version`に使用するPythonのバージョンを記録します。

ただし、`.python-version`と`pyproject.toml`の`requires-python`は役割が異なります。

前者はローカル環境で使用するPythonの選択、後者はプロジェクトが対応するPythonのバージョン範囲を定義します。

バージョンを変更する際は、両方の整合性を確認してください。

### 3. uvはpipと完全互換ではない

`uv pip`はpipに近い操作方法を提供していますが、完全互換ではありません。

例えば、uvは`pip.conf`や`PIP_INDEX_URL`などのpip専用設定を読み込みません。

プライベートパッケージリポジトリなどを利用している場合は、uv用の設定へ変更する必要があります。

参考：[uv公式ドキュメント：pipとの互換性](https://docs.astral.sh/uv/pip/compatibility/) [Astral Docs](https://docs.astral.sh/uv/pip/compatibility/?utm_source=chatgpt.com)

### 4. 依存関係の固定とセキュリティ対策は別問題

`uv.lock`を利用していても、セキュリティ上の脆弱性が自動的に修正されるわけではありません。

ロックファイルは、依存関係の再現性を確保するための仕組みです。

したがって、運用時にはGitHub DependabotやRenovateなどを利用し、依存パッケージの脆弱性と更新状況を継続的に確認する必要があります。

また、uvには既知の脆弱性を調べる`uv audit`コマンドも用意されていますが、2026年10月時点ではプレビュー機能です。

利用するバージョンでの対応状況を確認してください。

---

## よく使用するuvコマンド一覧

最後に、実務で利用することが多いコマンドをまとめます。

| コマンド | 用途 |
|---|---|
| `uv init` | プロジェクトを作成 |
| `uv python install 3.12` | Python 3.12をインストール |
| `uv python pin 3.12` | Pythonバージョンを指定 |
| `uv add requests` | パッケージを追加 |
| `uv add --dev pytest` | 開発用パッケージを追加 |
| `uv remove requests` | パッケージを削除 |
| `uv sync` | 依存関係を同期 |
| `uv sync --locked` | ロックファイルを検証して同期 |
| `uv sync --no-dev` | 開発用パッケージを除外して同期 |
| `uv lock` | ロックファイルを作成・更新 |
| `uv lock --upgrade` | 依存パッケージを更新 |
| `uv lock --upgrade-package requests` | 指定パッケージを更新 |
| `uv tree` | 依存関係をツリー表示 |
| `uv run main.py` | Pythonプログラムを実行 |
| `uv run pytest` | テストを実行 |
| `uvx ruff check .` | CLIツールを隔離環境で実行 |
| `uv export` | 依存関係を別形式で出力 |
| `uv pip install -r requirements.txt` | 既存のrequirements.txtからインストール |

---

## まとめ

uvは、Python開発で利用されてきた複数のツールの機能を統合したパッケージ・プロジェクト管理ツールです。

最大の特徴は、パッケージインストールの高速化だけでなく、**開発環境の構築から依存関係の固定、アプリケーションの実行までを一貫して管理できること**です。

特に、複数人で開発するプロジェクトや、Docker・CI/CDを利用する開発環境では、依存関係をロックファイルで管理することによるメリットが大きいと考えます。

一方で、既存のpipやPoetryを利用しているプロジェクトを、無理にすべてuvへ移行する必要はありません。

既存の運用が安定しているのであれば、移行に伴う互換性の問題や保守コストを考慮するべきです。

まずは`uv pip`を利用してインストール処理だけを置き換え、効果を確認してからプロジェクト管理全体を移行する方法も有効です。

新規のPythonプロジェクトであれば、最初からuvを採用することで、環境構築や依存関係管理の手間を減らせます。

今後、Pythonの開発環境を構築する際には、uvを選択肢の一つとして検討してみてはいかがでしょうか。

### 参考資料

- [uv公式ドキュメント](https://docs.astral.sh/uv/)
- [uv GitHubリポジトリ](https://github.com/astral-sh/uv)
- [Pythonプロジェクトの管理](https://docs.astral.sh/uv/guides/projects/)
- [依存関係のロックと同期](https://docs.astral.sh/uv/concepts/projects/sync/)
- [Dockerとの連携](https://docs.astral.sh/uv/guides/integration/docker/)
- [GitHub Actionsとの連携](https://docs.astral.sh/uv/guides/integration/github/)
