import argparse
import json
import urllib

import requests
from danswer.configs.app_configs import APP_PORT
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.configs.constants import BLURB
from danswer.configs.constants import SEMANTIC_IDENTIFIER
from danswer.configs.constants import SOURCE_LINK
from danswer.configs.constants import SOURCE_TYPE


if __name__ == "__main__":
    previous_query = None
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-k",
        "--keyword-search",
        action="store_true",
        help="Use keyword search if set, semantic search otherwise",
    )

    parser.add_argument(
        "-t",
        "--source-types",
        type=str,
        help="Comma separated list of source types to filter by",
    )

    parser.add_argument(
        "-s",
        "--stream",
        action="store_true",
        help="Enable streaming response",
    )

    parser.add_argument("query", nargs="*", help="The query to process")

    while True:
        try:
            user_input = input(
                "\n\nAsk any question:\n"
                "  - prefix with -t to add a filter by source type(s)\n"
                "  - prefix with -s to stream answer\n"
                "  - input an empty string to rerun last query\n\t"
            )

            if user_input:
                previous_input = user_input
            else:
                if not previous_input:
                    print("No previous input")
                    continue
                print(f"Re-executing previous question:\n\t{previous_input}")
                user_input = previous_input

            args = parser.parse_args(user_input.split())

            keyword_search = args.keyword_search
            source_types = args.source_types.split(",") if args.source_types else None
            if source_types and len(source_types) == 1:
                source_types = source_types[0]
            query = " ".join(args.query)

            endpoint = (
                f"http://127.0.0.1:{APP_PORT}/direct-qa"
                if not args.stream
                else f"http://127.0.0.1:{APP_PORT}/stream-direct-qa"
            )
            if args.keyword_search:
                endpoint = f"http://127.0.0.1:{APP_PORT}/keyword-search"
                raise NotImplementedError("keyword search is not supported for now")

            query_json = {
                "query": query,
                "collection": QDRANT_DEFAULT_COLLECTION,
                "filters": [{SOURCE_TYPE: source_types}],
            }
            if not args.stream:
                response = requests.get(
                    endpoint, params=urllib.parse.urlencode(query_json)
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
                        for ind, (quote, quote_info) in enumerate(
                            contents["quotes"].items()
                        ):
                            print(f"Quote {str(ind + 1)}:\n{quote}")
                            print(
                                f"Semantic Identifier: {quote_info[SEMANTIC_IDENTIFIER]}"
                            )
                            print(f"Blurb: {quote_info[BLURB]}")
                            print(f"Link: {quote_info[SOURCE_LINK]}")
                            print(f"Source: {quote_info[SOURCE_TYPE]}")
                    else:
                        print("No quotes found")
            else:
                with requests.get(
                    endpoint, params=urllib.parse.urlencode(query_json), stream=True
                ) as r:
                    for json_response in r.iter_lines():
                        print(json.loads(json_response.decode()))

        except Exception as e:
            print(f"Failed due to {e}, retrying")
