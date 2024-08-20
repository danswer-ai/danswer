from sqlalchemy import create_engine
import pandas as pd


class DataframeInMemorySQL:
    def __init__(self, df):
        # Create an SQLite engine instance
        self.engine = create_engine('sqlite:///:memory:')
        df.to_sql(name="df", con=self.engine, index=False, if_exists='replace')

    def execute_sql(self, sql):
        # Query using SQL and return result as DataFrame
        return pd.read_sql_query(sql, con=self.engine)


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
