from sqlalchemy import Integer
from sqlalchemy import Sequence
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from danswer.db.models import Base


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[int] = mapped_column(
        Integer,
        Sequence("connector_credential_pair_id_seq"),
        unique=True,
        nullable=False,
    )
