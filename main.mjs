import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";
import RSSParser from "rss-parser";
import cron from "node-cron";

const app = express();
const parser = new RSSParser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSSReader/1.0)'
  }
});

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

let latestTime = new Date();

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error(error);
    
    process.exit(1);
});

client.once("ready", () => {
    console.log("Woke up.");

    cron.schedule("0 * * * *", async () => {
        try {
            const feed = await parser.parseURL(RSS_URL);
            const items = feed.items;
    
            if (items.length == 0) {
                return;
            }
    
            const newItems = items.filter(item => {
                const time = item.isoDate || item.pubDate;
                
                return new Date(time) > latestTime;
            });
    
            if (newItems.length == 0) {
                return;
            }
    
            newItems.sort((item1, item2) => new Date(item1.isoDate || item1.pubDate) - new Date(item2.isoDate || item2.pubDate));
    
            const channel = await client.channels.fetch(CHANNEL_ID);
    
            if (!channel?.isTextBased()) {
                return;
            }
    
            for (const item of newItems) {
                const sentMessage = await channel.send(
                    `New tweet from ${feed.title}:\n${item.link}`
                );
                await sentMessage.react("🔔");
    
                latestTime = new Date(item.isoDate || item.pubDate);
            }
        } catch (error) {
            console.error(error);
        }
    });
});

client.on("messageCreate", async (message) => {
    try {
        if (message.author.bot) {
            return;
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
