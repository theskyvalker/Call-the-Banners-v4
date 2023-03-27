import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { client } from "../index";
import { botCommandChannelFilter } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";

const getHelpMessageEmbedTemplate = () =>
  new MessageEmbed()
    .setColor("RANDOM");

const BASIC = [
  'attack',
  'bal',
  'callbanner',
  'enroll',
  'hp',
  'loot',
  'profile',
  'sharpen',
  'shop',
  'showholdings'
];

const INTERMEDIATE = [
  'aim',
  'duel',
  'glory',
  'parry',
  'pay',
  'trebuchet'
];

const ADVANCED = [
  'arrowslits',
  'bountyhunter',
  'fullleaderboard',
  'flybanner',
  'gloryseeker',
  'honor',
  'merit',
  'rank',
  'showbannerinfo',
  'stats'
];

export default class Help extends Command {
  name = "help";
  aliases = ["h"];
  description = "show all commands and it's description";

  async exec(msg: Message) {
    botCommandChannelFilter(msg.channel.id);
    let commands = client.commandManager.commands.values();

    let helpText = "";
    const done = new Set<string>();

    for (const command of commands) {
      if (command.disable || command.permissions.includes("ADMINISTRATOR"))
        continue;

      if (done.has(command.name)) {
        continue;
      } else if (!BASIC.includes(command.name.toLowerCase())) {
        continue;
      }

      helpText += `\n**${command.name}**: \`${command.description?.split(".")[1] || "none"}\``;
      done.add(command.name);
    }

    const helpChannelId = await client.channels.fetch(process.env.HELP_CHANNEL_ID || "1069309465725247551");

    const pagesData: MessageEmbed[] = [];

    pagesData.push(
      getHelpMessageEmbedTemplate()
        .setTitle("Help: Basic")
        .setDescription(helpText)
    );

    helpText = "";
    commands = client.commandManager.commands.values();

    for (const command of commands) {

      if (command.disable || command.permissions.includes("ADMINISTRATOR"))
        continue;

      if (done.has(command.name)) {
        continue;
      } else if (!INTERMEDIATE.includes(command.name.toLowerCase())) {
        continue;
      }

      helpText += `\n**${command.name}**: \`${command.description?.split(".")[1] || "none"}\``;
      done.add(command.name);
    }

    pagesData.push(
      getHelpMessageEmbedTemplate()
        .setTitle("Help: Intermediate")
        .setDescription(helpText)
    );

    helpText = "";
    commands = client.commandManager.commands.values();

    for (const command of commands) {

      if (command.disable || command.permissions.includes("ADMINISTRATOR"))
        continue;

      if (done.has(command.name)) {
        continue;
      } else if (BASIC.includes(command.name.toLowerCase()) || INTERMEDIATE.includes(command.name.toLowerCase())) {
        continue;
      }

      helpText += `\n**${command.name}**: \`${command.description?.split(".")[1] || "none"}\``;
      done.add(command.name);
    }

    pagesData.push(
      getHelpMessageEmbedTemplate()
        .setTitle("Help: Advanced")
        .setDescription(helpText)
    );

    paginationEmbed(msg, pagesData);

    msg.channel.send({ content: `Please refer to ${helpChannelId} for detailed help` });
  }
}