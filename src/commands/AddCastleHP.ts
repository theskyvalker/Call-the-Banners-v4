import { Command } from "@jiman24/commandment";
import { Message, PermissionResolvable } from "discord.js";
import { botCommandChannelFilter } from "../utils";
import { Castle } from "../structure/Castle";
import { client } from "..";

export default class extends Command {
  name = "addcastlehp";
  description = "!addcastlehp. !addcastlehp <CastleHP>";
  permissions: PermissionResolvable[] = ["ADMINISTRATOR"];

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    if (client.battleStage.stage !== "start") {
      throw new Error(
        "you can only do this during active battle"
      );
    }

    const castleHPChange = parseInt(args[0]);

    if (isNaN(castleHPChange)) {
      throw new Error(`you need to give amount of hp`);
    }

    const castleA = Castle.fromName(Castle.castleNameConverter("north"));
    const castleB = Castle.fromName(Castle.castleNameConverter("south"));

    msg.channel.send(`Current HP: ${castleA.name} : ${castleA.hp} out of ${castleA.initialhp.toFixed(0)}\t${castleB.name} : ${castleB.hp} out of ${castleB.initialhp.toFixed(0)}`);

    let percentage = (castleA.hp / castleA.initialhp) * 100;

    castleA.hp += castleHPChange;
    castleA.initialhp = 100 / percentage * castleA.hp;
    castleA.maxhp = castleA.initialhp * 1.5;
    castleA.save();

    percentage = (castleB.hp / castleB.initialhp) * 100;

    castleB.hp += castleHPChange;
    castleB.initialhp = 100 / percentage * castleB.hp;
    castleB.maxhp += castleB.initialhp * 1.5;
    castleB.save();

    msg.channel.send(`New HP: ${castleA.name} : ${castleA.hp} out of ${castleA.initialhp.toFixed(0)}\t${castleB.name} : ${castleB.hp} out of ${castleB.initialhp.toFixed(0)}`);
  }
}