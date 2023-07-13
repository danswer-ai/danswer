# Contributing to Danswer
Hey there! We are so excited that you're interested in Danswer.

As an open source project in a rapidly changing space, we welcome all contributions.


## 💃 Guidelines
### Contribution Opportunities
If you're interested in contributing, but don't have anything specific in mind check out the [issues](https://github.com/danswer-ai/danswer/issues) 
page for contribution ideas. Issues that are good for those new to the code base will be marked with a `good first issue` label. Issues that have
been explicitly approved by the maintainers (and thus are assured to be aligned with the direction of the project) will be marked with a `approved by maintainers` label 
(something marked wtih `good first issue` also has approval). If you see another issue that isn't labeled but sounds interesting, don't hesitate to reach out to
us in [Slack](https://join.slack.com/t/danswer/shared_invite/zt-1u3h3ke3b-VGh1idW19R8oiNRiKBYv2w) or [Discord](https://discord.gg/TDJ59cGV2X)!

If you do have a specific contributon in mind, we'd love to hear about it! Your input is vital to making sure that Danswer moves in the right / best direction. 
With that being said, please raise a Github issue before starting on implementation. We value your time, and want to make sure
what you're working on is aligned with the direction of the project. Alternatively, feel free to message us (Chris Weaver / Yuhong Sun) on Slack / Discord 
directly about what you're thinking of adding. 

### Contributing Code
To contribute to this project, please follow the
["fork and pull request"](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) workflow.
When opening a pull request, mention related issues and feel free to tag relevant maintainers.

Before creating a pull request please make sure that the new changes conform to the formatting and linting requirements.
See the [Formatting and Linting](#-formatting-and-linting) section for how to run these checks locally.

### Getting Help 🙋
Our goal is to make contributing as easy as possible. If you run into any issues setting up Danswer whether for
development or for usage purposes, please don't hesitate to reach out.
Hopefully we can put out a fix and help future contributors and users can avoid the same issue.

We also have support channels and generally interesting discussions on our
[Slack](https://join.slack.com/t/danswer/shared_invite/zt-1u3h3ke3b-VGh1idW19R8oiNRiKBYv2w)
and 
[Discord](https://discord.gg/TDJ59cGV2X).

We would love to see you there!

## Get Started 🚀
Danswer being a fully functional app, relies on several external pieces of software, specifically:
- Postgres
- Vector DB ([Qdrant](https://github.com/qdrant/qdrant))
- Search Engine ([Typesense](https://github.com/typesense/typesense))

This guide provides instructions to set up the Danswer specific services outside of Docker because it's easier for
development purposes but feel free to just use the containers and update with local changes by providing the `--build`
flag.

### Local Set Up
We've tested primarily with Python versions >= 3.11 but the code should work with Python >= 3.9.

This guide skips a few optional features for simplicity, reach out if you need any of these:
- User Authentication feature
- File Connector background job

#### Installing Requirements
We have plans to move to Poetry however it's not a high priority item (does anyone want to take it up?).

For now, we use pip and recommend creating a virtual environment. For convenience here's a command for it:
```bash
python -m venv .venv
source .venv/bin/activate
```

Install the required python dependencies:
```bash
python install -r danswer/backend/requirements/default.txt
python install -r danswer/backend/requirements/dev.txt
```

Install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for the frontend.
Once the above is done, navigate to `danswer/web` run:
```bash
npm i
```

Install Playwright (only required for Web Connector)
```bash
playwright install
```

#### Dependent Docker Containers
Postgres:
```bash
docker compose -f docker-compose.dev.yml -p danswer-stack up -d --build relational_db
```

Qdrant:
```bash
docker compose -f docker-compose.dev.yml -p danswer-stack up -d --build vector_db
```

Typesense:
```bash
docker compose -f docker-compose.dev.yml -p danswer-stack up -d --build search_engine
```
#### Running Danswer
To start the frontend, navigate to `danswer/web` and run:
```bash
DISABLE_AUTH=true npm run dev
```

To run the backend api server, navigate to `danswer/backend` and run:
```bash
DISABLE_AUTH=True TYPESENSE_API_KEY=local_dev_typesense DYNAMIC_CONFIG_DIR_PATH=./dynamic_config_storage uvicorn danswer.main:app --reload --port 8080
```

To run the background job to check for connector updates and index documents, navigate to `danswer/backend` and run:
```bash
TYPESENSE_API_KEY=local_dev_typesense DYNAMIC_CONFIG_DIR_PATH=./dynamic_config_storage python danswer/main.py
```


### Formatting and Linting
#### Backend
For the backend, you'll need to setup pre-commit hooks (black / reorder-python-imports). First, install pre-commit
(if you don't have it already), following the instructions [here](https://pre-commit.com/#installation). Then, from the 
`danswer/backend` directory, run:
```bash
pre-commit install
```

Additionally, we use `mypy` for static type checking. Danswer is fully type-annotated, and we would like to keep it that way! 
Right now, there is no automated type checking at the moment (coming soon), but we ask you to manually run it before creating 
a pull requests with `python -m mypy .` from the `danswer/backend` directory.

#### Web
We use `prettier` for formatting. Following the guide [here](https://prettier.io/docs/en/install.html) to install, and run 
`npx prettier --write .` from the `danswer/web` directory to automatically format. Like `mypy`, we have no automated formatting
yet (coming soon), but we request that, for now, you run this manually before creating a pull request.


### Need Inspiration? 💡
We try to keep up our [issues](https://github.com/danswer-ai/danswer/issues) page updated with the latest
feature requests, bugs, other improvements. This would be a great place to start!

Connectors to other tools are also a great place to contribute, the required interfaces are outlined
[here](https://github.com/danswer-ai/danswer/blob/main/backend/danswer/connectors/interfaces.py)
and many examples can be found under the `danswer/backend/danswer/connectors` directory.

Some other potential areas to consider (in increasing complexity):
1. Vote on or create GitHub Issues for features and connectors so devs know what is in high demand.
2. Improve code quality, documentation, or adding unit test
3. Fix bugs (generally found in GitHub Issues,
[Slack](https://join.slack.com/t/danswer/shared_invite/zt-1u3h3ke3b-VGh1idW19R8oiNRiKBYv2w)
or  
[Discord](https://discord.gg/TDJ59cGV2X))
4. Improve the core functionalities of search and question-answering
   - NLP is a rapidly advancing space currently, we want to use the latest developments from opensource, academia, etc.
   to make the core functionality as strong as possible.
   - This could include changes to document processing (chunking), search/retrival, GenAI prompts, NLP models, etc.


### Release Process
Danswer follows the semver versioning standard.
A set of Docker containers will be pushed automatically to DockerHub with every tag.
You can see the containers [here](https://hub.docker.com/search?q=danswer%2F).

As pre-1.0 software, even patch releases may contain breaking or non-backwards-compatible changes.
