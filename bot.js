const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول باسم ${client.user.tag}!`);

    // تعريف الأوامر (Slash Commands)
    const commands = [
        new SlashCommandBuilder()
            .setName('register')
            .setDescription('تسجيل حساب ماين كرافت الخاص بك')
            .addStringOption(option =>
                option.setName('username')
                    .setDescription('اسم حسابك في ماين كرافت')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('edition')
                    .setDescription('نسخة ماين كرافت')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Java', value: 'JAVA' },
                        { name: 'Cracked', value: 'CRACKED' },
                        { name: 'Bedrock', value: 'BEDROCK' }
                    ))
            .addStringOption(option =>
                option.setName('region')
                    .setDescription('منطقتك')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Middle East (ME)', value: 'ME' },
                        { name: 'Europe (EU)', value: 'EU' },
                        { name: 'North America (NA)', value: 'NA' },
                        { name: 'Asia (AS)', value: 'AS' }
                    )),
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('جاري تحديث الأوامر في ديسكورد...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('تم تحديث الأوامر بنجاح!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'register') {
        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');

        // جلب صورة وجه السكن أوتوماتيكياً عبر اسم اللاعب
        const skinAvatar = `https://minotar.net/avatar/${username}/150.png`;

        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('💎 MYTIERS | نظام التسجيل')
            .setDescription('**تم ربط حسابك بنجاح!**')
            .setThumbnail(skinAvatar) // عرض سكن اللاعب بشكل أسطوري
            .addFields(
                { name: '👤 الاسم', value: `\`${username}\``, inline: true },
                { name: '🎮 النسخة', value: `\`${edition}\``, inline: true },
                { name: '🌍 المنطقة', value: `\`${region}\``, inline: true }
            )
            .setFooter({ text: 'MYTIERS Official Network' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
