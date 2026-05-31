import requests
from bs4 import BeautifulSoup
import json

url = 'https://www.ipscmatch.de/'
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

matches = []
for row in soup.find_all('tr'):
    if '%' in row.text:
        matches.append(row.text.strip())

with open('matches.json', 'w', encoding='utf-8') as f:
    json.dump(matches, f, ensure_ascii=False)
