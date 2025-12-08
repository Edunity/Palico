// 必要なライブラリを読み込み
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";
// ---------------------------------------------------------------------------------
import RSSParser from "rss-parser";
import cron from "node-cron";

const parser = new RSSParser();

// 監視するXユーザーのRSSフィードURL
const RSS_URL = "https://rss.app/feeds/qmM60oCprvFwVxMS.xml";
// 送信するDiscordチャンネルID
const CHANNEL_ID = "1447457660973617305";

// 過去に送信したツイートIDを保存して重複送信を防ぐ
const sentTweets = new Set<string>();

// 定期実行（例: 1分ごと）
cron.schedule("* * * * *", async () => {
    try {
        const feed = await parser.parseURL(RSS_URL);

        for (const item of feed.items) {
            // RSSのIDまたはリンクで一意性を判断
            const tweetId = item.link || item.guid;
            if (!tweetId || sentTweets.has(tweetId)) continue;

            // チャンネル取得
            const channel = await client.channels.fetch(CHANNEL_ID);
            if (channel?.isTextBased()) {
                await channel.send(`New tweet from ${feed.title}:\n${item.link}`);
                console.log("Sent tweet:", item.link);

                sentTweets.add(tweetId);

                // メモリ節約のため古いものは削除
                if (sentTweets.size > 100) {
                    const first = sentTweets.values().next().value;
                    sentTweets.delete(first);
                }
            }
        }
    } catch (error) {
        console.error("Failed to fetch RSS feed:", error);
    }
});

// ---------------------------------------------------------------------------------

// Express Webサーバーの設定（Render用）
const app = express();
const port = process.env.PORT || 3000;

// .envファイルから環境変数を読み込み
dotenv.config();

// Discord Botクライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           
        GatewayIntentBits.GuildMessages,    
        GatewayIntentBits.MessageContent,   
        GatewayIntentBits.GuildMembers,     
    ],
});

// Botが起動完了したときの処理
client.once("ready", () => {
    // console.log(client.user.tag + " has started successfully");
    // console.log("Connected to " + client.guilds.cache.size + " servers");
});

// メッセージが送信されたときの処理
client.on("messageCreate", (message) => {
    if (message.author.bot) {
        return;
    }
    
    if (message.content.toLowerCase() === "ping") {
        message.reply("pong");

        // console.log(message.author.tag + " used the ping command");
    }
});

// プロセス終了時の処理
process.on("SIGINT", () => {
    // console.log("Shutting down the bot...");

    client.destroy();
    process.exit(0);
});

// エラーハンドリング
client.on("error", (error) => {
    console.error("Discord client error:", error);
});

// Discord にログイン
if (!process.env.DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN is not set in the .env file");

    process.exit(1);
}

console.log("Connecting to Discord...");

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error("Failed to log in:", error);

    process.exit(1);
});

app.get("/", (req, res) => {
    res.json({
        status: "Bot is running",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// サーバー起動
app.listen(port, () => {
    console.log("Web server started on port " + port);
});
