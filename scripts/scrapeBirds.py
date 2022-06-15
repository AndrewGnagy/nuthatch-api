#!/usr/bin/python
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import sqlite3
from google.cloud import datastore
import re
from os.path import join, dirname
from dotenv import load_dotenv
import requests
from time import sleep

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
    browser = webdriver.Chrome(chrome_options=options)

    # Go to AllBirds page
    browser.get('https://www.allaboutbirds.org/guide/browse/taxonomy')

    # Grab links
    links = browser.find_elements_by_css_selector('.species-info a')

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
            # name = browser.find_element_by_css_selector('.speciesInfoCard .species-name').text
            # sci_name = browser.find_element_by_css_selector('.speciesInfoCard .species-info em').text
            # family = browser.find_element_by_css_selector('.speciesInfoCard .additional-info li:nth-child(2)').text.split(": ")[1]
            # order = browser.find_element_by_css_selector('.speciesInfoCard .additional-info li:nth-child(1)').text.split(": ")[1]
            # conservation_status = browser.find_element_by_css_selector('.speciesInfoCard .conservation + span span:nth-child(2)').text
            sizes = browser.find_element_by_css_selector('.rel-size .add-info').text
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

getRecordings()