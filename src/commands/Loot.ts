import { Command } from "@jiman24/commandment";
import { bold, validateAmount } from "@jiman24/discordjs-utils";
import { Message } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";
import { LootHistory } from "../structure/LootHistory";

export default class extends Command {
  name = "loot";
  description = "!loot <time duration> EX)!loot 1 to loot for 1 hour or !loot 4 to loot for 4 hours. EX) !loot <duration in hours (min 1 max 4)>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    // uncomment to only allow looting during active battle

    /*if (client.battleStage.stage !== "start") {
      throw new Error("you can only loot when battle starts");
    }*/

    const timeDurationStr = args[0];

    if (!timeDurationStr) {
      throw new Error("you need to specify a time duration to loot");
    }

    const timeDuration = parseInt(timeDurationStr);

    if (isNaN(timeDuration) || timeDuration < LootHistory.MIN_DURATION || timeDuration > LootHistory.MAX_DURATION) {
      throw new Error(`loot duration must be more than ${LootHistory.MIN_DURATION} and less than ${LootHistory.MAX_DURATION} hours`);
    }

    const player = Player.fromUser(msg.author);
    const cooldown = player.isOnCooldown("loot");

    if (cooldown.status) {
      throw new Error(`Please wait for ${bold(cooldown.timeLeft)}`);
    }

    player.loot(msg, timeDuration);
    msg.channel.send(`${msg.author}: You set out looting for ${timeDuration} hour(s). All the best!`);

    client.lootHistory.addLoot({
      playerID: player.id,
      date: new Date(),
      duration: timeDuration,
      outcome: null
    });
    client.lootHistory.save();
    //console.log(client.lootHistory);

    player.lastLoot = new Date();
    player.lastLootDuration = timeDuration;
    player.setCooldown("loot");
    player.save();

  }
}