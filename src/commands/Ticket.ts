import { Command } from "@jiman24/commandment";
import { bold } from "@jiman24/discordjs-utils";
import { Message } from "discord.js";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";

export default class extends Command {
  name = "ticket";
  description = "!ticket show all available tickets you own. EX)!ticket";

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);
    const tickets = player.tickets.map((x, i) => `${i + 1}. #${x.id}`);

    if (!tickets || tickets.length == 0) {
      msg.channel.send(`You have ${bold(0)} raffle tickets`);
    } else if (tickets.length > 1) {
      msg.channel.send(`You have ${bold(tickets.length)} raffle tickets`);
    } else if (tickets.length == 1) {
      msg.channel.send(`You have ${bold(1)} raffle ticket`);
    }
  }
}
