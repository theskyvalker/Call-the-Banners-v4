import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { botCommandChannelFilter } from "../utils";

export default class extends Command {
  name = "gloryseeker";
  description =
    "!gloryseeker. Toggle getting notified for duel anyone";

  async exec(message: Message) {
    botCommandChannelFilter(message.channel.id);

    const role = await message.guild?.roles.fetch(
      process.env.GLORY_SEEKER_ROLE_ID || ""
    );

    if (role && message.member?.roles.cache.has(role.id)) {
      message.member?.roles.remove(role);
      message.reply('Removed Glory Seeker role. You will not be notified about duels open to anyone!');
    } else if (role) {
      message.member?.roles.add(role);
      message.reply('Added Glory Seeker role. You will now be notified about duels open to anyone!');
    }
  }
}