/**
 * Twitter RSS Feeds - Google Apps Script
 *
 * Google Apps Script to use Twitter API v1.1 to create RSS feeds of
 * user's timeline, search results, user's favorites, or Twitter
 * Lists.
 *
 * @author Mitchell McKenna <mitchellmckenna@gmail.com>
 * @author Amit Agarwal <amit@labnol.org>
 */

// Get your Twitter keys from https://apps.twitter.com
var TWITTER_CONSUMER_KEY = "YOUR_TWITTER_CONSUMER_KEY",
    TWITTER_CONSUMER_SECRET = "YOUR_TWITTER_CONSUMER_SECRET";

// Get your google script project key from File -> Project properties
var SCRIPT_PROJECT_KEY = "YOUR_SCRIPT_PROJECT_KEY";

// Setting cache time to less than 15 minutes may result in hitting Twitter API Rate Limits
var CACHE_TIME = 900; // 15 minutes

// Change this to false if you can't fix the script and are tired of getting emails
var EMAIL_ERROR_REPORTING = true,
    EMAIL_ERROR_REPORTING_CACHE_TIME = 14400; // 4 hours

function start() {
    var url = ScriptApp.getService().getUrl();

    if (url) {
        try {
            checkTwitterRateLimit();
        } catch (e) {
            return errorHandler(e);
        }

        var msg = "";

        msg += "Sample RSS Feeds for Twitter\n";
        msg += "============================";

        msg += "\n\nTwitter Timeline of user @mitchellmckenna";
        msg += "\n" + url + "?action=timeline&q=mitchellmckenna";

        msg += "\n\nTwitter Favorites of user @mitchellmckenna";
        msg += "\n" + url + "?action=favorites&q=mitchellmckenna";

        msg += "\n\nTwitter List mitchellmckenna/developers-designers";
        msg += "\n" + url + "?action=list&q=mitchellmckenna/developers-designers";

        msg += "\n\nTwitter Search for New York";
        msg += "\n" + url + "?action=search&q=new+york";

        msg += "\n\nYou should replace the value of the 'q' parameter in the URLs to the one you want.";
        msg += "\n\nFor help, please refer to https://github.com/MitchellMcKenna/twitter-rss-google-apps-script";

        MailApp.sendEmail(Session.getActiveUser().getEmail(), "Twitter RSS Feeds", msg);
    }
}

function doGet(e) {
    var action = e.parameter.action,
        query = e.parameter.q,
        geocode = (typeof e.parameter.geocode === "string") ? e.parameter.geocode : "",
        lang = (typeof e.parameter.lang === "string") ? e.parameter.lang : "",
        result_type = (typeof e.parameter.result_type === "string") ? e.parameter.result_type : "";

    var feed,
        permalink,
        description;

    switch (action) {
        case "timeline":
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=" + query;
            permalink = "https://twitter.com/" + query;
            description = "Twitter updates from " + query + ".";
            break;
        case "search":
            feed = "https://api.twitter.com/1.1/search/tweets.json?q=" + encodeString (query) + "&geocode=" + encodeString(geocode) + "&lang=" + encodeString(lang) + "&result_type=" + encodeString(result_type);
            permalink = "https://twitter.com/search?q=" + encodeString (query);
            description = "Twitter updates from search for: " + query + ".";
            break;
        case "favorites":
            feed = "https://api.twitter.com/1.1/favorites/list.json?screen_name=" + query;
            permalink = "https://twitter.com/" + query + "/favorites/";
            description = "Twitter favorites from " + query + ".";
            break;
        case "list":
            var segments = query.split("/");
            feed = "https://api.twitter.com/1.1/lists/statuses.json?slug=" + segments[1] + "&owner_screen_name=" + segments[0];
            permalink = "https://twitter.com/" + query;
            description = "Twitter updates from " + query + ".";
            break;
        default:
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json";
            permalink = "https://twitter.com";
            description = "Twitter timeline.";
            break;
    }

    var cache = CacheService.getPublicCache(),
        cacheId = Utilities.base64Encode(feed),
        rss = cache.get(cacheId);

    if (!rss) {
        try {
            rss = jsonToRss(feed, permalink, description, action, query);
        } catch (e) {
            return errorHandler(e);
        }

        cache.put(cacheId, rss, CACHE_TIME);
    }

    return ContentService.createTextOutput(rss)
        .setMimeType(ContentService.MimeType.RSS);
}


