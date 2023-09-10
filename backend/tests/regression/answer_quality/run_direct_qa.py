import argparse

import yaml


def load_yaml(filepath: str) -> dict:
    with open(filepath, "r") as file:
        data = yaml.safe_load(file)
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "regression_yaml",
        type=str,
        help="Path to the Questions YAML file.",
        default="./tests/regression/answer_quality/sample_questions.yaml",
        nargs="?",
    )
    parser.add_argument(
        "--real-time", action="store_true", help="Set to use the real-time flow."
    )
    args = parser.parse_args()

    questions_data = load_yaml(args.regression_yaml)
