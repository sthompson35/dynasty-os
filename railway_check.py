import requests
import sys

RAILWAY_URL = "https://dynasty-os-production.up.railway.app"


def check_health():
    endpoints = ["/health", "/healthz", "/readyz"]
    for ep in endpoints:
        url = RAILWAY_URL + ep
        try:
            resp = requests.get(url, timeout=10)
            print(f"{ep}: {resp.status_code} {resp.text}")
            if resp.status_code != 200:
                print(f"ERROR: {ep} returned {resp.status_code}")
                return False
        except Exception as e:
            print(f"ERROR: {ep} failed with {e}")
            return False
    return True


def main():
    print("Running Railway health checks...")
    if not check_health():
        print("Health check failed.")
        sys.exit(1)
    print("All health checks passed.")

if __name__ == "__main__":
    main()
