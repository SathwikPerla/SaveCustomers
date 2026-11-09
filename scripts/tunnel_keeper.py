import subprocess
import re
import time
import sys

def run_tunnel():
    while True:
        print("[TunnelKeeper] Starting cloudflared tunnel...", flush=True)
        proc = subprocess.Popen(
            ["/opt/homebrew/bin/cloudflared", "tunnel", "--url", "http://127.0.0.1:8080"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True
        )
        url = None
        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            if not url:
                m = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if m:
                    url = m.group(0)
                    print(f"\n==========================================", flush=True)
                    print(f"🔥 ACTIVE LIVE URL: {url}", flush=True)
                    print(f"==========================================\n", flush=True)
                    with open("ACTIVE_URL.txt", "w") as f:
                        f.write(url + "\n")
            if "Tunnel not found" in line or "connection failed" in line.lower():
                print("[TunnelKeeper] Tunnel dropped. Restarting...", flush=True)
                proc.terminate()
                break
        proc.wait()
        time.sleep(3)

if __name__ == "__main__":
    run_tunnel()