function jsonToRss(feed, permalink, description, action, query) {
    var service = oAuth(),
        response = service.fetch(feed),
        tweets = JSON.parse(response.getContentText());

    if (action == "search") {
        tweets = tweets.statuses;
    }

    if (tweets) {
        var rss = '<?xml version="1.0"?><rss version="2.0">';
        rss += '<channel><title>Twitter ' + action + ': ' + query + '</title>';
        rss += '<link>' + permalink + '</link>';
        rss += '<description>' + description + '</description>';


        for (var i = 0; i < tweets.length; i++) {
            var sender = tweets[i].user.screen_name,
                tweet = htmlentities(tweets[i].text),
                date = new Date(tweets[i].created_at);

            if (i === 0) {
                rss += '<pubDate>' + date.toUTCString() + '</pubDate>';
            }

            rss += "<item><title>" + sender + ": " + tweet + "</title>";
            rss += "<pubDate>" + date.toUTCString() + "</pubDate>";
            rss += "<guid isPermaLink='false'>" + tweets[i].id_str + "</guid>";
            rss += "<link>https://twitter.com/" + sender + "/statuses/" + tweets[i].id_str + "</link>";
            rss += "<description>" + tweet + "</description>";
            rss += "</item>";
        }


        rss += "</channel></rss>";

        return rss;
    }
}

function checkTwitterRateLimit() {
    var service = oAuth(),
        search = "https://api.twitter.com/1.1/application/rate_limit_status.json";

    return service.fetch(search);
}

function oAuth() {
    var service = getTwitterService();

    // Uncomment this is to debug Twitter OAuth failing.
    //service.reset();

    if (service.hasAccess()) {
        return service;
    } else {
        throw new Error('Twitter Auth Required. Please visit the following URL and re-run the script: ' + service.authorize());
    }
}


function getTwitterService() {
    var service = OAuth1.createService('twitter');
    service.setAccessTokenUrl('https://api.twitter.com/oauth/access_token')
    service.setRequestTokenUrl('https://api.twitter.com/oauth/request_token')
    service.setAuthorizationUrl('https://api.twitter.com/oauth/authorize')
    service.setConsumerKey(TWITTER_CONSUMER_KEY);
    service.setConsumerSecret(TWITTER_CONSUMER_SECRET);
    service.setProjectKey(SCRIPT_PROJECT_KEY);
    service.setCallbackFunction('authCallback');
    service.setPropertyStore(PropertiesService.getScriptProperties());
    return service;
}

function authCallback(request) {
    var service = getTwitterService(),
        isAuthorized = service.handleCallback(request);

    if (isAuthorized) {
        return HtmlService.createHtmlOutput('Success! Your feeds should now be working. You can close this page.');
    } else {
        return HtmlService.createHtmlOutput('Denied. You can close this page');
    }
}

function errorHandler(e) {
    Logger.log(e.toString());

    var cache = CacheService.getPublicCache(),
        message = e.message || e.toString(),
        errorCacheId = Utilities.base64Encode(message.substr(0, 64));

    if (EMAIL_ERROR_REPORTING && !cache.get(errorCacheId)) {
        MailApp.sendEmail(Session.getActiveUser().getEmail(), "Twitter RSS Feeds Error", message);
        cache.put(errorCacheId, true, EMAIL_ERROR_REPORTING_CACHE_TIME);
    }

    return HtmlService.createHtmlOutput(e.message);
}

function encodeString(q) {
    var str = encodeURIComponent(q);
    str = str.replace(/!/g,'%21');
    str = str.replace(/\*/g,'%2A');
    str = str.replace(/\(/g,'%28');
    str = str.replace(/\)/g,'%29');
    str = str.replace(/'/g,'%27');
    return str;
}

function htmlentities(str) {
    str = str.replace(/&/g, "&amp;");
    str = str.replace(/>/g, "&gt;");
    str = str.replace(/</g, "&lt;");
    str = str.replace(/"/g, "&quot;");
    str = str.replace(/'/g, "&#039;");
    return str;
}
