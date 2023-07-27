from typing import cast

import openai


VALID_MODEL_LIST = ["text-davinci-003", "gpt-3.5-turbo", "gpt-4"]


if __name__ == "__main__":
    model_version = None
    while model_version not in VALID_MODEL_LIST:
        model_version = input("Please provide an OpenAI model version to test: ")
        if model_version not in VALID_MODEL_LIST:
            print(f"Model must be from valid list: {', '.join(VALID_MODEL_LIST)}")

    api_key = input("Please provide an OpenAI API Key to test: ")
    openai.api_key = api_key

    prompt = "The boy went to the "
    print(f"Asking OpenAI to finish the sentence using {model_version}")
    print(prompt)
    try:
        if model_version == "text-davinci-003":
            response = openai.Completion.create(
                model=model_version, prompt=prompt, max_tokens=5, temperature=2
            )
            print(cast(str, response["choices"][0]["text"]).strip())

        else:
            messages = [
                {"role": "system", "content": "Finish the sentence"},
                {"role": "user", "content": prompt},
            ]
            response = openai.ChatCompletion.create(
                model=model_version, messages=messages, max_tokens=5, temperature=2
            )
            print(cast(str, response["choices"][0]["message"]["content"]).strip())
        print("Success! Feel free to use this API key for Danswer.")
    except Exception:
        print(
            "Failed, provided API key is invalid for Danswer, please address the error from OpenAI."
        )
        raise
