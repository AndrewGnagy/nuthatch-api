#!/usr/bin/python
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import sqlite3

print('Starting BirdScraper')
con = sqlite3.connect('birds.db')

cur = con.cursor()

# Create table
# cur.execute('''CREATE TABLE birds2
#                (id integer primary key autoincrement, name text, sciName text, ordr text, family text, conservationStatus text)''')
# cur.execute('insert into birds2(name, sciName, ordr, family, conservationStatus) select name, sciName, ordr, family, conservationStatus from birds')
# cur.execute('drop table birds')
# cur.execute('alter table birds2 rename to birds')

# Doing a headless browser, because that's neat
#browser = webdriver.PhantomJS()
options = Options()
options.add_argument('--headless')
options.add_argument('--disable-gpu')
browser = webdriver.Chrome(chrome_options=options)

# Go to AllBirds page
browser.get('https://www.allaboutbirds.org/guide/browse/taxonomy')

time.sleep(2)

# Grab links
# links = browser.find_elements_by_css_selector('.species-info a')

# link_uris = [a.get_attribute("href") for a in links]
# for i, link_uri in enumerate(link_uris):
#     browser.get(link_uri)
#     time.sleep(2)
#     name = browser.find_element_by_css_selector('.speciesInfoCard .species-name').text
#     sci_name = browser.find_element_by_css_selector('.speciesInfoCard .species-info em').text
#     family = browser.find_element_by_css_selector('.speciesInfoCard .additional-info li:nth-child(2)').text.split(": ")[1]
#     order = browser.find_element_by_css_selector('.speciesInfoCard .additional-info li:nth-child(1)').text.split(": ")[1]
#     conservation_status = browser.find_element_by_css_selector('.speciesInfoCard .conservation + span span:nth-child(2)').text
#     # Insert a row of data
#     print(i, name, link_uri) 
#     print((name, sci_name, family, order, conservation_status))
#     cur.execute("INSERT INTO birds VALUES(?, ?, ?, ?, ?)", (name, sci_name, family, order, conservation_status))

# Save (commit) the changes
con.commit()

# We can also close the connection if we are done with it.
# Just be sure any changes have been committed or they will be lost.
con.close()