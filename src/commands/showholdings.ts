import { Command } from "@jiman24/commandment";
import { Message, MessageAttachment, MessageEmbed } from "discord.js";
import { client } from "..";
import { botCommandChannelFilter } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";
import { getBannerCollection, getBannerInfo } from "../structure/Banner";

export default class extends Command {
  name = "showholdings";
  description = "!showholdings browse your banner collection with their stats. EX)!showholdings";

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);

    const address = client.ethAddress.findAddress(msg.author.id);

    if (!address) {
      throw new Error("you need to be enlisted to view your holdings");
    }

    const reply = await msg.reply("Fetching holdings, please wait...");

    try {

      let pagesData = [];
      let banners = await getBannerCollection(address);

      for (let banner of banners) {
        let bannerEmbedData = await getBannerInfo(banner);

        let bannerStats = new MessageEmbed()
          .setColor(bannerEmbedData[0].color)
          .setTitle(`Banner #${banner}`)
          .setImage(
            bannerEmbedData[0].imageURL
          )
          .setFields(bannerEmbedData[0].stats);

        pagesData.push(bannerStats);
      }

      paginationEmbed(msg, pagesData);

      await reply.delete();

    } catch (error: any) {
      throw new Error(error.toString());
    }
  }
}