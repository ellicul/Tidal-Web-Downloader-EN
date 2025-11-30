#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, time, requests
from pathlib import Path
from datetime import datetime, timedelta
import tidalapi

# Hi-Res 自动刷新token，不能播放
#CLIENT_ID = "7m7Ap0JC9j1cOM3n"
#CLIENT_SECRET = "vRAdA108tlvkJpTsGZS8rGZ7xTlbJ0qaZ2K9saEzsgY="

# Hi-Res 不能自动刷新token，能播放
#CLIENT_ID = "zU4XHVVkc2tDPo4t"
#CLIENT_SECRET = "VJKhDFqJPqvsPVNBV6ukXTJmwlvbttP7wlMlrc72se4="

# Hi-Res 自动刷新token，能播放视频，不能播放音频
#CLIENT_ID = "6BDSRdpK9hqEBTgU"
#CLIENT_SECRET = "VJKhDFqJPqvsPVNBV6ukXTJmwlvbttP7wlMlrc72se4="

# Hi-Res 不能自动刷新token，能播放
#CLIENT_ID = "km8T1xSYMB4iK4rT"
#CLIENT_SECRET = "owUYDkxddz+9FpvGX24DlxECNtFEMBxipU0lBfrbq60="

# Atmos tv 自动刷新，除了不能hires，其他都可以
#CLIENT_ID = "fX2JxdmntZWK0ixT"
#CLIENT_SECRET = "1Nn9AfDAjxrgJFJbKNWLeAyKGVGmINuXPPLHVXAvxAg="

# Atmos tv 自动刷新，除了不能hires，其他都可以
CLIENT_ID = "4N3n6Q1x95LL5K7p"
CLIENT_SECRET = "oKOXfJW371cX6xaZ0PyhgGNBdNLlBZd4AKKYougMjik="
SESSION_FILE = Path("./token.json")

def save_session(session, session_file):
    data = {
        "session_id": session.session_id,
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "country_code": session.country_code,
        "created_at": int(time.time()),
        "expires_in": 43200
    }
    with open(session_file, "w") as f:
        json.dump(data, f, indent=2)

def load_session(session_file, client_id, client_secret):
    if not session_file.exists():
        return None, None
    try:
        with open(session_file) as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"{session_file} 文件已损坏")
        return None, None
    session = tidalapi.Session()
    session.client_id = client_id
    session.client_secret = client_secret
    try:
        session.load_oauth_session(
            data.get("session_id"),
            "Bearer",
            data.get("access_token"),
            data.get("refresh_token")
        )
        session.country_code = data.get("country_code")
    except Exception:
        session.session_id = data.get("session_id")
        session.token_type = "Bearer"
        session.access_token = data.get("access_token")
        session.refresh_token = data.get("refresh_token")
        session.country_code = data.get("country_code")
    return session, data

def refresh_session(session, session_file, client_id, client_secret):
    refresh_token = session.refresh_token
    if not refresh_token:
        print("❌ 无法刷新：refresh_token 缺失")
        return False
    url = "https://auth.tidal.com/v1/oauth2/token"
    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "r_usr w_usr"
    }

    try:
        resp = requests.post(url, data=data, timeout=10)
        if resp.status_code != 200:
            print(f"❌ 刷新失败: HTTP {resp.status_code} - {resp.text}")
            return False
        token_data = resp.json()
        session.access_token = token_data.get("access_token")
        if token_data.get("refresh_token"):
            session.refresh_token = token_data.get("refresh_token")
        save_session(session, session_file)
        print("✅ Token 刷新成功")
        return True
    except Exception as e:
        print(f"❌ 刷新请求异常: {e}")
        return False

def login_new(client_id, client_secret, session_file, name="Token"):
    session = tidalapi.Session()
    session.client_id = client_id
    session.client_secret = client_secret
    login, future = session.login_oauth()
    print(f"请在浏览器打开以下 URL 登录授权（{name}）：\n{login.verification_uri_complete}")
    print("等待登录完成...")
    future.result()
    save_session(session, session_file)
    print(f"{name} 登录完成，Token 已保存")
    return session

def main():
    name = "Tidal"
    session, data = load_session(SESSION_FILE, CLIENT_ID, CLIENT_SECRET)
    if not session or not data:
        print(f"{name} Token 文件不存在或损坏，请手动登录授权")
        session = login_new(CLIENT_ID, CLIENT_SECRET, SESSION_FILE, name)
        return
    ok = refresh_session(session, SESSION_FILE, CLIENT_ID, CLIENT_SECRET)
    if not ok:
        print(f"{name} refresh_token 已失效，请手动登录授权")
        session = login_new(CLIENT_ID, CLIENT_SECRET, SESSION_FILE, name)
if __name__ == "__main__":
    while True:
        #print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] 开始刷新 Token")
        main()
        #print("等待 2 小时后再次刷新...\n")
        time.sleep(2 * 3600)
