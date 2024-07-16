from danswer.configs.constants import DocumentSource


def source_to_github_img_link(source: DocumentSource) -> str | None:
    # TODO: store these images somewhere better
    if source == DocumentSource.WEB.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/Web.png"
    if source == DocumentSource.FILE.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/File.png"
    # if source == DocumentSource.GOOGLE_SITES.value:
    #     return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/GoogleSites.png"
    if source == DocumentSource.GMAIL.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Gmail.png"
    if source == DocumentSource.GOOGLE_DRIVE.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/GoogleDrive.png"
    if source == DocumentSource.GITHUB.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Github.png"
    if source == DocumentSource.GITLAB.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Gitlab.png"
    if source == DocumentSource.CONFLUENCE.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/Confluence.png"
    if source == DocumentSource.JIRA.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/Jira.png"
    if source == DocumentSource.NOTION.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Notion.png"
    if source == DocumentSource.ZENDESK.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/Zendesk.png"
    if source == DocumentSource.PRODUCTBOARD.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Productboard.webp"
    if source == DocumentSource.GURU.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/Guru.png"
    if source == DocumentSource.HUBSPOT.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/HubSpot.png"
    if source == DocumentSource.BOOKSTACK.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Bookstack.png"
    if source == DocumentSource.SHAREPOINT.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/web/public/Sharepoint.png"
    if source == DocumentSource.INGESTION_API.value:
        return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/File.png"

    return "https://raw.githubusercontent.com/danswer-ai/danswer/main/backend/slackbot_images/File.png"
