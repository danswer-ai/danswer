<h2 align="center">
<a href="https://www.danswer.ai/"> <img width="50%" src="https://github.com/danswer-owners/danswer/blob/1fabd9372d66cd54238847197c33f091a724803b/DanswerWithName.png?raw=true)" /></a>
</h2>

<p align="center">
<p align="center">OpenSource Enterprise Question-Answering</p>

<p align="center">
<a href="https://docs.danswer.dev/" target="_blank">
    <img src="https://img.shields.io/badge/docs-view-blue" alt="Documentation">
</a>
<a href="https://join.slack.com/t/danswer/shared_invite/zt-1u5ycen3o-6SJbWfivLWP5LPyp_jftuw" target="_blank">
    <img src="https://img.shields.io/badge/slack-join-blue.svg?logo=slack" alt="Slack">
</a>
<a href="https://discord.gg/TDJ59cGV2X" target="_blank">
    <img src="https://img.shields.io/badge/discord-join-blue.svg?logo=discord&logoColor=white" alt="Discord">
</a>
<a href="https://github.com/danswer-ai/danswer/blob/main/README.md" target="_blank">
    <img src="https://img.shields.io/static/v1?label=license&message=MIT&color=blue" alt="License">
</a>
</p>

<strong>[Danswer](https://www.danswer.ai/)</strong> allows you to ask natural language questions against internal documents and get back reliable answers backed by quotes and references from the source material so that you can always trust what you get back. You can connect to a number of common tools such as Slack, GitHub, Confluence, amongst others.

<h3>Usage</h3>

Danswer provides a fully-featured web UI:


https://github.com/danswer-ai/danswer/assets/25087905/619607a1-4ad2-41a0-9728-351752acc26e


Or, if you prefer, you can plug Danswer into your existing Slack workflows (more integrations to come 😁):


https://github.com/danswer-ai/danswer/assets/25087905/3e19739b-d178-4371-9a38-011430bdec1b


For more details on the admin controls, check out our <strong><a href="https://www.youtube.com/watch?v=geNzY1nbCnU">Full Video Demo</a></strong>!

<h3>Deployment</h3>

Danswer can easily be tested locally or deployed on a virtual machine with a single `docker compose` command. Checkout our [docs](https://docs.danswer.dev/quickstart) to learn more.

We also have built-in support for deployment on Kubernetes. Files for that can be found [here](https://github.com/danswer-ai/danswer/tree/main/deployment/kubernetes).

## 💃 Features 
* Direct QA powered by Generative AI models with answers backed by quotes and source links.
* Intelligent Document Retrieval (Semantic Search/Reranking) using the latest LLMs.
* An AI Helper backed by a custom Deep Learning model to interpret user intent.
* User authentication and document level access management.
* Support for an LLM of your choice (GPT-4, Llama2, Orca, etc.)
* Management Dashboard to manage connectors and set up features such as live update fetching.
* One line Docker Compose (or Kubernetes) deployment to host Danswer anywhere.

## 🔌 Connectors 

Danswer currently syncs documents (every 10 minutes) from:
  * Slack
  * GitHub
  * Google Drive
  * Confluence
  * Jira
  * Notion
  * Slab
  * Linear
  * Productboard
  * Guru
  * Zulip
  * Bookstack
  * Local Files
  * Websites
  * With more to come...

## 🚧 Roadmap
* Chat/Conversation support.
* Organizational understanding.
* Ability to locate and suggest experts.

## 💡 Contributing
Looking to contribute? Please check out the [Contribution Guide](CONTRIBUTING.md) for more details.
