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
VALUES(new_persona_id, 'SqlAssistant_Customers', false, false, 'Sql assistant sample for Customers table', 0, 'llama3', NULL, 'HYBRID', false, false, 'BASE_DECAY', true, NULL, '[]'::jsonb, true, 'ollama');

--add the SQLGenerator tool mapping
INSERT INTO public.persona__tool
(persona_id, tool_id)
VALUES(new_persona_id, 3);

-- Calculate the new ID
SELECT COALESCE(MAX(id), 0) + 1 INTO new_prompt_id FROM public.prompt;

INSERT INTO public.prompt
(id, user_id, "name", description, system_prompt, task_prompt, include_citations, datetime_aware, default_prompt, deleted)
VALUES(new_prompt_id, NULL, 'default-prompt__SqlAssistant_Customers', 'Default prompt for persona SqlAssistant_Customers', 'You are a knowledge expert, you are expert in oracle and postgress databases.please generate SQL query for user request, dont explain. output should be SQL always. dont respond to any other question which is not related to SQL.

	following is my schema:
	table:customer with customerid as primary key and firstname,lastname,company,address,city,state,country,postalcode,phone,fax,email as string fields.

	example query: bring all customers who are from country ''USA''
	sql : select customerid,firstname,lastname,state,city  from customers where country=''USA''      ', 'answer to user question, reply with valid SQL query.
	include only id,name, city in select clause', false, false, true, false);


INSERT INTO public.persona__prompt
(persona_id, prompt_id)
VALUES(new_persona_id, new_prompt_id);

END $$;