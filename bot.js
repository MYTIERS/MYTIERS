const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ضع هنا ID روم النتائج الخاصة بك (📋╎tier・results)
const RESULTS_CHANNEL_ID = '1554252285842817174'; 

const registeredUsers = new Map();

// قائمة الأطوار المتاحة
const GAMEMODES = ['Vanilla', 'UHC', 'Pot', 'NethOP', 'SMP', 'Sword', 'Axe', 'Mace', 'SpearMace'];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('register')
            .setDescription('Register your Minecraft account')
            .addStringOption(option =>
                option.setName('username')
                    .setDescription('Your Minecraft Username')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('edition')
                    .setDescription('Minecraft Edition')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Java Premium', value: 'JAVA' },
                        { name: 'Cracked', value: 'CRACKED' },
                        { name: 'Bedrock', value: 'BEDROCK' }
                    ))
            .addStringOption(option =>
                option.setName('region')
                    .setDescription('Your Region')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Middle East (ME)', value: 'ME' },
                        { name: 'Europe (EU)', value: 'EU' },
                        { name: 'North America (NA)', value: 'NA' },
                        { name: 'Asia (AS)', value: 'AS' }
                    ))
            .addAttachmentOption(option =>
                option.setName('skin_file')
                    .setDescription('Skin PNG file (Optional for Cracked/Bedrock)')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('Set player tier for a gamemode (Testers only)')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .addUserOption(option =>
                option.setName('player')
                    .setDescription('Target player')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('gamemode')
                    .setDescription('Gamemode / Kit')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Sword 🗡️', value: 'Sword' },
                        { name: 'Vanilla 🔮', value: 'Vanilla' },
                        { name: 'Pot 🧪', value: 'Pot' },
                        { name: 'UHC 💖', value: 'UHC' },
                        { name: 'NethOP 🛡️', value: 'NethOP' },
                        { name: 'SMP 🟢', value: 'SMP' },
                        { name: 'Axe 🪓', value: 'Axe' },
                        { name: 'Mace 🔨', value: 'Mace' },
                        { name: 'Spearmace 🔱', value: 'SpearMace' }
                    ))
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('Select Tier Rank')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Unranked (غير مصنف)', value: 'Unranked' },
                        { name: 'High Tier 1 (HT1)', value: 'HT1' },
                        { name: 'Low Tier 1 (LT1)', value: 'LT1' },
                        { name: 'High Tier 2 (HT2)', value: 'HT2' },
                        { name: 'Low Tier 2 (LT2)', value: 'LT2' },
                        { name: 'High Tier 3 (HT3)', value: 'HT3' },
                        { name: 'Low Tier 3 (LT3)', value: 'LT3' },
                        { name: 'High Tier 4 (HT4)', value: 'HT4' },
                        { name: 'Low Tier 4 (LT4)', value: 'LT4' },
                        { name: 'High Tier 5 (HT5)', value: 'HT5' },
                        { name: 'Low Tier 5 (LT5)', value: 'LT5' }
                    )),

        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('View player profile')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Target user')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('unregister')
            .setDescription('Unlink Minecraft account')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Target user')
                    .setRequired(false))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Refreshing application (/) commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'register') {
        if (registeredUsers.has(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ You are already registered! Use `/unregister` first to change your account.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');
        const skinAttachment = interaction.options.getAttachment('skin_file');

        // تحديث رابط الصورة ليكون ثابت ويعمل دائماً
        let skinUrl = skinAttachment ? skinAttachment.url : `https://mc-heads.net/avatar/${username}/100`;

        const initialTiers = {};
        GAMEMODES.forEach(mode => initialTiers[mode] = 'Unranked');

        registeredUsers.set(interaction.user.id, { 
            username, 
            edition, 
            region, 
            skinUrl,
            points: 0,
            title: 'Rookie',
            tiers: initialTiers
        });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('💎 RubyTiers - Registration Successful')
            .setDescription('**Your Minecraft account has been linked successfully!**')
            .setThumbnail(skinUrl)
            .addFields(
                { name: 'Username:', value: `\`${username}\``, inline: false },
                { name: 'Edition:', value: `\`${edition}\``, inline: false },
                { name: 'Region:', value: `\`${region}\``, inline: false }
            )
            .setFooter({ text: 'RubyTiers Official Network' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } 

    else if (commandName === 'setrank') {
        const targetUser = interaction.options.getUser('player');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');

        const userData = registeredUsers.get(targetUser.id);
        
        if (!userData) {
            return await interaction.reply({ 
                content: `❌ This player (${targetUser}) is not registered in the system!`, 
                ephemeral: true 
            });
        }

        const previousRank = userData.tiers[gamemode] || 'Unranked';
        userData.tiers[gamemode] = tier;

        // الرد باللغة الإنجليزية يحدد الكيت والرانك المنسوب
        await interaction.reply({ 
            content: `✅ Successfully set **${tier}** rank for ${targetUser} in **${gamemode}** mode!`, 
            ephemeral: true 
        });

        // إرسال تقرير النتيجة إلى روم النتائج
        const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);
        if (resultsChannel) {
            const rankDisplay = tier === 'Unranked' ? 'Unranked' : `${tier} (${gamemode.toUpperCase()})`;

            const resultEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`${userData.username}'s Test Results 🏆`)
                .setThumbnail(userData.skinUrl)
                .addFields(
                    { name: 'Tester:', value: `${interaction.user}`, inline: false },
                    { name: 'Region:', value: `${userData.region}`, inline: false },
                    { name: 'Username:', value: `${userData.username}`, inline: false },
                    { name: 'Previous Rank:', value: `${previousRank}`, inline: false },
                    { name: 'Rank Earned:', value: `**${rankDisplay}**`, inline: false }
                )
                .setFooter({ text: 'RubyTiers Official Results' })
                .setTimestamp();

            await resultsChannel.send({ embeds: [resultEmbed] });
        }
    }

    else if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = registeredUsers.get(targetUser.id);

        if (!userData) {
            return await interaction.reply({
                content: `❌ User (${targetUser}) is not registered!`,
                ephemeral: true
            });
        }

        let tiersList = '';
        for (const [mode, rank] of Object.entries(userData.tiers)) {
            tiersList += `• **${mode}:** \`${rank}\`\n`;
        }

        const profileEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`⚔️ RubyTiers Profile - ${userData.username}`)
            .setThumbnail(userData.skinUrl)
            .addFields(
                { name: 'المنطقة 🌍', value: `\`${userData.region}\``, inline: false },
                { name: 'النقاط 🏆', value: `\`${userData.points} pts\``, inline: false },
                { name: 'اللقب ⭐️', value: `\`${userData.title}\``, inline: false },
                { name: '📊 تصنيفات الأطوار (Tiers)', value: tiersList, inline: false }
            )
            .setFooter({ text: 'RubyTiers Competitive System' })
            .setTimestamp();

        await interaction.reply({ embeds: [profileEmbed] });
    }

    else if (commandName === 'unregister') {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (!registeredUsers.has(targetUser.id)) {
            return await interaction.reply({ content: `❌ Account is not registered!`, ephemeral: true });
        }

        registeredUsers.delete(targetUser.id);
        await interaction.reply({ content: `🗑 Account unlinked successfully.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
