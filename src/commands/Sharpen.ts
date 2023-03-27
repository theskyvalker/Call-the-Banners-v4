import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, checkDoubling } from "../utils";

export default class extends Command {
  name = "sharpen";
  description = "!sharpen sharpen your attack. EX)!sharpen";

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);
    let amount = 50 - checkDoubling(player.nftBonuses.bonusDoubleChance, player.nftBonuses.coinSharpenCostReduction); // 50 is the default sharpen cost

    // Filter player with sharpen status
    const sharpenHistory = client.sharpenHistory.getPlayerSharpen(player.id);

    //Determine if player can receive sharpen status
    if (sharpenHistory.length > 0) {
      throw new Error("already sharpened before");
    }

    /**
     * Check player coin balance
     */
    if (player.coins < amount + player.tempBuffs['sharpen cost']) {
      throw new Error("insufficient amount");
    }

    amount = player.checkTempBuff("sharpen cost", amount);

    //Input data into sharpenHistory and deduct coins from player
    client.sharpenHistory.addSharpen({
      playerID: player.id,
      date: new Date(),
      amountSpent: amount,
      used: false,
    });

    player.coins -= amount;

    client.sharpenHistory.save();
    player.save();

    msg.channel.send(`${player.name} spent ${amount} coins and received sharpen effect!`);
  }
}
