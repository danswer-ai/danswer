"""
FastApi endpoint translating Danswer API to OpenAI Chat API to fit ChatWoot.
And vice-versa.
"""
from fastapi import FastAPI, HTTPException, Request
from translator import translate_danswer_to_openai, extract_prompt
from pipeline import get_danswer_response
import json

app = FastAPI()


@app.post("/translate")
async def translate(request: Request):
    try:
        openai_request = json.loads(await request.json())
        prompt, prompt_tokens = extract_prompt(openai_request)

        danswer_response = get_danswer_response(prompt)

        openai_response = translate_danswer_to_openai(
            danswer_response,
            prompt_tokens=prompt_tokens
        )

        return openai_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
