# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
#
# The NLP models used here are licensed under Apache 2.0
# Specifically the sentence-transformers/all-distilroberta-v1 and cross-encoder/ms-marco-MiniLM-L-6-v2 models
# The original creators can be found at https://www.sbert.net/index.html
import os

QUERY_EMBEDDING_CONTEXT_SIZE = 256
DOC_EMBEDDING_CONTEXT_SIZE = 512
CROSS_EMBED_CONTEXT_SIZE = 512
MODEL_CACHE_FOLDER = os.environ.get("TRANSFORMERS_CACHE")

# Purely an optimization, memory limitation consideration
BATCH_SIZE_ENCODE_CHUNKS = 8

# QA Model API Configs
# https://platform.openai.com/docs/models/model-endpoint-compatibility
INTERNAL_MODEL_VERSION = os.environ.get("INTERNAL_MODEL", "openai-completion")
OPENAPI_MODEL_VERSION = os.environ.get("OPENAI_MODEL_VERSION", "text-davinci-003")
OPENAI_MAX_OUTPUT_TOKENS = 512
