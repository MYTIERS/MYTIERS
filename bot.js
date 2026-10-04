require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('register')
            .setDescription('تسجيل حساب ماين كرافت الخاص بك')
            .addStringOption(option => option.setName('username').setDescription('اكتب اسمك في ماين كرافت').setRequired(true))
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

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('وضع رانك للاعب (خاص بالمختبرين)')
            .addUserOption(option => option.setName('player').setDescription('يوزر اللاعب في الديسكورد').setRequired(true))
            .addStringOption(option => 
                option.setName('gamemode')
                    .setDescription('اختر طور اللعب')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Sword', value: 'Sword' },
                        { name: 'Pot', value: 'Pot' },
                        { name: 'Vanilla', value: 'Vanilla' },
                        { name: 'UHC', value: 'UHC' },
                        { name: 'SMP', value: 'SMP' }
                    ))
            .addStringOption(option => option.setName('tier').setDescription('الرانك الذي يستحقه').setRequired(true))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
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

        await interaction.reply({ 
            content: `💎 **تم التسجيل بنجاح**\nتم ربط حسابك بنجاح!\n\n👤 **الاسم:** ${username}\n🎮 **النسخة:** ${edition}\n🌍 **المنطقة:** ${region}`, 
            ephemeral: true 
        });
    }

    if (interaction.commandName === 'setrank') {
        const targetPlayer = interaction.options.getUser('player');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');

        try {
            await axios.post('http://localhost:3000/api/setrank', {
                discordId: targetPlayer.id,
                username: targetPlayer.username,
                gamemode: gamemode,
                tier: tier
            });

            await interaction.reply({ 
                content: `✅ تم تحديث رانك اللاعب **${targetPlayer.username}** في طور **${gamemode}** إلى **${tier}** بنجاح!`,
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: `❌ حدث خطأ أثناء إرسال البيانات.`, ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
