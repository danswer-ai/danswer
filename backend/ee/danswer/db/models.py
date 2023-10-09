import datetime
from uuid import UUID

from sqlalchemy import Boolean
from sqlalchemy import DateTime
from sqlalchemy import ForeignKey
from sqlalchemy import func
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from danswer.db.models import Base
from danswer.db.models import ConnectorCredentialPair
from danswer.db.models import User


class SamlAccount(Base):
    __tablename__ = "saml"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), unique=True)
    encrypted_cookie: Mapped[str] = mapped_column(Text, unique=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship("User")


"""Tables related to RBAC"""


class User__UserGroup(Base):
    __tablename__ = "user__user_group"

    user_group_id: Mapped[int] = mapped_column(
        ForeignKey("user_group.id"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("user.id"), primary_key=True)


class UserGroup__ConnectorCredentialPair(Base):
    __tablename__ = "user_group__connector_credential_pair"

    user_group_id: Mapped[int] = mapped_column(
        ForeignKey("user_group.id"), primary_key=True
    )
    cc_pair_id: Mapped[int] = mapped_column(
        ForeignKey("connector_credential_pair.id"), primary_key=True
    )
    # if `True`, then is part of the current state of the UserGroup
    # if `False`, then is a part of the prior state of the UserGroup
    # rows with `is_current=False` should be deleted when the UserGroup
    # is updated and should not exist for a given UserGroup if
    # `UserGroup.is_up_to_date == True`
    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        primary_key=True,
    )

    cc_pair: Mapped[ConnectorCredentialPair] = relationship(
        "ConnectorCredentialPair",
    )


class UserGroup(Base):
    __tablename__ = "user_group"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    # whether or not changes to the UserGroup have been propogated to Vespa
    is_up_to_date: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # tell the sync job to clean up the group
    is_up_for_deletion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    users: Mapped[list[User]] = relationship(
        "User",
        secondary=User__UserGroup.__table__,
    )
    cc_pairs: Mapped[list[ConnectorCredentialPair]] = relationship(
        "ConnectorCredentialPair",
        secondary=UserGroup__ConnectorCredentialPair.__table__,
        viewonly=True,
    )
    cc_pair_relationships: Mapped[
        list[UserGroup__ConnectorCredentialPair]
    ] = relationship(
        "UserGroup__ConnectorCredentialPair",
        viewonly=True,
    )
