import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, getCastleFromGeneral } from "../utils";
import { Castle } from "../structure/Castle";
import { DateTime, Duration } from "luxon";
import { RALLY_AMOUNT } from "../structure/RallyHistory";

export default class extends Command {
  name = "rally";
  description = "!rally automatically sharpen the swords targeting the enemy castle for a set amount of time" +
    "by spending 75 coins per attacker. Can stack with a player's own sharpen effect. " +
    "Optionally, specify a maximum budget to limit coin spending beyond the specified amount. EX) !rally <duration> [budget]";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);

    if (client.battleStage.stage != "start") {
      throw new Error("you can only rally swords when the battle is ongoing");
    }

    //check if player is a general or not
    if (player.role != "general") {
      throw new Error("only generals can start rallies");
    }

    const timeduration = parseInt(args[0]);

    if (!args[0]) {
      throw new Error(`you need to give a duration for the rally validity`);
    } else if (Number.isNaN(timeduration) || timeduration < 1 || timeduration > 1440) {
      throw new Error(`please give a valid integer time duration between 1 to 1440 minutes (24 hours)`);
    }

    let budget = -1;

    if (args[1]) {
      budget = parseInt(args[1]);
      if (Number.isNaN(budget) || budget < RALLY_AMOUNT || budget > player.coins) {
        throw new Error(`please give a valid integer budget greater than ${RALLY_AMOUNT} and less than your total available coins`)
      }
    }

    console.log(`${player.id} started a rally`);

    const generalCastle = getCastleFromGeneral(player);
    if (generalCastle) {
      const enemyCastle = Castle.getEnemy(generalCastle.name);
      client.rallyHistory.addRally({
        generalID: player.id,
        time_start: DateTime.now(),
        time_end: DateTime.now().plus(Duration.fromMillis(timeduration * 60000)),
        castle: enemyCastle.name,
        budget: budget,
        coinSpent: 0
      });

      client.rallyHistory.save();
      msg.channel.send(
        `${msg.author} has rallied all swords to attack castle ${enemyCastle.name} in the next ${timeduration} minutes. <@&${process.env.BOUNTY_HUNTER_ROLE_ID || ""}>`
      );
    } else {
      throw Error(`error getting enemy castle details for the general`);
    }

  }
}
