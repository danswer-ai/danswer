from dataclasses import dataclass
from danswer.utils.logger import setup_logger
import json

# Setup logger
logger = setup_logger()


@dataclass
class LLMConfig:
    model_name: str
    other_configurations: dict


@dataclass
class PromptConfig:
    template: str


def post_process(text):
    return "".join([json.loads(token)['response'] for token in text['text'].strip().split('\n')])


class GenerateSqlForDataframe:
    def __init__(self, llm, llm_config: LLMConfig, prompt_config: PromptConfig):
        self.llm = llm
        self.llm_config = llm_config
        self.prompt_config = prompt_config
        logger.info('Initialized GenerateSqlForDataframe with model %s', self.llm_config.model_name)

    def construct_prompt_from_requirements(self, schema, requirement, table_name='df'):
        """ Construct the detailed prompt for querying the LLM. """
        generate_sql = (f"{self.prompt_config.system_prompt} \n** DataFrame Schema: **\n {schema} \n "
                        f"** User Requirements: **\n {requirement} \n {self.prompt_config.task_prompt}")
        question = f"Generate SQL Query based on the provided DataFrame schema and user requirements."
        df_prompt = f""" context: {generate_sql}, question: {question} """
        return df_prompt

    def generate_sql_query(self, schema, requirement) -> list:
        """ Generate SQL Query by querying the LLM with constructed prompts. """
        prompt = self.construct_prompt_from_requirements(schema, requirement)

        try:
            llm_response = self.llm.invoke(prompt=prompt)
            sql_query = llm_response.content
            print(f"SQL Query : {sql_query}, type(field_names) = {type(sql_query)}")
            logger.info(
                f'SQL Query generated successfully. SQL Query : {sql_query}, type(field_names) = {type(sql_query)}')
            return sql_query
        except Exception as e:
            logger.error("Failed to generate SQL Query: %s", str(e))
            return []


if __name__ == '__main__':
    llm_config = LLMConfig(model_name="model_v1", other_configurations={})
    prompt_config = PromptConfig(
        template="""Given the SQL query results, database schema, and user requirements, please suggest appropriate fields for creating a visualization using Plotly...""")


    # Mocking llm.invoke for demonstration
    class MockLLM:
        def invoke(self, prompt):
            class Response:
                content = ['dept_name', 'hire_date', 'employee_count']

            return Response()


    llm = MockLLM()
    resolver = GenerateSqlForDataframe(llm, llm_config, prompt_config)
    fields = resolver.generate_sql_query(
        "SELECT * FROM Employees", "needs employee data analysis", "BAR")
    print(fields)
