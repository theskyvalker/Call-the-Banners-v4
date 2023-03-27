import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, getCastleFromGeneral } from "../utils";

export default class extends Command {
  name = "discharge";
  description = "!discharge. Discharge a player from your camp EX)!discharge @User";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);
    const mentionedMember = msg.mentions.members?.first();

    const northKnightRole = await msg.guild?.roles.fetch(
      process.env.NORTH_KNIGHT_ROLE_ID || ""
    );

    const southKnightRole = await msg.guild?.roles.fetch(
      process.env.SOUTH_KNIGHT_ROLE_ID || ""
    );

    if (!southKnightRole || !northKnightRole) throw new Error("Knight roles not configured correctly.");

    if (player.role != "general" && !msg.member?.roles.cache.has(northKnightRole.id) && !msg.member?.roles.cache.has(southKnightRole.id)) {
      throw new Error("Only generals or knights can discharge players");
    }
    if (!args[0] || !mentionedMember) {
      throw new Error("Please mention a member");
    }

    let role;

    if (getCastleFromGeneral(player)?.name.toLowerCase() === "south" || msg.member?.roles.cache.has(southKnightRole.id)) {
      role = await msg.guild?.roles.fetch(
        process.env.SOUTHLANDER_ROLE_ID || ""
      );
    } else {
      role = await msg.guild?.roles.fetch(
        process.env.NORTHLANDER_ROLE_ID || ""
      );
    }

    if (role && mentionedMember.roles.cache.has(role.id)) {
      mentionedMember.roles.remove(role);
      msg.reply(`${mentionedMember} has been dishonorably discharged!`);
    } else if (role) {
      throw new Error("Player is not conscripted.");
    }

  }
}