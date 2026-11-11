#!/usr/bin/env python3
"""Write servers.json with every Discord server Kernel is in.

The bot token is read from, in order:
  1. the DISCORD_TOKEN environment variable
  2. a path passed with --env (for example ../kernel-bot/.env)
  3. .env in the site folder

Nothing here prints the token. Run from anywhere:

    python tools/fetch_servers.py
    python tools/fetch_servers.py --env C:/path/to/kernel-bot/.env

Then restart the bot or re-upload the site folder. Requires Python 3.8+ and no
third-party packages.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://discord.com/api/v10"
TOKEN_LINE = re.compile(r"^\s*(?:export\s+)?DISCORD_TOKEN\s*=\s*(.*?)\s*$")


def fail(message: str) -> "NoReturn":
    print("error: " + message, file=sys.stderr)
    raise SystemExit(1)


def token_from_file(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except OSError as exc:
        fail(f"could not read {path}: {exc}")
    for line in text.splitlines():
        match = TOKEN_LINE.match(line)
        if not match:
            continue
        value = match.group(1).strip().strip('"').strip("'")
        if value:
            return strip_bot_prefix(value)
    return ""


def strip_bot_prefix(value: str) -> str:
    value = value.strip()
    if value[:4].lower() == "bot ":
        return value[4:].strip()
    return value


def load_token(env_arg: str | None) -> str:
    token = strip_bot_prefix(os.environ.get("DISCORD_TOKEN", ""))
    if token:
        return token

    candidates = []
    if env_arg:
        candidates.append(Path(env_arg).expanduser())
    candidates.append(ROOT / ".env")

    for path in candidates:
        if not path.is_file():
            continue
        token = token_from_file(path)
        if token:
            return token

    fail(
        "no bot token found. Either set DISCORD_TOKEN, pass --env pointing at the "
        "bot's .env, or put a .env with DISCORD_TOKEN=... next to index.html."
    )


def api_get(path: str, token: str) -> dict:
    request = urllib.request.Request(
        API + path,
        headers={
            "Authorization": "Bot " + token,
            "User-Agent": "KernelSite/1.0 (+https://discord.com)",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 401:
            fail("Discord rejected the token (401). Reset it in the Developer Portal and update .env.")
        if exc.code == 403:
            fail("Discord refused access with this token (403). Check that the bot is still in the application.")
        if exc.code == 429:
            retry = exc.headers.get("Retry-After", "2")
            try:
                wait = max(1.0, float(retry))
            except ValueError:
                wait = 2.0
            time.sleep(wait)
            return api_get(path, token)
        fail(f"Discord returned HTTP {exc.code} for {path}.")
    except urllib.error.URLError as exc:
        fail(f"could not reach Discord: {exc.reason}")
    except json.JSONDecodeError:
        fail("Discord sent a response that was not JSON.")
    return {}


def main() -> None:
    parser = argparse.ArgumentParser(description="Write servers.json for the Kernel site.")
    parser.add_argument(
        "--env",
        help="path to the bot's .env file (default: .env next to index.html)",
    )
    parser.add_argument(
        "--out",
        default=str(ROOT / "servers.json"),
        help="where to write servers.json (default: the site folder)",
    )
    args = parser.parse_args()

    token = load_token(args.env)
    guilds = api_get("/users/@me/guilds", token)
    if not isinstance(guilds, list):
        fail("unexpected guild list from Discord.")

    servers = []
    total = len(guilds)
    for index, guild in enumerate(guilds, start=1):
        guild_id = str(guild.get("id", ""))
        if not guild_id:
            continue
        member_count = None
        detail = {}
        try:
            detail = api_get(f"/guilds/{guild_id}?with_counts=true", token)
            member_count = detail.get("approximate_member_count") or detail.get("member_count")
        except Exception:
            member_count = None

        servers.append(
            {
                "id": guild_id,
                "name": detail.get("name") or guild.get("name"),
                "icon": detail["icon"] if "icon" in detail else guild.get("icon"),
                "memberCount": member_count,
            }
        )
        if index < total:
            time.sleep(0.12)

    servers = [server for server in servers if server.get("name")]
    servers.sort(key=lambda server: (server.get("memberCount") or 0), reverse=True)

    payload = {
        "updatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sample": False,
        "servers": servers,
    }

    out = Path(args.out).expanduser()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Wrote {len(servers)} server(s) to {out}")
    if not servers:
        print("Kernel is not in any servers yet, or the token belongs to a different application.")


if __name__ == "__main__":
    main()
