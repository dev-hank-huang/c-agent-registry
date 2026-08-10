import io
from datetime import timedelta
from functools import lru_cache

from minio import Minio
from minio.error import S3Error

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_minio_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_buckets() -> None:
    client = get_minio_client()
    for bucket in (settings.minio_skills_bucket, settings.minio_packages_bucket):
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
        except S3Error:
            raise


def put_bytes(bucket: str, object_name: str, data: bytes, content_type: str) -> str:
    client = get_minio_client()
    client.put_object(
        bucket,
        object_name,
        data=io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return object_name


def get_bytes(bucket: str, object_name: str) -> bytes:
    client = get_minio_client()
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def total_bucket_bytes(bucket: str) -> int:
    """Real, not derived from any DB table — sums actual object sizes in MinIO. Used
    by Statistics' "artifact storage" figure (this repo has no download-count or
    rating tracking to report alongside it, unlike the reference repo's Usage
    section — see AdminStats' docstring)."""
    client = get_minio_client()
    try:
        if not client.bucket_exists(bucket):
            return 0
        return sum(obj.size or 0 for obj in client.list_objects(bucket, recursive=True))
    except S3Error:
        return 0


def object_exists(bucket: str, object_name: str) -> bool:
    client = get_minio_client()
    try:
        client.stat_object(bucket, object_name)
        return True
    except S3Error as e:
        if e.code == "NoSuchKey":
            return False
        raise


def presigned_download_url(bucket: str, object_name: str, expires_minutes: int = 60) -> str:
    client = get_minio_client()
    return client.presigned_get_object(
        bucket, object_name, expires=timedelta(minutes=expires_minutes)
    )
