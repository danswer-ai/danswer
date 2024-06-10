"""
FastApi endpoint translating Danswer API to OpenAI Chat API to fit ChatWoot.
And vice-versa.
"""
from fastapi import FastAPI, HTTPException, Request
from translator import translate_danswer_to_openai

app = FastAPI()


@app.post("/translate")
async def translate(request: Request):
    try:
        danswer_json = await request.json()
        openai_json = translate_danswer_to_openai(danswer_json)
        return openai_json

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
