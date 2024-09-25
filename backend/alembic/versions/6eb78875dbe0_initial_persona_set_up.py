"""initial persona set up

Revision ID: 6eb78875dbe0
Revises: b25c363470f3
Create Date: 2024-09-25 12:47:44.877589

"""
from alembic import op
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision = "6eb78875dbe0"
down_revision = "b25c363470f3"
branch_labels = None
depends_on = None


from sqlalchemy import Table, MetaData

# Import tables
metadata = MetaData()
tool_table = Table('tool', metadata, autoload_with=op.get_bind())
prompt_table = Table('prompt', metadata, autoload_with=op.get_bind())
input_prompt_table = Table('inputprompt', metadata, autoload_with=op.get_bind())
persona_table = Table('persona', metadata, autoload_with=op.get_bind())

# Create a session
session = Session(bind=op.get_bind())

def upgrade() -> None:


    # Define the new tool
    new_tool = {
        'name': 'YourToolName',
        'description': 'Description of your tool',
        'in_code_tool_id': None,  # Or provide if applicable
        'display_name': 'Your Tool Display Name',
        'openapi_schema': None,  # Or provide OpenAPI schema if needed
        'user_id': None,  # Associate with a user if necessary
    }

    # Insert the tool
    session.execute(
        tool_table.insert().values(**new_tool)
    )

    # -------- Insert Prompt --------

    # Define the new prompt
    new_prompt = {
        'name': 'YourPromptName',
        'description': 'Description of your prompt',
        'system_prompt': 'System prompt content',
        'task_prompt': 'Task prompt content',
        'include_citations': True,
        'datetime_aware': True,
        'default_prompt': False,
        'deleted': False,
        'user_id': None,
    }

    # Insert the prompt
    session.execute(
        prompt_table.insert().values(**new_prompt)
    )

    # -------- Insert Input Prompt --------

    # Define the new input prompt
    new_input_prompt = {
        'prompt': 'YourInputPrompt',
        'content': 'Your input prompt content',
        'active': True,
        'is_public': True,
        'user_id': None,
    }

    # Insert the input prompt
    session.execute(
        input_prompt_table.insert().values(**new_input_prompt)
    )

    # -------- Insert Persona --------

    # Define the new persona
    new_persona = {
        'name': 'YourPersonaName',
        'description': 'Description of your persona',
        'num_chunks': 10,
        'llm_relevance_filter': True,
        'llm_filter_extraction': True,
        'recency_bias': 'auto',
        'icon_shape': 12345,
        'icon_color': '#FF0000',
        'display_priority': 1,
        'is_visible': True,
        'default_persona': False,
        'deleted': False,
        'user_id': None,
        "is_public": True,
        "chunks_above": 0, 
        "chunks_below": 0,
    }

    # Insert the persona
    session.execute(
        persona_table.insert().values(**new_persona)
    )

    # Commit the session
    session.commit()

def downgrade() -> None:
    # Implement logic to remove the inserted data if necessary
    pass
