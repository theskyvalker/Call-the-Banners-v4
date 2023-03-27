import { Command } from "@jiman24/commandment";
import { Message, PermissionResolvable } from "discord.js";
import { botCommandChannelFilter } from "../utils";
import { client } from "..";

export default class extends Command {
  name = "resethistory";
  description =
    "!resethistory Reset history of duels and loot. EX) !resethistory";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    client.duelHistory.clear();
    client.duelHistory.save();

    client.duelResultHistory.clear();
    client.duelResultHistory.save();

    client.lootHistory.clear();
    client.lootHistory.save();

    msg.channel.send("success");
  }
}
