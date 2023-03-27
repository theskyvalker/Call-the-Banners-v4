import { Command } from "@jiman24/commandment";
import { bold, random } from "@jiman24/discordjs-utils";
import { Message, PermissionResolvable, User } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { Ticket } from "../structure/Ticket";
import { botCommandChannelFilter } from "../utils";

const EXCLUDE_IDS = [
  "A LIST OF DISCORD USER IDS TO EXCLUDE FROM THE RAFFLE"
];

export default class extends Command {
  name = "raffle";
  description = "!raffle selects a winner and then destroys all tickets. EX)!raffle";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    if (Ticket.all.length === 0) {
      throw new Error("no one owns a raffle ticket");
    }

    let winnerTicketID: string;
    let winnerData;
    let winner: Player;

    do {
      winnerTicketID = random.pick(Ticket.all);
      winnerData = client.players.find((player) =>
        (player.tickets || []).includes(winnerTicketID)
      );
      winner = Player.fromID(winnerData.id);
      console.log(`Winner of the raffle is: ${winner.name}`);
    } while (!winner || EXCLUDE_IDS.includes(winner.id.toString()));

    msg.channel.send(`The winning ticket is **#${winnerTicketID}**`);

    if (winner) {
      msg.channel.send(`${bold(winner.name)} holds the winning ticket!`);
    }

    // deletes all raffle tickets
    client.players.forEach((player) => {
      client.players.set(player.id, [], "tickets");
    });
  }
}