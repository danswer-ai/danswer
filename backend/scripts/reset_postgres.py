import psycopg2
from danswer.configs.app_configs import POSTGRES_DB
from danswer.configs.app_configs import POSTGRES_HOST
from danswer.configs.app_configs import POSTGRES_PASSWORD
from danswer.configs.app_configs import POSTGRES_PORT
from danswer.configs.app_configs import POSTGRES_USER


def wipe_all_rows(database: str) -> None:
    conn = psycopg2.connect(
        dbname=database,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=POSTGRES_HOST,
        port=POSTGRES_PORT,
    )

    cur = conn.cursor()
    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        """
    )

    table_names = cur.fetchall()

    # have to delete from these first to not run into psycopg2.errors.ForeignKeyViolation
    cur.execute(f"DELETE FROM connector_credential_pair")
    cur.execute(f"DELETE FROM index_attempt")
    conn.commit()

    for table_name in table_names:
        if table_name[0] == "alembic_version":
            continue
        cur.execute(f'DELETE FROM "{table_name[0]}"')
        print(f"Deleted all rows from table {table_name[0]}")
        conn.commit()

    cur.close()
    conn.close()


if __name__ == "__main__":
    wipe_all_rows(POSTGRES_DB)
