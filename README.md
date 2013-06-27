# Twitter RSS Feeds - Google Apps Script

Google Apps Script to use Twitter API v1.1 to create RSS feeds of  user's timeline, search results, user's favorites, or Twitter Lists. This script is based on the one by Amit Agarwal posted on [labnol.org](http://www.labnol.org/internet/google-plus-rss-feeds/25557/).

Twitter API 1.0 has been deprecated, and as such RSS feeds are no longer available. With API v1.1, all requests to the Twitter API must now be authenticated with OAuth. Using Google Apps Scripts, anyone can easily setup a script to do the oAuth and output an RSS feed without having to host the code themselves.

## How to Create RSS Feeds for Twitter API 1.1

### 1. Setup a Twitter App

* Go to [dev.twitter.com/apps](https://dev.twitter.com/apps), and create a Twitter app. Give your app any name, description, website (any URL) and put ```https://spreadsheets.google.com/macros/``` in the callback URL field.
* Take note of the Consumer Key and Consumer Secret Key.

### 2. Configure your Google Script
* [Click here](https://script.google.com/d/1xrMvosTNNWsBH5aJJjLcqEGMFCC4tmNsN-gz9mjKFbT74bIKBKVu-Z5z/edit?newcopy=true) to copy the Twitter RSS script into your Google Drive. 
* Replace the placeholders for Twitter Consumer key and Secret in the start() function.
* Go to *File* -> *Manage Version* and choose *Save New Version*.
* Go to *Publish* -> *Deploy as Web App* and choose *Anyone, even anonymous* under Who has Access. Click the Deploy button.

### 3. Deploy the Twitter RSS Feed generator
* Go to *Run* -> *Start* and an oAuth window will open to grant the twitter app the necessary permissions.
* You’ll get an email to your google account's email address with links to some sample RSS feeds.
