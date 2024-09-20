<!-- onyx_METADATA={"link": "https://github.com/onyx-ai/onyx/blob/main/README.md"} -->

<h2 align="center">
<a href="https://www.onyx.ai/"> <img width="50%" src="https://github.com/onyx-owners/onyx/blob/1fabd9372d66cd54238847197c33f091a724803b/onyxWithName.png?raw=true)" /></a>
</h2>

<p align="center">
<p align="center">Open Source Gen-AI Chat + Unified Search.</p>

<p align="center">
<a href="https://docs.onyx.dev/" target="_blank">
    <img src="https://img.shields.io/badge/docs-view-blue" alt="Documentation">
</a>
<a href="https://join.slack.com/t/onyx/shared_invite/zt-2lcmqw703-071hBuZBfNEOGUsLa5PXvQ" target="_blank">
    <img src="https://img.shields.io/badge/slack-join-blue.svg?logo=slack" alt="Slack">
</a>
<a href="https://discord.gg/TDJ59cGV2X" target="_blank">
    <img src="https://img.shields.io/badge/discord-join-blue.svg?logo=discord&logoColor=white" alt="Discord">
</a>
<a href="https://github.com/onyx-ai/onyx/blob/main/README.md" target="_blank">
    <img src="https://img.shields.io/static/v1?label=license&message=MIT&color=blue" alt="License">
</a>
</p>

<strong>[onyx](https://www.onyx.ai/)</strong> is the AI Assistant connected to your company's docs, apps, and people. 
onyx provides a Chat interface and plugs into any LLM of your choice. onyx can be deployed anywhere and for any 
scale - on a laptop, on-premise, or to cloud. Since you own the deployment, your user data and chats are fully in your 
own control. onyx is MIT licensed and designed to be modular and easily extensible. The system also comes fully ready 
for production usage with user authentication, role management (admin/basic users), chat persistence, and a UI for 
configuring Personas (AI Assistants) and their Prompts.

onyx also serves as a Unified Search across all common workplace tools such as Slack, Google Drive, Confluence, etc.
By combining LLMs and team specific knowledge, onyx becomes a subject matter expert for the team. Imagine ChatGPT if
it had access to your team's unique knowledge! It enables questions such as "A customer wants feature X, is this already
supported?" or "Where's the pull request for feature Y?"

<h3>Usage</h3>

onyx Web App:

https://github.com/onyx-ai/onyx/assets/32520769/563be14c-9304-47b5-bf0a-9049c2b6f410


Or, plug onyx into your existing Slack workflows (more integrations to come 😁):

https://github.com/onyx-ai/onyx/assets/25087905/3e19739b-d178-4371-9a38-011430bdec1b


For more details on the Admin UI to manage connectors and users, check out our 
<strong><a href="https://www.youtube.com/watch?v=geNzY1nbCnU">Full Video Demo</a></strong>!

## Deployment

onyx can easily be run locally (even on a laptop) or deployed on a virtual machine with a single
`docker compose` command. Checkout our [docs](https://docs.onyx.dev/quickstart) to learn more.

We also have built-in support for deployment on Kubernetes. Files for that can be found [here](https://github.com/onyx-ai/onyx/tree/main/deployment/kubernetes).


## 💃 Main Features 
* Chat UI with the ability to select documents to chat with.
* Create custom AI Assistants with different prompts and backing knowledge sets.
* Connect onyx with LLM of your choice (self-host for a fully airgapped solution).
* Document Search + AI Answers for natural language queries.
* Connectors to all common workplace tools like Google Drive, Confluence, Slack, etc.
* Slack integration to get answers and search results directly in Slack.


## 🚧 Roadmap
* Chat/Prompt sharing with specific teammates and user groups.
* Multi-Model model support, chat with images, video etc.
* Choosing between LLMs and parameters during chat session.
* Tool calling and agent configurations options.
* Organizational understanding and ability to locate and suggest experts from your team.


## Other Noteable Benefits of onyx
* User Authentication with document level access management.
* Best in class Hybrid Search across all sources (BM-25 + prefix aware embedding models).
* Admin Dashboard to configure connectors, document-sets, access, etc.
* Custom deep learning models + learn from user feedback.
* Easy deployment and ability to host onyx anywhere of your choosing.


## 🔌 Connectors
Efficiently pulls the latest changes from:
  * Slack
  * GitHub
  * Google Drive
  * Confluence
  * Jira
  * Zendesk
  * Gmail
  * Notion
  * Gong
  * Slab
  * Linear
  * Productboard
  * Guru
  * Bookstack
  * Document360
  * Sharepoint
  * Hubspot
  * Local Files
  * Websites
  * And more ...

## 📚 Editions

There are two editions of onyx:

  * onyx Community Edition (CE) is available freely under the MIT Expat license. This version has ALL the core features discussed above. This is the version of onyx you will get if you follow the Deployment guide above.
  * onyx Enterprise Edition (EE) includes extra features that are primarily useful for larger organizations. Specifically, this includes:
    * Single Sign-On (SSO), with support for both SAML and OIDC
    * Role-based access control
    * Document permission inheritance from connected sources
    * Usage analytics and query history accessible to admins
    * Whitelabeling
    * API key authentication
    * Encryption of secrets
    * Any many more! Checkout [our website](https://www.onyx.ai/) for the latest.

To try the onyx Enterprise Edition: 

  1. Checkout our [Cloud product](https://app.onyx.ai/signup).
  2. For self-hosting, contact us at [founders@onyx.ai](mailto:founders@onyx.ai) or book a call with us on our [Cal](https://cal.com/team/onyx/founders).

## 💡 Contributing
Looking to contribute? Please check out the [Contribution Guide](CONTRIBUTING.md) for more details.
