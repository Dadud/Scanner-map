import { SlashCommandBuilder, CommandInteraction } from 'discord.js';

export const talkgroupCommand = {
  data: new SlashCommandBuilder()
    .setName('talkgroup')
    .setDescription('Get information about a talkgroup')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('Talkgroup ID')
        .setRequired(true)
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Talkgroup info would be displayed here.');
  }
};

export const alertCommand = {
  data: new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Manage keyword alerts')
    .addSubcommand(subcommand =>
      subcommand.setName('add')
        .setDescription('Add a keyword alert')
        .addStringOption(option =>
          option.setName('keyword')
            .setDescription('Keyword to alert on')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('remove')
        .setDescription('Remove a keyword alert')
        .addStringOption(option =>
          option.setName('keyword')
            .setDescription('Keyword to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand.setName('list')
        .setDescription('List all keyword alerts')
    ),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Alert management would be handled here.');
  }
};

export const summaryCommand = {
  data: new SlashCommandBuilder()
    .setName('summary')
    .setDescription('Get AI summary of recent calls'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply('Summary of recent calls would be displayed here.');
  }
};
