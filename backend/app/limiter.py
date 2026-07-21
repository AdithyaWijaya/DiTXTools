from slowapi import Limiter
from slowapi.util import get_remote_address

# key_func=get_remote_address -> limit dihitung per-IP.
# Catatan: storage default slowapi adalah in-memory, jadi limitnya hanya
# berlaku per worker process. Kalau nanti deploy dengan beberapa worker
# (gunicorn -w N) atau beberapa instance, gunakan storage_uri ke Redis
# supaya limitnya konsisten di semua proses, contoh:
#   Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379")
limiter = Limiter(key_func=get_remote_address)