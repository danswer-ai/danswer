import json

import requests
from danswer.configs.app_configs import APP_PORT
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.configs.constants import SOURCE_TYPE


if __name__ == "__main__":
    previous_query = None
    while True:
        keyword_search = False
        query = input(
            "\n\nAsk any question:\n  - prefix with -k for keyword search\n  - input an empty string to "
            "rerun last query\n\t"
        )

        if query.lower() in ["q", "quit", "exit", "exit()"]:
            break

        if query:
            previous_query = query
        else:
            if not previous_query:
                print("No previous query")
                continue
            print(f"Re-executing previous question:\n\t{previous_query}")
            query = previous_query

        endpoint = f"http://127.0.0.1:{APP_PORT}/direct-qa"
        if query.startswith("-k "):
            keyword_search = True
            query = query[2:]
            endpoint = f"http://127.0.0.1:{APP_PORT}/keyword-search"

        response = requests.post(
            endpoint, json={"query": query, "collection": QDRANT_DEFAULT_COLLECTION}
        )
        contents = json.loads(response.content)
        if keyword_search:
            if contents["results"]:
                for link in contents["results"]:
                    print(link)
            else:
                print("No matches found")
        else:
            answer = contents.get("answer")
            if answer:
                print("Answer: " + answer)
            else:
                print("Answer: ?")
            if contents.get("quotes"):
                for ind, (quote, quote_info) in enumerate(contents["quotes"].items()):
                    print(f"Quote {str(ind)}:\n{quote}")
                    print(f"Link: {quote_info['link']}")
                    print(f"Source: {quote_info[SOURCE_TYPE]}")
            else:
                print("No quotes found")
