// 必要なライブラリを読み込み
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import express from "express";

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
    console.log(client.user.tag + " has started successfully");
    console.log("Connected to " + client.guilds.cache.size + " servers");
});

// メッセージが送信されたときの処理
client.on("messageCreate", (message) => {
    if (message.author.bot) {
        return;
    }
    
    if (message.content.toLowerCase() === "ping") {
        message.reply("pong");
        console.log(message.author.tag + " used the ping command");
    }
});

// エラーハンドリング
client.on("error", (error) => {
    console.error("Discord client error:", error);
});

// プロセス終了時の処理
process.on("SIGINT", () => {
    console.log("Shutting down the bot...");

    client.destroy();
    process.exit(0);
});

// Discord にログイン
if (!process.env.DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN is not set in the .env file");
    process.exit(1);
}

console.log("Connecting to Discord...");

client.login(process.env.DISCORD_TOKEN)
    .catch(error => {
        console.error("Failed to log in:", error);
        process.exit(1);
    });

// Express Webサーバーの設定（Render用）
const app = express();
const port = process.env.PORT || 3000;

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
