from danswer.configs.app_configs import TYPESENSE_DEFAULT_COLLECTION
from danswer.utils.clients import get_typesense_client


if __name__ == "__main__":
    ts_client = get_typesense_client()

    page_number = 1
    per_page = 100  # number of documents to retrieve per page
    while True:
        params = {
            "q": "",
            "query_by": "content",
            "page": page_number,
            "per_page": per_page,
        }
        response = ts_client.collections[TYPESENSE_DEFAULT_COLLECTION].documents.search(
            params
        )
        documents = response.get("hits")
        if not documents:
            break  # if there are no more documents, break out of the loop

        for document in documents:
            print(document)

        page_number += 1  # move on to the next page
