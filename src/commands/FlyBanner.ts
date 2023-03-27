import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { flyBannerForPlayer, getBannerInfo } from "../structure/Banner";
import { Player } from "../structure/Player";
import { botCommandChannelFilter } from "../utils";

export default class Help extends Command {
  name = "flybanner";
  description = "!flybanner Choose a banner from your holdings to represent you in the hall of fame (or infamy). EX)!flybanner <id>";

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    let player = Player.fromID(msg.author.id);

    if (!player) {
      throw new Error("player not found");
    }

    const bannerID = args[0];
    let bannerIDnum = 0;

    if (!bannerID) {
      throw new Error("you need to specify a banner ID");
    }
    try {
      bannerIDnum = parseInt(args[0]);
    } catch {
      throw new Error("provided banner ID is not a valid number")
    }

    try {
      player = await flyBannerForPlayer(bannerIDnum, player);
      const bannerEmbedData = await getBannerInfo(bannerIDnum);

      player.save();

      let bannerStats = new MessageEmbed()
        .setColor(bannerEmbedData[0].color)
        .setTitle(`Now flying Banner #${bannerID}`)
        .setImage(
          bannerEmbedData[0].imageURL
        );

      msg.channel.send({ embeds: [bannerStats] })
      player.setCooldown("banner");

    } catch (error: any) {
      throw new Error(error.toString());
    }
  }
}