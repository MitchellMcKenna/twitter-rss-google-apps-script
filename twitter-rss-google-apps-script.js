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

        msg += "\n\nYou should replace the value of the 'q' parameter in the URLs to the one you want.";
        msg += "\n\nFor help, please refer to https://github.com/MitchellMcKenna/twitter-rss-google-apps-script";

        MailApp.sendEmail(Session.getActiveUser().getEmail(), "Twitter RSS Feeds", msg);
    }
}

function doGet(e) {
    var a = e.parameter.action;
    var q = e.parameter.q;

    var feed;
    var permalink;
    var description;

    switch (a) {
        case "timeline":
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=" + q;
            permalink = "https://twitter.com/" + q;
            description = "Twitter updates from " + q + ".";
            break;
        case "search":
            feed = "https://api.twitter.com/1.1/search/tweets.json?q=" + encodeString (q);
            permalink = "https://twitter.com/search?q=" + encodeString (q);
            description = "Twitter updates from search for: " + q + ".";
            break;
        case "favorites":
            feed = "https://api.twitter.com/1.1/favorites/list.json?screen_name=" + q;
            permalink = "https://twitter.com/" + q + "/favorites/";
            description = "Twitter favorites from " + q + ".";
            break;
        case "list":
            var i = q.split("/");
            feed = "https://api.twitter.com/1.1/lists/statuses.json?slug=" + i[1] + "&owner_screen_name=" + i[0];
            permalink = "https://twitter.com/" + q;
            description = "Twitter updates from " + q + ".";
            break;
        default:
            feed = "https://api.twitter.com/1.1/statuses/user_timeline.json";
            permalink = "https://twitter.com";
            description = "Twitter timeline.";
            break;
    }

    var id = Utilities.base64Encode(feed);

    var cache = CacheService.getPublicCache();

    var rss   = cache.get(id);

    if (!rss) {
        rss = jsonToRss(feed, permalink, description, a, q);

        cache.put(id, rss, 900);
    }

    return ContentService.createTextOutput(rss)
        .setMimeType(ContentService.MimeType.RSS);
}


function jsonToRss(feed, permalink, description, type, key) {
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
                    rss = '<?xml version="1.0"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
                    rss += '<channel><title>Twitter ' + type + ': ' + key + '</title>\n';
                    rss += '<link>' + permalink + '</link>\n';
                    rss += '<description>' + description + '</description>\n';
                    rss += '<atom:link href="'+ScriptApp.getService().getUrl()+'" rel="self" type="application/rss+xml" />';

                    for (var i = 0; i < len; i++) {
                      
                        if (typeof tweets[i].retweeted_status != 'undefined') {
                          var tweet = tweets[i].retweeted_status;
                        } else {
                          var tweet = tweets[i];
                        }
                        var sender = tweet.user.screen_name;
                        var sender_name = tweet.user.name;
                        var senderpic = tweet.user.profile_image_url_https;
                        var original_tweet = htmlentities(tweet.text);
                        var display_tweet = tweet.text;
                        var retweets = tweet.retweet_count;
                        var favs = tweet.favorite_count;
                        var date = new Date(tweet.created_at);
                        var enclosures = "";
                                           
                         //Parse Tweet for Display
                      if (typeof tweet.entities.hashtags != 'undefined') {
                        for (var j = 0; j < tweet.entities.hashtags.length; j++) {
                          display_tweet = display_tweet.replace("#"+tweet.entities.hashtags[j].text, "<a href='https://twitter.com/search?q=%23"+tweet.entities.hashtags[j].text+"&src=hash'>#" + tweet.entities.hashtags[j].text + "</a>");
                        }
                      }
                      if (typeof tweet.entities.media != 'undefined') {
                        for (j = 0; j < tweet.entities.media.length; j++) {
                          display_tweet = display_tweet.replace(tweet.entities.media[j].url, "<a href='"+tweet.entities.media[j].expanded_url+"' title='"+tweet.entities.media[j].display_url+"'><img src='"+tweet.entities.media[j].media_url_https+"'></a>");
                          var tmp = UrlFetchApp.fetch(tweet.entities.media[j].media_url_https);
                          tmp = tmp.getHeaders();
                          if (typeof tmp["Content-Length"] != 'undefined' && typeof tmp["Content-Type"] != 'undefined') {
                            enclosures += "<enclosure url='"+tweet.entities.media[j].media_url+"' length='"+tmp["Content-Length"]+"' type='"+tmp["Content-Type"]+"' />\n";
                          }
                        }
                      }
                      if (typeof tweet.entities.urls != 'undefined') {
                        for (j = 0; j < tweet.entities.urls.length; j++) {
                          display_tweet = display_tweet.replace(tweet.entities.urls[j].url, "<a href='"+tweet.entities.urls[j].url+"' title='"+tweet.entities.urls[j].expanded_url+"'>"+tweet.entities.urls[j].display_url+"</a>");
                        }
                      }
                      if (typeof tweet.entities.user_mentions != 'undefined') {
                        for (j = 0; j < tweet.entities.user_mentions.length; j++) {
                          display_tweet = display_tweet.replace("@"+tweet.entities.user_mentions[j].screen_name, "<a href='https://www.twitter.com/"+tweet.entities.user_mentions[j].screen_name+"' title='"+tweet.entities.user_mentions[j].name+"'>@"+tweet.entities.user_mentions[j].screen_name+"</a>");
                        }
                      }
                      
                        if (i === 0) {
                            rss += '<pubDate>' + date.toUTCString() + '</pubDate>\n';
                        }

                        rss += "<item><title>" + sender + ": " + original_tweet + "</title>\n";
                        rss += "<pubDate>" + date.toUTCString() + "</pubDate>\n";
                        rss += "<guid isPermaLink='false'>" + tweets[i].id_str + "</guid>\n";
                        rss += "<link>https://twitter.com/" + sender + "/statuses/" + tweets[i].id_str + "</link>\n";
                        rss += "<description><![CDATA[<table>\n";
                        if (typeof tweets[i].retweeted_status != 'undefined') {
                          rss += "<tr><td colspan='2'><a href='https://twitter.com/" + tweets[i].user.screen_name + "'>" + tweets[i].user.name + " (@" + tweets[i].user.screen_name + ") Retweeted</a></td></tr>\n";
                        }
                        rss += "<tr><td><a href='https://twitter.com/" + sender + "'><img src='"+senderpic+"'></a></td>\n"+
                               "<td><strong>"+sender_name+"</strong> <a href='https://twitter.com/" + sender + "'>@"+sender+"</a> <br>\n";
                        rss += display_tweet + "<br>\n";
                        rss += retweets+" Retweets | "+favs+" Favorites</td></tr></table>\n";
                        rss += "]]></description>\n";
                        rss += enclosures;
                        rss += "<comments>https://twitter.com/" + sender + "/statuses/" + tweets[i].id_str + "#descendants</comments>\n";
                        rss += "</item>\n";
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
