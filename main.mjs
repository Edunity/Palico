import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";
import RSSParser from "rss-parser";
import cron from "node-cron";

const app = express();
const parser = new RSSParser();

const PORT = process.env.PORT || 3000;

const RSS_URL = "https://rss.app/feeds/qmM60oCprvFwVxMS.xml";
const CHANNEL_ID = "1447457660973617305";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,   
        GatewayIntentBits.GuildMembers,     
    ],
});

let latestTweetTime = null;

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error(error);
    
    process.exit(1);
});

client.once("ready", () => {
    console.log("Woke up.");

    cron.schedule("* * * * *", async () => {
        try {
            const feed = await parser.parseURL(RSS_URL);
            const items = feed.items;
    
            console.log(items.length + "tweets recieved.");
    
            if(items.length == 0) {
                return;
            }

            items.sort((item1, item2) => new Date(item1.isoDate) - new Date(item2.isoDate));
    
            if (!latestTweetTime) {
                const item = items[0];
    
                const channel = await client.channels.fetch(CHANNEL_ID);
    
                if(channel?.isTextBased()) {
                    const sentMessage = await channel.send(`New tweet from ${feed.title}:\n${item.link}`);
                    await sentMessage.react("🔔");
    
                    latestTweetTime = item.isoDate || item.pubDate;
                }
    
                return;
            }
    
            for (const item of items) {
                const tweetTime = item.isoDate || item.pubDate;
    
                if (!tweetTime || new Date(tweetTime) <= new Date(latestTweetTime)) {
                    continue;
                }
    
                const channel = await client.channels.fetch(CHANNEL_ID);
    
                if (channel?.isTextBased()) {
                    const sentMessage = await channel.send(`New tweet from ${feed.title}:\n${item.link}`);
                    await sentMessage.react("🔔");
    
                    latestTweetTime = tweetTime;
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    });
});

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) {
            return;
        }
        
        if (message.content.toLowerCase().includes("mhn")) {
            // await message.reply("mhn");
    
            // await message.react("🏓");
        }
    }
    catch (error) {
        console.error(error);
    }
});

app.get("/", (request, response) => {
    response.json({
        status: "Bot is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log("Starting Server on port " + PORT + ".");
});
