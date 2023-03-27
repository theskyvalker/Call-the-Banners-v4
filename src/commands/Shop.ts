import { Command } from "@jiman24/commandment";
import { bold } from "@jiman24/discordjs-utils";
import { Message, MessageEmbed } from "discord.js";
import { Player } from "../structure/Player";
import { Ticket } from "../structure/Ticket";
import { botCommandChannelFilter } from "../utils";

export default class extends Command {
  name = "shop";
  description = "!shop buy items with your coins. EX)!shop buy 1";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const arg1 = args[0];
    const arg2 = args[1];

    console.log(arg1);
    console.log(arg2);

    if (!arg1) {
      const embed = new MessageEmbed()
        .setColor("RANDOM")
        .setTitle("Shop")
        .setDescription("1. Ticket 100 coins")
        .addFields({name: "---", value:"To buy an item use command `!shop buy 1`"});

      msg.channel.send({ embeds: [embed] });

      return;
    }

    if (arg1 !== "buy") {
      throw new Error("invalid action");
    }

    const player = Player.fromUser(msg.author);
    let amount;
    (arg2) ? amount = parseInt(arg2) : amount = 1;

    if (arg2.toLowerCase() != "max" && isNaN(amount)) {
        throw new Error("quantity of tickets to buy must be a number or MAX");
    } else if (amount < 1) {
      throw new Error("amount cannot be less than one");
    }

    if (arg2.toLowerCase() == "max") {
      amount = Math.floor(player.coins / Ticket.price);
      if (amount == 0) {
        throw new Error(`you need at least ${Ticket.price} coins to purchase a ticket`)
      }
    }

    const cost = Ticket.price * amount;
    if (player.coins < cost) {
      throw new Error("insufficient balance");
    }
    
    msg.channel.send(`Purchasing ${amount} tickets using ${cost} coins`);

    player.coins -= cost;

    for (let i = 0; i < amount; i++) {
      const ticket = new Ticket();
      player.tickets.push(ticket);
    }

    msg.channel.send(
      `Successfully purchased ${bold(amount)} raffle tickets.`
    );

    player.save();
  }
}
