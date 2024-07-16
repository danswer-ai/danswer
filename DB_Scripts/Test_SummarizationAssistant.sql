DO $$
    DECLARE
    new_persona_id INT;
new_prompt_id INT;
BEGIN
-- Calculate the new ID
SELECT COALESCE(MAX(id), 0) + 1 INTO new_persona_id FROM public.persona;

-- Insert a new row
INSERT INTO public.persona
(id, "name", default_persona, deleted, description, num_chunks, llm_model_version_override, user_id, search_type, llm_relevance_filter, llm_filter_extraction, recency_bias, is_visible, display_priority, starter_messages, is_public, llm_model_provider_override)
VALUES(new_persona_id, 'Summarization_Assistant', false, false, 'Summarization Assistant sample for summarizing the big text', 0, 'llama3', NULL, 'HYBRID', false, false, 'BASE_DECAY', true, NULL, '[]'::jsonb, true, 'ollama');

--add the Summarization tool mapping
INSERT INTO public.persona__tool
(persona_id, tool_id)
VALUES(new_persona_id, 4);

-- Calculate the new ID
SELECT COALESCE(MAX(id), 0) + 1 INTO new_prompt_id FROM public.prompt;

INSERT INTO public.prompt
(id, user_id, "name", description, system_prompt, task_prompt, include_citations, datetime_aware, default_prompt, deleted)
VALUES(new_prompt_id, NULL, 'default-prompt__Summarization Service', 'Default prompt for persona Summarization Service', 'Your knowledge expert, summarize given context in professionally, don''t make up answer. Use same words provided in context to generate summary. keep it short. Dont answer any other question except summarization.', 'You''re summarization assistant, summarize given text in professionally', true, false, true, false);


INSERT INTO public.persona__prompt
(persona_id, prompt_id)
VALUES(new_persona_id, new_prompt_id);

END $$;

