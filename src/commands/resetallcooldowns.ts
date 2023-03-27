import { Command } from "@jiman24/commandment";
import { Message, PermissionResolvable } from "discord.js";
import { botCommandChannelFilter } from "../utils";
import { Player } from "../structure/Player";

export default class extends Command {
  name = "resetallcooldowns";
  description =
    "!resetallcooldowns Reset all cooldowns for all users. !resetcooldowns";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);

    const role = await msg.guild?.roles.fetch(
      process.env.ENLISTED_ROLE_ID || ""
    );

    if (!role?.members || role.members.size < 1) {
      throw ("No one is enrolled");
    }

    for (let member of role?.members) {
      console.log(member[0]);
      const player = Player.fromID(member[0]); // this will also update all functions to newer implementations
      player.resetAllCooldowns(); // change cds and make sure the cooldown format also changes before reset
      player.save();
    }

    msg.channel.send(`Successfully reset all cooldowns for ${role.members.size} enrolled players`);
  }
}