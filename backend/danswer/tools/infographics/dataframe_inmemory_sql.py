import sqlalchemy.exc
from sqlalchemy import create_engine, text
import pandas as pd
from danswer.utils.logger import setup_logger

# Setup logger
logger = setup_logger()


class DataframeInMemorySQLExecutionException(Exception):
    def __init__(self, base_exception, message="A custom exception occurred"):
        self.message = message
        self.base_exception = base_exception
        super().__init__(self.message, self.base_exception)

    def __str__(self):
        return f"{self.__class__.__name__}({self.args[0]}, code={self.base_exception})"


class SingletonMeta(type):
    """
    A Singleton metaclass that creates a single instance of a class.
    """
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super().__call__(*args, **kwargs)
            cls._instances[cls] = instance
        return cls._instances[cls]


class DatabaseEngine(metaclass=SingletonMeta):
    def __init__(self):
        self.engine = create_engine('sqlite:///:memory:')


class DataframeInMemorySQL:
    """
        Repository class for handling data operations.
        """

    def __init__(self, df):
        self.engine = DatabaseEngine().engine
        self.load_dataframe(df)

    def load_dataframe(self, df):
        try:
            df.to_sql('df', self.engine, index=False, if_exists='replace')
        except Exception as e:
            logger.error(f'Error loading DataFrame: {e}')
            raise

    def execute_sql(self, sql):
        # Query using SQL and return result as DataFrame
        try:
            with self.engine.connect() as connection:
                # Ensure SQL command is textually executed
                result_proxy = connection.execute(text(sql))
                rows = result_proxy.fetchmany(size=10)
                result = pd.DataFrame(rows, columns=result_proxy.keys())
                # result = pd.read_sql_query(sql, con=self.engine)
        except sqlalchemy.exc.OperationalError as e:
            logger.error(f'Exception: {e} while executing SQL query: {sql} on dataframe.')
            raise DataframeInMemorySQLExecutionException(base_exception=e,
                                                         message=f"Exception occurred while executing SQL query: {sql} on dataframe. "
                                                                 f"Exception details: {e}")
        return result


if __name__ == '__main__':
    # Create a sample DataFrame
    data = {
        'EMP_NO': [101, 102, 103, 104],
        'FIRST_NAME': ['John', 'Jane', 'Alice', 'Bob'],
        'LAST_NAME': ['Doe', 'Smith', 'Johnson', 'Brown'],
        'GENDER': ['M', 'F', 'F', 'M'],
        'HIRE_DATE': ['2015-06-23', '2016-07-28', '2017-08-15', '2018-01-12'],
        'DEPT_NO': ['D001', 'D002', 'D001', 'D003']
    }

    df = pd.DataFrame(data)
    dataframeInMemorySql = DataframeInMemorySQL(df)

    # Example SQL query on the DataFrame
    query = """
                SELECT GENDER, COUNT(*) as count
                FROM df
                GROUP BY GENDER
            """
    result_df = dataframeInMemorySql.execute_sql(query)
    print(f'Result DataFrame:\n{result_df}')
