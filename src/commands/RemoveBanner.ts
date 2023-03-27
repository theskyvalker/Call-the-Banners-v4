import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";

export default class Help extends Command {
  name = "removebanner";
  description = "!removebanner Remove your called banner in order to fight without reinforcements. EX)!removebanner";

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);

    let player = Player.fromUser(msg.author);

    if (!player) {
      throw new Error("player not found");
    }

    player.resetNftBonuses();
    player.calledBanner = 0;
    player.save();

    msg.reply(`Removed banner bonuses for ${msg.author}!`);
  }
}