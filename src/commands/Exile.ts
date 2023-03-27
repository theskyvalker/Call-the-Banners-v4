import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, getCastleFromGeneral } from "../utils";

export default class extends Command {
  name = "exile";
  description = "!exile. Remove a lieutenant EX)!exile @User";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);
    const mentionedMember = msg.mentions.members?.first();

    if (player.role != "general") {
      throw new Error("Only generals can exile knights");
    }
    if (!args[0] || !mentionedMember) {
      throw new Error("Please mention a player");
    }

    let role;

    if (getCastleFromGeneral(player)?.name.toLowerCase() === "south") {
      role = await msg.guild?.roles.fetch(
        process.env.SOUTH_KNIGHT_ROLE_ID || ""
      );
    } else {
      role = await msg.guild?.roles.fetch(
        process.env.NORTH_KNIGHT_ROLE_ID || ""
      );
    }

    if (role && mentionedMember.roles.cache.has(role.id)) {
      mentionedMember.roles.remove(role);
      msg.reply(`${mentionedMember} is now exiled and a knight no longer!`);
    } else if (role) {
      throw new Error("Player is not a knight.");
    }

  }
}