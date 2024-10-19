from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column

from danswer.db.models import Base


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[int] = mapped_column(primary_key=True)
