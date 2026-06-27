import urllib.request
import re

url = "https://unsplash.com/photos/young-asian-woman-nurse-caregiver-carer-of-nursing-home-cheer-up-a-senior-asian-woman-at-home-x0nF4m0G8gQ"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        print(f"Successfully fetched! Length: {len(html)}")
        # Look for images.unsplash.com URLs
        urls = re.findall(r'https://images\.unsplash\.com/[a-zA-Z0-9\-_/?=&%]+', html)
        print("Found Unsplash Image URLs:")
        for u in set(urls)[:10]:
            print(u)
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read()[:500])
