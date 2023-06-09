import { Client } from "./structure/Client";
import path from "path";
import { config } from "dotenv";
import { DateTime } from "luxon";
import { logNonCommandMessage } from "./utils";

config();

export const client = new Client({
  intents: [
    "GUILDS",
    "GUILD_MESSAGES",
    "DIRECT_MESSAGES",
    "GUILD_MESSAGE_REACTIONS",
    "GUILD_MEMBERS",
    "GUILD_PRESENCES",
  ],
  partials: ["CHANNEL", "GUILD_MEMBER", "REACTION"],
});

client.commandManager.verbose = true;
client.commandManager.registerCommands(path.resolve(__dirname, "./commands"));

client.commandManager.registerCommandNotFoundHandler((msg, cmdName) => {
  msg.channel.send(`Cannot find command "${cmdName}"`);
});

client.commandManager.registerCommandOnThrottleHandler((msg, cmd, timeLeft) => {
  const { hours, minutes, seconds } = DateTime.now()
    .plus({ milliseconds: timeLeft })
    .diffNow(["hours", "minutes", "seconds"]);

  msg.channel.send(
    `You cannot run ${cmd.name} command after **${hours}h ${minutes}m ${seconds}s**`
  );
});

client.commandManager.registerCommandErrorHandler((err, msg) => {
  msg.channel.send((err as Error).message);
  console.log(err);
});

client.on("ready", () => console.log(client.user?.username, "is ready!"));
client.on("messageCreate", (msg) => msg.content.startsWith(client.commandManager.prefix) ? client.commandManager.handleMessage(msg) : logNonCommandMessage(msg));

client.lootHistory.resumePendingLoot();

client.login(process.env.CTB_BOT_TOKEN);
client.settings.save();