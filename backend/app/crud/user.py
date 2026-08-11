import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.user import User

_SORT_CLAUSES = {
    "newest": User.created_at.desc(),
    "oldest": User.created_at.asc(),
    "name": User.name.asc(),
}


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def get_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User).where(User.email == email, User.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()


async def list_users(
    db: AsyncSession,
    *,
    q: str | None = None,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    sort: str = "newest",
) -> list[User]:
    # Always excludes soft-deleted users, same as before this gained filters — a
    # deleted user stays gone from every list, not just the default one. `status`
    # filters the separate, reversible active/disabled toggle (see User.deleted_at's
    # docstring for how the two differ).
    stmt = select(User).where(User.deleted_at.is_(None))
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    if role is not None:
        stmt = stmt.where(User.role == role)
    if status is not None:
        stmt = stmt.where(User.status == status)
    stmt = stmt.order_by(_SORT_CLAUSES.get(sort, _SORT_CLAUSES["newest"]))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_admins(db: AsyncSession) -> int:
    result = await db.execute(
        select(User).where(User.role == UserRole.admin, User.deleted_at.is_(None))
    )
    return len(result.scalars().all())


async def list_by_roles(db: AsyncSession, roles: list[UserRole]) -> list[User]:
    result = await db.execute(
        select(User).where(
            User.role.in_(roles), User.status == UserStatus.active, User.deleted_at.is_(None)
        )
    )
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    role: UserRole = UserRole.member,
    status: UserStatus = UserStatus.active,
) -> User:
    user = User(
        email=email,
        hashed_password=hash_password(password),
        name=name,
        role=role,
        status=status,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_or_create_by_sso(db: AsyncSession, *, email: str, name: str) -> User:
    """Looks up a user by email for SSO login; auto-provisions with role=member if new.

    Never touches role/status of an existing user - SSO only authenticates, it doesn't
    grant permissions.
    """
    existing = await get_by_email(db, email)
    if existing is not None:
        return existing
    return await create_user(
        db,
        email=email,
        password=secrets.token_urlsafe(32),
        name=name,
        role=UserRole.member,
        status=UserStatus.active,
    )


async def update_user(
    db: AsyncSession,
    user: User,
    *,
    name: str | None = None,
    role: UserRole | None = None,
    status: UserStatus | None = None,
    password: str | None = None,
) -> User:
    if name is not None:
        user.name = name
    if role is not None:
        user.role = role
    if status is not None:
        user.status = status
    if password is not None:
        user.hashed_password = hash_password(password)
    await db.commit()
    await db.refresh(user)
    return user


async def soft_delete(db: AsyncSession, user: User) -> None:
    user.deleted_at = datetime.now(timezone.utc)
    user.status = UserStatus.disabled
    await db.commit()
