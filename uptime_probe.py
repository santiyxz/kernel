#!/usr/bin/env python3
"""One health probe, appended to uptime.json.

Run by .github/workflows/uptime.yml every 15 minutes. A failed probe is data, not an error:
the job still succeeds so the workflow never goes red over a bot restart.
"""

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

TARGET = (os.environ.get("UPTIME_TARGET") or "").rstrip("/")
FILE = os.environ.get("UPTIME_FILE", "uptime.json")
LIMIT = 96  # 24 hours at one check per 15 minutes


def read_checks():
    try:
        with open(FILE, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        checks = data.get("checks")
        return checks if isinstance(checks, list) else []
    except (OSError, ValueError):
        return []


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def probe():
    check = {"at": stamp()}
    started = time.time()
    if not TARGET:
        check.update(ok=False, error="no UPTIME_TARGET")
        return check
    request = urllib.request.Request(
        TARGET + "/api/health",
        headers={
            "User-Agent": "kernel-uptime/1",
            "ngrok-skip-browser-warning": "1",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(8192).decode("utf-8", "replace")
            code = response.status
        check["code"] = code
        try:
            payload = json.loads(body)
        except ValueError:
            payload = None
        check["ok"] = code == 200 and isinstance(payload, dict) and payload.get("ok") is True
        if not check["ok"]:
            check["error"] = "unexpected body"
    except urllib.error.HTTPError as error:
        check.update(ok=False, code=error.code, error="HTTP " + str(error.code))
    except Exception as error:  # noqa: BLE001 - the probe records whatever went wrong
        check.update(ok=False, error=type(error).__name__)
    check["ms"] = int((time.time() - started) * 1000)
    return check


def main():
    checks = read_checks()
    checks.append(probe())
    checks = checks[-LIMIT:]
    payload = {
        "target": TARGET,
        "updatedAt": stamp(),
        "checks": checks,
    }
    with open(FILE, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    last = checks[-1]
    print(("up" if last.get("ok") else "down") + " · " + last["at"] + " · " + str(len(checks)) + " check(s) kept")


if __name__ == "__main__":
    main()
