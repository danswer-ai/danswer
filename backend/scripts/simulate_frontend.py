# This file is purely for development use, not included in any builds
import argparse
import json
import urllib

import requests
from danswer.configs.app_configs import APP_PORT
from danswer.configs.app_configs import QDRANT_DEFAULT_COLLECTION
from danswer.configs.constants import SOURCE_TYPE


if __name__ == "__main__":
    previous_query = None
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "-f",
        "--flow",
        type=str,
        default="QA",
        help='"Search" or "QA", defaults to "QA"',
    )

    parser.add_argument(
        "-t",
        "--type",
        type=str,
        default="Semantic",
        help='"Semantic" or "Keyword", defaults to "Semantic"',
    )

    parser.add_argument(
        "-s",
        "--stream",
        action="store_true",
        help='Enable streaming response, only for flow="QA"',
    )

    parser.add_argument(
        "--filters",
        type=str,
        help="Comma separated list of source types to filter by (no spaces)",
    )

    parser.add_argument("query", nargs="*", help="The query to process")

    while True:
        previous_input = None
        try:
            user_input = input(
                "\n\nAsk any question:\n"
                "  - Use -f (QA/Search) and -t (Semantic/Keyword) flags to set endpoint.\n"
                "  - prefix with -s to stream answer, -f source1,source2,etc for filters.\n"
                "  - input an empty string to rerun last query.\n\t"
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

            flow = str(args.flow).lower()
            flow_type = str(args.type).lower()
            stream = args.stream
            source_types = args.filters.split(",") if args.filters else None
            if source_types and len(source_types) == 1:
                source_types = source_types[0]
            query = " ".join(args.query)

            if flow not in ["qa", "search"]:
                raise ValueError("Flow value must be QA or Search")
            if flow_type not in ["keyword", "semantic"]:
                raise ValueError("Type value must be keyword or semantic")
            if flow != "qa" and stream:
                raise ValueError("Can only stream results for QA")

            if (flow, flow_type) == ("search", "keyword"):
                path = "keyword-search"
            elif (flow, flow_type) == ("search", "semantic"):
                path = "semantic-search"
            elif stream:
                path = "stream-direct-qa"
            else:
                path = "direct-qa"

            endpoint = f"http://127.0.0.1:{APP_PORT}/{path}"

            query_json = {
                "query": query,
                "collection": QDRANT_DEFAULT_COLLECTION,
                "use_keyword": flow_type,  # Only applicable to QA Endpoints
                "filters": [{SOURCE_TYPE: source_types}],
            }

            if args.stream:
                with requests.get(
                    endpoint, params=urllib.parse.urlencode(query_json), stream=True
                ) as r:
                    for json_response in r.iter_lines():
                        print(json.loads(json_response.decode()))
            else:
                response = requests.get(
                    endpoint, params=urllib.parse.urlencode(query_json)
                )
                contents = json.loads(response.content)
                print(contents)

        except Exception as e:
            print(f"Failed due to {e}, retrying")
