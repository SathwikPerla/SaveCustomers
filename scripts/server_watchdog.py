import time
import subprocess
import urllib.request
import urllib.error
import sys
import os

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEALTH_URL = "http://127.0.0.1:8080/api/health"

def get_wifi_ip():
    try:
        res = subprocess.check_output(["ipconfig", "getifaddr", "en0"], text=True).strip()
        return res
    except Exception:
        return "127.0.0.1"

def is_healthy():
    try:
        req = urllib.request.Request(HEALTH_URL, headers={"User-Agent": "Watchdog/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200
    except Exception:
        return False

def restart_uvicorn():
    print("[ServerWatchdog] Uvicorn server is unreachable! Restarting...", flush=True)
    # Kill any stale process on 8080
    try:
        out = subprocess.check_output(["lsof", "-ti", ":8080"], text=True).strip()
        if out:
            for pid in out.splitlines():
                subprocess.run(["kill", "-9", pid])
    except Exception:
        pass

    # Launch uvicorn
    env = os.environ.copy()
    env["PYTHONPATH"] = "backend"
    proc = subprocess.Popen(
        ["backend/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"],
        cwd=PROJECT_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    print(f"[ServerWatchdog] Started uvicorn with PID {proc.pid}", flush=True)
    time.sleep(2)

def main():
    print(f"[ServerWatchdog] Monitoring http://127.0.0.1:8080 and LAN IP {get_wifi_ip()}:8080", flush=True)
    fail_count = 0
    last_ip = get_wifi_ip()
    
    while True:
        current_ip = get_wifi_ip()
        if current_ip != last_ip:
            print(f"[ServerWatchdog] Notice: Wi-Fi IP changed from {last_ip} to {current_ip}!", flush=True)
            last_ip = current_ip
            
        if is_healthy():
            fail_count = 0
        else:
            fail_count += 1
            print(f"[ServerWatchdog] Health check failed ({fail_count}/2)...", flush=True)
            if fail_count >= 2:
                restart_uvicorn()
                fail_count = 0
                
        time.sleep(4)

if __name__ == "__main__":
    main()

