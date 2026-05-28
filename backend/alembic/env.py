from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config.settings import settings
from app.models.loop import Base as LoopBase
from app.models.user import Base as UserBase
from app.models import production  # noqa: F401  # 载入生产实体到 metadata

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 当前模型都挂在同一个 Base.metadata 上，用户表单独保留一份 metadata
metadata_list = [LoopBase.metadata, UserBase.metadata]


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=metadata_list,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata_list)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
