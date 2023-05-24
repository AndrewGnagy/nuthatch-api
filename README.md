# Nuthatch-Api
An api for birding

## Setup
1. `npm install`
2. This is set up to be a Google project. Set up Google account credentials and create a .env file:
```
GOOGLE_CLIENT_ID={YOURS_HERE}
GOOGLE_CLIENT_SECRET={YOURS_HERE}
GOOGLE_APPLICATION_CREDENTIALS=creds.json
RECAPTCHA_SECRET_KEY={YOURS_HERE}
APP_PW={YOURS_HERE}
```
To not use recaptcha, simply remove the `handleRecaptcha` method.
