import psycopg2
from danswer.configs.app_configs import POSTGRES_DB
from danswer.configs.app_configs import POSTGRES_HOST
from danswer.configs.app_configs import POSTGRES_PASSWORD
from danswer.configs.app_configs import POSTGRES_PORT
from danswer.configs.app_configs import POSTGRES_USER


def wipe_all_rows(database: str) -> None:
    # Establish a connection to the database
    conn = psycopg2.connect(
        dbname=database,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
    )

    # To execute commands to the database, we need a cursor
    cur = conn.cursor()

    # Get all table names in the current database
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
    """
    )

    table_names = cur.fetchall()

    # For each table, execute a DELETE command to remove all rows
    for table_name in table_names:
        cur.execute(f'ALTER TABLE "{table_name[0]}" DISABLE TRIGGER ALL')
    conn.commit()

    for table_name in table_names:
        cur.execute(f'DELETE FROM "{table_name[0]}"')
        print(f"Deleted all rows from table {table_name[0]}")
    conn.commit()

    for table_name in table_names:
        cur.execute(f'ALTER TABLE "{table_name[0]}" ENABLE TRIGGER ALL')
    conn.commit()

    # Commit the changes and close the connection
    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    wipe_all_rows(POSTGRES_DB)
