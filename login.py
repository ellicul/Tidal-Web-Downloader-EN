#!/usr/bin/env python3
import tidalapi
import json
from pathlib import Path
import time
import sys

SESSION_FILE = Path("./token.json")

def save_session(session):
    data = {
        "session_id": session.session_id,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "country_code": session.country_code,
        "created_at": int(time.time()),
        "expires_in": 43200
    }
    with open(SESSION_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print("✅ 已保存 token 到文件:", SESSION_FILE)

def load_session():
    if not SESSION_FILE.exists():
        return None
    with open(SESSION_FILE) as f:
        data = json.load(f)
    session = tidalapi.Session()
    session.load_oauth_session(
        data["session_id"],
        "Bearer",
        data["access_token"],
        data["refresh_token"]
    )
    return session, data

def refresh_session(session):
    print("🔄 正在刷新 Tidal token...")
    try:
        session.refresh_oauth_session()
        save_session(session)
        print("✅ token 刷新成功！")
        return True
    except Exception as e:
        print("❌ 刷新失败:", e)
        return False

def login_new():
    session = tidalapi.Session()
    login, future = session.login_oauth()
    print("🌐 请访问以下 URL 登录授权：\n", login.verification_uri_complete)
    print("⏳ 等待登录完成...")
    future.result()
    save_session(session)
    print("🎵 登录完成，token 已保存。")
    return session

if __name__ == "__main__":
    if SESSION_FILE.exists():
        try:
            SESSION_FILE.unlink()
            print(f"🗑️ 已删除旧的 token 文件: {SESSION_FILE}")
        except Exception as e:
            print(f"⚠️ 无法删除旧 token 文件: {e}")
    session_info = load_session()

    if session_info:
        session, data = session_info
        expires_at = data["created_at"] + data.get("expires_in", 43200) - 300
        if time.time() >= expires_at:
            print("⚠️ token 已过期或即将过期，尝试刷新...")
            if not refresh_session(session):
                print("🚪 刷新失败，重新登录...")
                session = login_new()
        else:
            print("✅ token 仍然有效，无需重新登录。")
    else:
        print("🚪 未发现 token 文件，开始新登录...")
        session = login_new()

    print(json.dumps({
        "session_id": session.session_id,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "country_code": session.country_code
    }, indent=2))
