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


class ResolvePlotParametersUsingLLM:
    def __init__(self, llm, llm_config: LLMConfig, prompt_config: PromptConfig):
        self.llm = llm
        self.llm_config = llm_config
        self.prompt_config = prompt_config
        logger.info('Initialized ResolvePlotParametersUsingLLM with model %s', self.llm_config.model_name)

    def construct_prompt(self, sql_query, requirement, chart_type) -> str:
        """ Construct the detailed prompt for querying the LLM. """
        resolve_x_and_y_context = f"""
                        Given the SQL query results, database schema, and user requirements, please identify the appropriate fields for creating a visualization using Plotly. Ensure that the output directly matches the SQL query structure, considering all selected fields.

                        **SQL Query:**
                        {sql_query}

                        **Database Schema:**
                        Album(AlbumId  primary key, Title, ArtistId)
                        Artist(ArtistId primary key,Name)
                        Customer(CustomerId primary key,FirstName,LastName,Company,Address,City,State,Country)
                        Employee(EmployeeId primary key,FirstName,LastName,Title,ReportsTo, BirthDate,Address,City,State,Country,Phone,Email)

                        **Chart Type:**
                        {chart_type}

                        **User Requirements:**                        
                        The user aims to visualize data related to SQL query and {requirement} requiring a comprehensive representation of all fields used in the SQL query for aggregations, computations, or groupings.

                        **Expected Fields from SQL Query:**
                        - Ensure that the number of fields suggested corresponds exactly to the number of columns returned by the SQL query.
                        - The fields should be listed in the order they appear in the SQL query results and presented in a dictionary format appropriate to the chart type.

                        **Guidelines for Suggesting Fields:**
                        - For a PIE chart, suggest fields for 'x' and 'y' and return dictionary like {{"x": "", "y": ""}}.
                        - For BAR and HEATMAP charts, suggest fields for 'x' and 'y' and return dictionary like {{"x": "", "y": ""}}.
                        - For a SCATTER chart, suggest fields for 'x', 'y', and 'color' and return dictionary like {{"x": "", "y": "", "color": ""}}.
                        - For a SCATTER_MATRIX chart, suggest fields for 'x', 'y', 'color', and 'size' and return dictionary like {{"x": "", "y": "", "color": "", "size": ""}}.
                        - Analyze columns properly to suggest the right match for each parameter for ex. for SCATTER_MATRIX which column fits best for color and which for size or x, y
                        - Do not include any explanations or additional text.

                        All suggestions must align with the type of visualization to effectively convey the intended insights and reflect the data structure accurately.
                    """

        question = f"Based on the SQL Query and user requirements, what are the appropriate field names for plotting a {chart_type}? Please format your response as a dictionary mapping field names to the roles they play in the visualization."
        prompt = f""" context: {resolve_x_and_y_context}, question: {question} """
        return prompt

        # return self.prompt_config.template.format(
        #     sql_query=sql_query,
        #     chart_type=chart_type,
        #     requirement=requirement,
        #     database_schema=self.get_database_schema()
        # )

    def get_database_schema(self) -> str:
        """ Return the database schema. """
        return """
            Album(AlbumId primary key, Title, ArtistId),
            Artist(ArtistId primary key,Name),
            Customer(CustomerId primary key,FirstName,LastName,Company,Address,City,State,Country),
            Employee(EmployeeId primary key,FirstName,LastName,Title,ReportsTo, BirthDate,Address,City,State,Country,Phone,Email)
        """

    def resolve_graph_parameters_from_chart_type_and_sql_and_requirements(self, sql_query, requirement,
                                                                          chart_type) -> list:
        """ Resolve graph parameters by querying the LLM with constructed prompts. """
        prompt = self.construct_prompt(sql_query, requirement, chart_type)
        try:
            llm_response = self.llm.invoke(prompt=prompt)
            #field_names = self.post_process(llm_response)
            field_names = llm_response.content
            field_names = json.loads(field_names)
            print(f"field_names : {field_names}, type(field_names) = {type(field_names)}")
            logger.info('Fields resolved successfully')
            return field_names
        except Exception as e:
            logger.error("Failed to resolve graph parameters: %s", str(e))
            return []

    def post_process(self, text):
        return "".join([json.loads(token)['response'] for token in text['text'].strip().split('\n')])

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
    resolver = ResolvePlotParametersUsingLLM(llm, llm_config, prompt_config)
    fields = resolver.resolve_graph_parameters_from_chart_type_and_sql_and_requirements(
        "SELECT * FROM Employees", "needs employee data analysis", "BAR")
    print(fields)
