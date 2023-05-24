#!/usr/bin/python
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import sqlite3
from google.cloud import datastore
import re
from os.path import join, dirname
from dotenv import load_dotenv
import requests
from time import sleep
from PIL import Image
from io import BytesIO

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)

print('Starting BirdScraper')
# con = sqlite3.connect('birds.db')
# cur = con.cursor()

# Instantiates a client
datastore_client = datastore.Client("possible-post-315311")

# Create table
# cur.execute('''CREATE TABLE birds2
#                (id integer primary key autoincrement, name text, sciName text, ordr text, family text, conservationStatus text)''')
# cur.execute('insert into birds2(name, sciName, ordr, family, conservationStatus) select name, sciName, ordr, family, conservationStatus from birds')
# cur.execute('drop table birds')
# cur.execute('alter table birds2 rename to birds')

time.sleep(2)

def getBird(id):
    with datastore_client.transaction():
        key = datastore_client.key('Bird', id)
        return datastore_client.get(key)

def updateBird(bird):
    datastore_client.put(bird)

def scrape():
    # Doing a headless browser, because that's neat
    #browser = webdriver.PhantomJS()
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument("--window-size=650,900")
    browser = webdriver.Chrome(chrome_options=options)

    # Go to AllBirds page
    browser.get('https://www.allaboutbirds.org/guide/browse/taxonomy')

    # Grab links
    links = browser.find_elements(By.CSS_SELECTOR, '.species-info a')

    link_uris = [a.get_attribute("href") for a in links]
    for i, link_uri in enumerate(link_uris):
        try:
            browser.get(link_uri.replace("overview", "id"))
            time.sleep(2)
            bird = getBird(i)
            print(i, bird)
            if bird["name"].replace("'", "").replace(" ", "_") not in link_uri:
                print("Error")
                continue
            # name = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .species-name').text
            # sci_name = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .species-info em').text
            # family = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .additional-info li:nth-child(2)').text.split(": ")[1]
            # order = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .additional-info li:nth-child(1)').text.split(": ")[1]
            # conservation_status = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .conservation + span span:nth-child(2)').text
            sizes = browser.find_element(By.CSS_SELECTOR, '.rel-size .add-info').text
            print(i, sizes)
            m = re.search("Length.*\(([0-9\.]+)-([0-9\.]+) cm+\)", sizes)
            if m:
                bird["lengthMin"] = m.group(1)
                bird["lengthMax"] = m.group(2)
                # Insert a row of data
                print(i, bird["lengthMin"], bird["lengthMax"], link_uri)
            m = re.search("Wingspan.*\(([0-9\.]+)-([0-9\.]+) cm+\)", sizes)
            if m:
                bird["wingspanMin"] = m.group(1)
                bird["wingspanMax"] = m.group(2)
                # Insert a row of data
                print(i, bird["wingspanMin"], bird["wingspanMax"], link_uri) 

            updateBird(bird)
        except:
            print("error")
        # print((name, sci_name, family, order, conservation_status))
        # cur.execute("INSERT INTO birds VALUES(?, ?, ?, ?, ?)", (name, sci_name, family, order, conservation_status))

def getBirds():
    # Get all birds
    query = datastore_client.query(kind='Bird')
    l = query.fetch()
    l = list(l)
    if not l:
        print("No result is returned")
    else:
        return l

def getRecordings():
    # Get all birds
    query = datastore_client.query(kind='Bird')
    l = query.fetch()
    l = list(l)
    if not l:
        print("No result is returned")
    else:
        for bird in l:
            for rec in bird['recordings']:
                kind = "Recording"
                rec_id = rec['id']
                rec_key = datastore_client.key(kind, rec_id)
                rec_ent = datastore.Entity(key=rec_key)
                rec_ent.update(rec)
                rec_ent['birdId'] = bird['id']
                datastore_client.put(rec_ent)

            bird['recordings'] = []
            updateBird(bird)
            # print(bird)
            # # Xeno Canto Query
            # queryString = f"https://xeno-canto.org/api/2/recordings?query={bird['sciName'].replace(' ', '+')}+cnt:%22united%20states%22len:5-30lic:PDq_gt:D"
            # print(queryString)
            # recs = requests.get(queryString).json()
            # print(recs)
            # for i, rec in enumerate(recs['recordings'][:10]):
            #     recs['recordings'][i]['rmk'] = recs['recordings'][i]['rmk'][:100]
            # bird['recordings'] = recs['recordings'][:10]
            # updateBird(bird)
            # sleep(5)

