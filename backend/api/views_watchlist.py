import json, uuid
from typing import Optional
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from .auth_firebase import firebase_protected


def _upsert_profile(firebase_uid: str, email: Optional[str]):
    with connection.cursor() as c:
        c.execute("""
          insert into profiles (firebase_uid, email)
          values (%s, %s)
          on conflict (firebase_uid) do update set email = excluded.email
        """, [firebase_uid, email])


@firebase_protected
@require_http_methods(["GET"])
def list_watchlists(request):
    uid = request.firebase_uid
    _upsert_profile(uid, request.user_email)
    with connection.cursor() as c:
        c.execute("""
          select w.id, w.name, w.created_at,
                 coalesce(
                   json_agg(json_build_object('symbol', wi.symbol, 'added_at', wi.added_at)
                            order by wi.added_at)
                   filter (where wi.symbol is not null),
                   '[]'
                 ) as items
          from watchlists w
          left join watchlist_items wi on wi.watchlist_id = w.id
          where w.firebase_uid = %s
          group by w.id
          order by w.created_at desc
        """, [uid])
        rows = c.fetchall()
    return JsonResponse(
        [{"id": str(r[0]), "name": r[1], "created_at": r[2], "items": r[3]} for r in rows],
        safe=False
    )


@firebase_protected
@require_http_methods(["POST"])
@csrf_exempt
def create_watchlist(request):
    uid = request.firebase_uid
    body = json.loads(request.body or "{}")
    name = (body.get("name") or "").strip()
    if not name:
        return JsonResponse({"detail": "name is required"}, status=400)

    wid = uuid.uuid4()
    with connection.cursor() as c:
        c.execute("insert into watchlists (id, firebase_uid, name) values (%s, %s, %s)", [wid, uid, name])
    return JsonResponse({"id": str(wid), "name": name}, status=201)


@firebase_protected
@require_http_methods(["POST"])
@csrf_exempt
def add_symbol(request, watchlist_id: str):
    uid = request.firebase_uid
    body = json.loads(request.body or "{}")
    symbol = (body.get("symbol") or "").upper().strip()
    if not symbol:
        return JsonResponse({"detail": "symbol is required"}, status=400)

    with connection.cursor() as c:
        c.execute("select 1 from watchlists where id=%s and firebase_uid=%s", [watchlist_id, uid])
        if not c.fetchone():
            return JsonResponse({"detail": "watchlist not found"}, status=404)
        c.execute("""
          insert into watchlist_items (watchlist_id, symbol)
          values (%s, %s)
          on conflict (watchlist_id, symbol) do nothing
        """, [watchlist_id, symbol])
    return JsonResponse({"ok": True}, status=201)


@firebase_protected
@require_http_methods(["DELETE"])
@csrf_exempt
def remove_symbol(request, watchlist_id: str, symbol: str):
    uid = request.firebase_uid
    symbol = symbol.upper()
    with connection.cursor() as c:
        c.execute("select 1 from watchlists where id=%s and firebase_uid=%s", [watchlist_id, uid])
        if not c.fetchone():
            return JsonResponse({"detail": "watchlist not found"}, status=404)
        c.execute("delete from watchlist_items where watchlist_id=%s and symbol=%s", [watchlist_id, symbol])
    return JsonResponse({"ok": True})
