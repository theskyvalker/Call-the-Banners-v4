import { Command } from "@jiman24/commandment";
import { Message, PermissionResolvable } from "discord.js";
import { botCommandChannelFilter } from "../utils";
import { Player } from "../structure/Player";

export default class extends Command {
  name = "resetcooldown";
  description =
    "!resetcooldown Reset a user's cooldown (for testing purposes only). !resetcooldown @user <attack loot/parry/big/banner>";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const mentionedMember = msg.mentions.members?.first();

    if (!mentionedMember) {
      throw new Error("you need to mention a user");
    }

    const player = Player.fromUser(mentionedMember.user);

    if (args[1] === "attack" || args[1] === "loot" || args[1] === "parry" || args[1] === "big" || args[1] === "banner") {
      player.resetCooldown(args[1]);
      player.save();
    } else {
      throw new Error(`please give a valid cooldown category`)
    }

    msg.channel.send(`Successfully reset ${args[1]} cooldowns for ${player.name}`);
  }
}