def scrapeUnsplash():
    # Doing a headless browser, because that's neat
    #browser = webdriver.PhantomJS()
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument("--window-size=650,900")
    browser = webdriver.Chrome(chrome_options=options)

    birdList = getBirds()

    for listBird in birdList[586:]:
        bird = getBird(listBird["id"])

        # Go to Unsplash page
        browser.get('https://unsplash.com/s/photos/' + bird["name"].replace(" ", "-"))

        # Grab imgs
        imgs = browser.find_elements("css selector", '[data-test="photo-grid-single-col-img"]')

        img_uris = [img.get_attribute("src").split("?")[0] for img in imgs][0:3]
        kept_imgs = []
        print(bird["name"])
        try:
            for img_uri in img_uris:
                response = requests.get(img_uri)
                with Image.open(BytesIO(response.content)) as img:
                    img.show()
                    keep = input("Keep image? (y/n)")
                    if keep=="y":
                        kept_imgs.append(img_uri)
        except:
            print("err. Continuing")


        bird["images"] = kept_imgs
        print(bird["images"])
        updateBird(bird)

def scrapeAvibase():
    # Doing a headless browser, because that's neat
    #browser = webdriver.PhantomJS()
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument("--window-size=650,900")
    browser = webdriver.Chrome(chrome_options=options)

    # Go to EUC bird list page
    browser.get('https://avibase.bsc-eoc.org/checklist.jsp?region=EUO')

    # Grab links
    rows = browser.find_elements(By.CSS_SELECTOR, 'tr.highlight1')
    links = []
    for i, row in enumerate(rows):
        try:
            if "Rare/Accidental" in row.text:
                continue
            if "Introduced species" in row.text:
                continue
            a = row.find_element(By.CSS_SELECTOR, 'a')
            links.append(a.get_attribute("href"))
        except Exception as e:
            print(e)

    for i, link in enumerate(links):
        try:
            browser.get(link)
            time.sleep(2)
            name = browser.find_element(By.CSS_SELECTOR, 'h2').text
            sci_name = browser.find_element(By.CSS_SELECTOR, 'h4 i').text
            family = browser.find_element(By.CSS_SELECTOR, '#taxoninfo > a:nth-child(7)').text
            order = browser.find_element(By.CSS_SELECTOR, '#taxoninfo').get_attribute('innerText').split(":\n  ")[1].split("\nFamily")[0]
            # conservation_status = browser.find_element(By.CSS_SELECTOR, '.speciesInfoCard .conservation + span span:nth-child(2)').text
            # sizes = browser.find_element(By.CSS_SELECTOR, '.rel-size .add-info').text
            # print(i, sizes)
            # m = re.search("Length.*\(([0-9\.]+)-([0-9\.]+) cm+\)", sizes)
            # if m:
            #     bird["lengthMin"] = m.group(1)
            #     bird["lengthMax"] = m.group(2)
            #     # Insert a row of data
            #     print(i, bird["lengthMin"], bird["lengthMax"], link_uri)
            # m = re.search("Wingspan.*\(([0-9\.]+)-([0-9\.]+) cm+\)", sizes)
            # if m:
            #     bird["wingspanMin"] = m.group(1)
            #     bird["wingspanMax"] = m.group(2)
            #     # Insert a row of data
            #     print(i, bird["wingspanMin"], bird["wingspanMax"], link_uri) 
            bird = {}
            id = i + 635
            bird['id'] = i + 635
            bird['name'] = name
            bird['sciName'] = sci_name
            bird['family'] = family
            bird['order'] = order
            bird['region'] = "Western Europe"
            print(bird)
            with datastore_client.transaction():
                key = datastore_client.key("Bird", id)
                bird_entry = datastore.Entity(key=key)
                bird_entry.update(bird)
                datastore_client.put(bird_entry)

        except Exception as e:
            print(e)

birds = getBirds()
for bird in birds:
    if 'images' not in bird:
        bird['images'] = []
        updateBird(bird)