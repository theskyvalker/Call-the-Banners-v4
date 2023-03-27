import { Command } from "@jiman24/commandment";
import { Message } from "discord.js";
import { enlistChannelFilter } from "../utils";
import Web3 from "web3";
import { client } from "..";
import { userMention } from "@discordjs/builders";

export default class extends Command {
  name = "enroll";
  description =
    "!enroll add your eth address to join war. EX)!enroll <eth address>";

  async exec(message: Message, args: string[]) {
    enlistChannelFilter(message.channel.id);
    const userAddress = args[0];

    if (!userAddress) {
      throw new Error("Please type !enroll followed by your eth addess. EX)!enroll 0xB938bb1b390accC2DA2A5F699A66974B3c6056BB");
    }
    if (!Web3.utils.isAddress(userAddress)) {
      throw new Error("This is not an eth address!");
    }

    client.ethAddress.addEth({
      name: message.author.username + "#" + message.author.discriminator,
      id: message.author.id,
      address: userAddress,
    });
    client.ethAddress.save();

    message.reply(
      `${userMention(
        message.author.id
      )} Successfully added your eth address, you can join war now!`
    );

    const role = await message.guild?.roles.fetch(
      process.env.ENLISTED_ROLE_ID || ""
    );

    if (role) {
      message.member?.roles.add(role);
    }

    console.log(`Enroll: ${message.author.id} added ${userAddress}`);
  }
}
