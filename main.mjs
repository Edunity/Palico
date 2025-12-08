import { Client, GatewayIntentBits } from "discord.js";
import express from "express";
import fs from "fs";
import path from "path";
import RSSParser from "rss-parser";
import cron from "node-cron";

const app = express();
const parser = new RSSParser();

const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(process.cwd(), "latestTweet.json");

const RSS_URL = "https://rss.app/feeds/qmM60oCprvFwVxMS.xml";
const CHANNEL_ID = "1447457660973617305";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,   
        GatewayIntentBits.GuildMembers,     
    ],
});

let latestTweetId = load();

client.once("ready", () => {
    console.log("woke up");

    cron.schedule("* * * * *", async () => {
        try {
            const feed = await parser.parseURL(RSS_URL);
            const items = feed.items;

            if (!latestTweetId && items.length > 0) {
                latestTweetId = items[0].link || items[0].guid;

                save(latestTweetId);

                return;
            }

            for (const item of items.reverse()) {
                const tweetId = item.link || item.guid;

                if (!tweetId || tweetId == latestTweetId) {
                    continue;
                }

                const channel = await client.channels.fetch(CHANNEL_ID);

                if (channel?.isTextBased()) {
                    const sentMessage = await channel.send(`New tweet from ${feed.title}:\n${item.link}`);
                    await sentMessage.react("🔔");

                    latestTweetId = tweetId;

                    save(latestTweetId);
                }
            }
        } catch (error) {
            console.error(error);
        }
    });
});

client.on("messageCreate", (message) => {
    if (message.author.bot) {
        return;
    }
    
    if (message.content.toLowerCase().includes("mhn")) {
        message.reply("mhn");

        // await message.react("🏓");
    }
});

app.get("/", (req, res) => {
    res.json({
        status: "Bot is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log("Starting Server on port " + PORT + ".");
});function save(latestTweetID) {
    const obj = { latestTweetId: latestTweetID };

    fs.writeFileSync(DATA_FILE, JSON.stringify(obj), "utf-8");
}
function load() {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        const obj = JSON.parse(data);

        return obj.latestTweetId || null;
    } catch (error) {
        return null;
    }
}