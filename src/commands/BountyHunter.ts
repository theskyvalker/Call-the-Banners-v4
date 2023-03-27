import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { botCommandChannelFilter } from "../utils";

export default class extends Command {
  name = "bountyhunter";
  description =
    "!bountyhunter. Toggle getting notified for bounties and rallies offered by generals";

  async exec(message: Message) {
    botCommandChannelFilter(message.channel.id);

    const role = await message.guild?.roles.fetch(
      process.env.BOUNTY_HUNTER_ROLE_ID || ""
    );

    if (role && message.member?.roles.cache.has(role.id)) {
      message.member?.roles.remove(role);
      message.reply('Removed Bounty Hunter role. You will not be notified about bounties and rallies!');
    } else if (role) {
      message.member?.roles.add(role);
      message.reply('Added Bounty Hunter role. You will now be notified about bounties and rallies!');
    }
  }
}