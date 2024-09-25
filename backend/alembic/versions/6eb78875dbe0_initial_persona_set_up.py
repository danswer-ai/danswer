from alembic import op
import sqlalchemy as sa
from sqlalchemy import Table, Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float, Enum, MetaData
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session

# Import necessary enums

# revision identifiers, used by Alembic.
revision = "6eb78875dbe0"
down_revision = "b25c363470f3"
branch_labels = None
depends_on = None

metadata = MetaData()

# Define the Tool table
tool_table = Table(
    'tool',
    metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String, nullable=False),
    Column('description', Text, nullable=True),
    Column('in_code_tool_id', String, nullable=True),
    Column('display_name', String, nullable=True),
    Column('openapi_schema', postgresql.JSONB, nullable=True),
    Column('user_id', postgresql.UUID, ForeignKey('user.id'), nullable=True),
)

# Define the Prompt table
prompt_table = Table(
    'prompt',
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', postgresql.UUID, ForeignKey('user.id'), nullable=True),
    Column('name', String),
    Column('description', String),
    Column('system_prompt', Text),
    Column('task_prompt', Text),
    Column('include_citations', Boolean, default=True),
    Column('datetime_aware', Boolean, default=True),
    Column('default_prompt', Boolean, default=False),
    Column('deleted', Boolean, default=False),
)

# Define the InputPrompt table
input_prompt_table = Table(
    'inputprompt',
    metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('prompt', String),
    Column('content', String),
    Column('active', Boolean),
    Column('is_public', Boolean, nullable=False, default=True),
    Column('user_id', postgresql.UUID, ForeignKey('user.id'), nullable=True),
)

# Define the Persona table
persona_table = Table(
    'persona',
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', postgresql.UUID, ForeignKey('user.id'), nullable=True),
    Column('name', String),
    Column('description', String),
    Column('num_chunks', Float, nullable=True),
    Column('chunks_above', Integer),
    Column('chunks_below', Integer),
    Column('llm_relevance_filter', Boolean),
    Column('llm_filter_extraction', Boolean),
    Column('recency_bias',  String, nullable=True),
    Column('llm_model_provider_override', String, nullable=True),
    Column('llm_model_version_override', String, nullable=True),
    Column('starter_messages', postgresql.JSONB, nullable=True),
    Column('default_persona', Boolean, default=False),
    Column('is_visible', Boolean, default=True),
    Column('display_priority', Integer, nullable=True, default=None),
    Column('deleted', Boolean, default=False),
    Column('uploaded_image_id', String, nullable=True),
    Column('icon_color', String, nullable=True),
    Column('icon_shape', Integer, nullable=True),
    Column('is_public', Boolean, nullable=False, default=True),
)

# Define association tables
persona__document_set = Table(
    'persona__document_set',
    metadata,
    Column('persona_id', Integer, ForeignKey('persona.id'), primary_key=True),
    Column('document_set_id', Integer, ForeignKey('document_set.id'), primary_key=True),
)

persona__prompt = Table(
    'persona__prompt',
    metadata,
    Column('persona_id', Integer, ForeignKey('persona.id'), primary_key=True),
    Column('prompt_id', Integer, ForeignKey('prompt.id'), primary_key=True),
)

persona__user = Table(
    'persona__user',
    metadata,
    Column('persona_id', Integer, ForeignKey('persona.id'), primary_key=True),
    Column('user_id', postgresql.UUID, ForeignKey('user.id'), primary_key=True, nullable=True),
)

persona__tool = Table(
    'persona__tool',
    metadata,
    Column('persona_id', Integer, ForeignKey('persona.id'), primary_key=True),
    Column('tool_id', Integer, ForeignKey('tool.id'), primary_key=True),
)

persona__user_group = Table(
    'persona__user_group',
    metadata,
    Column('persona_id', Integer, ForeignKey('persona.id'), primary_key=True),
    Column('user_group_id', Integer, ForeignKey('user_group.id'), primary_key=True),
)

def upgrade() -> None:
    # Create a session
    session = Session(bind=op.get_bind())

    # Your upgrade logic here
    # For example, inserting data into the tables:
    
    # Insert a new tool
    new_tool = {
        'name': 'YourToolName',
        'description': 'Description of your tool',
        'in_code_tool_id': None,
        'display_name': 'Your Tool Display Name',
        'openapi_schema': None,
        'user_id': None,
    }
    session.execute(tool_table.insert().values(**new_tool))

    # Insert a new prompt
    new_prompt = {
        'name': 'Your Prompt Name',
        'description': 'Description of your prompt',
        'system_prompt': 'Your system prompt here',
        'task_prompt': 'Your task prompt here',
        'include_citations': True,
        'datetime_aware': True,
        'default_prompt': False,
        'deleted': False,
    }
    session.execute(prompt_table.insert().values(**new_prompt))

    # Insert a new persona
    new_persona = {
        'name': 'Your Persona Name',
        'description': 'Description of your persona',
        'chunks_above': 1,
        'chunks_below': 1,
        'llm_relevance_filter': True,
        'llm_filter_extraction': True,
        'recency_bias': "medium",
        'default_persona': False,
        'is_visible': True,
        'deleted': False,
        'is_public': True,
    }
    session.execute(persona_table.insert().values(**new_persona))

    # Commit the session
    session.commit()

def downgrade() -> None:
    # Your downgrade logic here
    pass