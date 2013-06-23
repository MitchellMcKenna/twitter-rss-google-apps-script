/**
 * Twitter RSS Feeds - Google Apps Script
 *
 * Google Apps Script to use Twitter API v1.1 to create RSS feeds of
 * user's timeline, search results, user's favorites, or Twitter
 * Lists.
 *
 * @author Amit Agarwal <amit@labnol.org>
 * @author Mitchell McKenna <mitchellmckenna@gmail.com>
 */

function start() {
    // Get your Twitter keys from dev.twitter.com/apps
    var CONSUMER_KEY = "YOUR_TWITTER_CONSUMER_KEY";
    var CONSUMER_SECRET = "YOUR_TWITTER_CONSUMER_SECRET";

    initialize(CONSUMER_KEY, CONSUMER_SECRET);
}

function initialize(key, secret) {
    ScriptProperties.setProperty("TWITTER_CONSUMER_KEY", key);
    ScriptProperties.setProperty("TWITTER_CONSUMER_SECRET", secret);

    var url = ScriptApp.getService().getUrl();

    if (url) {
        connectTwitter();

        var msg = "";

        msg += "Sample RSS Feeds for Twitter\n";
        msg += "============================";

        msg += "\n\nTwitter Timeline of user @labnol";
        msg += "\n" + url + "?action=timeline&q=labnol";

        msg += "\n\nTwitter Favorites of user @labnol";
        msg += "\n" + url + "?action=favorites&q=labnol";

        msg += "\n\nTwitter List labnol/friends-in-india";
        msg += "\n" + url + "?action=list&q=labnol/friends-in-india";

        msg += "\n\nTwitter Search for New York";
        msg += "\n" + url + "?action=search&q=new+york";

        msg += "\n\nYou should replace the value of 'q' parameter in the URLs as per requirement.";
        msg += "\n\nFor help, please refer to http://www.labnol.org/?p=27931";

        MailApp.sendEmail(Session.getActiveUser().getEmail(), "Twitter RSS Feeds", msg);
    }
}

function doGet(e) {
    var a = e.parameter.action;
    var q = e.parameter.q;

    var feed;
    var permalink;

    switch (a) {
        case "timeline":
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=" + q;
            permalink = "https://twitter.com/" + q;
            break;
        case "search":
            feed = "https://api.twitter.com/1.1/search/tweets.json?q=" + encodeString (q);
            permalink = "https://twitter.com/search?q=" + encodeString (q);
            break;
        case "favorites":
            feed = "https://api.twitter.com/1.1/favorites/list.json?screen_name=" + q;
            permalink = "https://twitter.com/" + q + "/favorites/";
            break;
        case "list":
            var i = q.split("/");
            feed = "https://api.twitter.com/1.1/lists/statuses.json?slug=" + i[1] + "&owner_screen_name=" + i[0];
            permalink = "https://twitter.com/" + q;
            break;
        default:
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json";
            permalink = "https://twitter.com";
            break;
    }

    var id = Utilities.base64Encode(feed);

    var cache = CacheService.getPublicCache();

    var rss   = cache.get(id);

    if (!rss) {
        rss = jsonToRss(feed, permalink, a, q);

        cache.put(id, rss, 900);
    }

    return ContentService.createTextOutput(rss)
        .setMimeType(ContentService.MimeType.RSS);
}


function jsonToRss(feed, permalink, type, key) {
    oAuth();

    var options =
    {
        "method": "get",
        "oAuthServiceName":"twitter",
        "oAuthUseToken":"always"
    };

    try {
        var result = UrlFetchApp.fetch(feed, options);

        if (result.getResponseCode() === 200) {
            var tweets = Utilities.jsonParse(result.getContentText());

            if (type == "search") {
                tweets = tweets.statuses;
            }

            if (tweets) {
                var len = tweets.length;

                var rss = "";

                if (len) {
                    rss = '<?xml version="1.0"?><rss version="2.0">';
                    rss += ' <channel><title>Twitter ' + type + ': ' + key + '</title>';
                    rss += ' <link>' + permalink + '</link>';
                    rss += ' <pubDate>' + new Date() + '</pubDate>';

                    for (var i=0; i<len; i++) {
                        var sender = tweets[i].user.screen_name;
                        var tweet = htmlentities(tweets[i].text);

                        rss += "<item><title>" + sender + ": " + tweet + "</title>";
                        rss += "<author>" + tweets[i].user.name + " (@" + sender + ")</author>";
                        rss += "<pubDate>" + tweets[i].created_at + "</pubDate>";
                        rss += "<guid isPermaLink='false'>" + tweets[i].id_str + "</guid>";
                        rss += "<link>https://twitter.com/" + sender + "/statuses/" + tweets[i].id_str + "</link>";
                        rss += "<description>" + tweet + "</description>";
                        rss += "</item>";
                    }

                    rss += "</channel></rss>";

                    return rss;
                }
            }
        }
    } catch (e) {
        Logger.log(e.toString());
    }
}

function connectTwitter() {
    oAuth();

    var search = "https://api.twitter.com/1.1/application/rate_limit_status.json";

    var options =
    {
        "method": "get",
        "oAuthServiceName":"twitter",
        "oAuthUseToken":"always"
    };

    try {
        var result = UrlFetchApp.fetch(search, options);
    } catch (e) {
        Logger.log(e.toString());
    }
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

function oAuth() {
    var oauthConfig = UrlFetchApp.addOAuthService("twitter");
    oauthConfig.setAccessTokenUrl("https://api.twitter.com/oauth/access_token");
    oauthConfig.setRequestTokenUrl("https://api.twitter.com/oauth/request_token");
    oauthConfig.setAuthorizationUrl("https://api.twitter.com/oauth/authorize");
    oauthConfig.setConsumerKey(ScriptProperties.getProperty("TWITTER_CONSUMER_KEY"));
    oauthConfig.setConsumerSecret(ScriptProperties.getProperty("TWITTER_CONSUMER_SECRET"));
}
