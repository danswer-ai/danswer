"""initial persona set up

Revision ID: 6eb78875dbe0
Revises: b25c363470f3
Create Date: 2024-09-25 12:47:44.877589

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


# revision identifiers, used by Alembic.
revision = "6eb78875dbe0"
down_revision = "b25c363470f3"
branch_labels = None
depends_on = None





def upgrade() -> None:
    # -------- Insert Tools --------

    # Ensure 'ImageGenerationTool' exists in the tool table
    image_gen_tool_name = 'ImageGenerationTool'
    existing_tool = session.execute(
        sa.select(tool_table.c.id).where(tool_table.c.name == image_gen_tool_name)
    ).fetchone()

    if not existing_tool:
        result = session.execute(
            tool_table.insert().values(
                name=image_gen_tool_name,
                display_name='Image Generator',
                description='Generates images based on descriptions',
                builtin_tool=True,
                is_public=True,
            )
        )
        image_gen_tool_id = result.inserted_primary_key[0]
    else:
        image_gen_tool_id = existing_tool[0]

    # -------- Insert Personas --------

    personas = personas_data.get('personas', [])
    for persona in personas:
        persona_id = persona.get('id')
        # Check if persona already exists
        existing_persona = session.execute(
            sa.select(persona_table.c.id).where(persona_table.c.id == persona_id)
        ).fetchone()

        persona_values = {
            'id': persona_id,
            'name': persona['name'],
            'description': persona.get('description', '').strip(),
            'num_chunks': persona.get('num_chunks'),
            'llm_relevance_filter': persona.get('llm_relevance_filter', False),
            'llm_filter_extraction': persona.get('llm_filter_extraction', False),
            'recency_bias': persona.get('recency_bias'),
            'icon_shape': persona.get('icon_shape'),
            'icon_color': persona.get('icon_color'),
            'display_priority': persona.get('display_priority'),
            'is_visible': persona.get('is_visible', True),
            'builtin_persona': True,
            'is_public': True,
            'image_generation': persona.get('image_generation', False),
            'llm_model_provider_override': persona.get('llm_model_provider_override'),
            'llm_model_version_override': persona.get('llm_model_version_override'),
        }

        if not existing_persona:
            # Insert new persona
            session.execute(
                persona_table.insert().values(**persona_values)
            )
        else:
            # Update existing persona
            session.execute(
                persona_table.update()
                .where(persona_table.c.id == persona_id)
                .values(**persona_values)
            )

        # -------- Associate Personas with Tools --------

        tool_ids = []
        if persona.get('image_generation'):
            tool_ids.append(image_gen_tool_id)

        # Associate persona with tools
        for tool_id in tool_ids:
            # Check if association already exists
            existing_association = session.execute(
                sa.select(persona_tool_association_table.c.persona_id)
                .where(
                    (persona_tool_association_table.c.persona_id == persona_id) &
                    (persona_tool_association_table.c.tool_id == tool_id)
                )
            ).fetchone()

            if not existing_association:
                session.execute(
                    persona_tool_association_table.insert().values(
                        persona_id=persona_id,
                        tool_id=tool_id,
                    )
                )

    # -------- Insert Input Prompts --------

    input_prompts = input_prompts_data.get('input_prompts', [])
    for input_prompt in input_prompts:
        input_prompt_id = input_prompt.get('id')
        # Check if input prompt already exists
        existing_input_prompt = session.execute(
            sa.select(input_prompt_table.c.id).where(input_prompt_table.c.id == input_prompt_id)
        ).fetchone()

        input_prompt_values = {
            'id': input_prompt_id,
            'prompt': input_prompt['prompt'],
            'content': input_prompt['content'],
            'is_public': input_prompt.get('is_public', True),
            'active': input_prompt.get('active', True),
        }

        if not existing_input_prompt:
            # Insert new input prompt
            session.execute(
                input_prompt_table.insert().values(**input_prompt_values)
            )
        else:
            # Update existing input prompt
            session.execute(
                input_prompt_table.update()
                .where(input_prompt_table.c.id == input_prompt_id)
                .values(**input_prompt_values)
            )

    # Commit the session
    session.commit()

def downgrade():
    # Optional: Implement logic to remove the inserted data if necessary
    pass


def downgrade() -> None:
    pass
