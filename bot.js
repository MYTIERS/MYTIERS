const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ضع معرّف (ID) روم النتائج هنا
const RESULTS_CHANNEL_ID = '1554252285842817174'; 

const registeredUsers = new Map();

client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول باسم ${client.user.tag}!`);

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
                    .setDescription('نسخة ماين كرافت (جافا، كراك، بيدروك)')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Java Premium (الجافا الأصلية)', value: 'JAVA' },
                        { name: 'Cracked (المكركة)', value: 'CRACKED' },
                        { name: 'Bedrock (البيدروك)', value: 'BEDROCK' }
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
                    ))
            .addAttachmentOption(option =>
                option.setName('skin_file')
                    .setDescription('ملف صورة السكن PNG (مخصص للكراك والبيدروك)')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('تعيين تير لاعب في نمط لعب معين (للمختبرين فقط)')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .addUserOption(option =>
                option.setName('player')
                    .setDescription('اللاعب المراد تقييمه')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('gamemode')
                    .setDescription('نمط اللعب')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Sword 🗡️', value: 'SWORD' },
                        { name: 'Vanilla 🔮', value: 'VANILLA' },
                        { name: 'Pot 🧪', value: 'POT' },
                        { name: 'UHC 💖', value: 'UHC' },
                        { name: 'NethOP 🛡️', value: 'NETHOP' },
                        { name: 'SMP 🟢', value: 'SMP' },
                        { name: 'Axe 🪓', value: 'AXE' },
                        { name: 'Mace 🔨', value: 'MACE' },
                        { name: 'Spearmace 🔱', value: 'SPEARMACE' }
                    ))
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('الرانك من الأقوى (HT1) إلى الأضعف (LT5)')
                    .setRequired(true)
                    .addChoices(
                        { name: 'High Tier 1 (HT1) 🔥 [الأقوى]', value: 'HT1' },
                        { name: 'Low Tier 1 (LT1)', value: 'LT1' },
                        { name: 'High Tier 2 (HT2)', value: 'HT2' },
                        { name: 'Low Tier 2 (LT2)', value: 'LT2' },
                        { name: 'High Tier 3 (HT3)', value: 'HT3' },
                        { name: 'Low Tier 3 (LT3)', value: 'LT3' },
                        { name: 'High Tier 4 (HT4)', value: 'HT4' },
                        { name: 'Low Tier 4 (LT4)', value: 'LT4' },
                        { name: 'High Tier 5 (HT5)', value: 'HT5' },
                        { name: 'Low Tier 5 (LT5) [الأضعف]', value: 'LT5' }
                    )),

        new SlashCommandBuilder()
            .setName('unregister')
            .setDescription('حذف حساب ماين كرافت المرتبط بحساب ديسكورد')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('حساب الديسكورد المراد حذف تسجيله')
                    .setRequired(false))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('جاري تحديث الأوامر في ديسكورد...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('تم تحديث الأوامر مع الخيارات الجديدة بنجاح!');
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
                content: '❌ لقد قمت بالتسجيل مسبقاً! لاستبدال البيانات، استخدم أمر `/unregister` أولاً.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');
        const skinAttachment = interaction.options.getAttachment('skin_file');

        if ((edition === 'CRACKED' || edition === 'BEDROCK') && !skinAttachment) {
            return await interaction.reply({
                content: '⚠️ يجب عليك رفع ملف السكن الخاص بك بصيغة (PNG) بما أن نسختك مكركة أو بيدروك!',
                ephemeral: true
            });
        }

        // تحديد رابط السكن وإصلاح المشكلة
        let skinUrl = skinAttachment ? skinAttachment.url : `https://mc-heads.net/avatar/${username}/150`;

        registeredUsers.set(interaction.user.id, { 
            username, 
            edition, 
            region, 
            skinUrl,
            tiers: {}
        });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('💎 RubyTiers - تم التسجيل بنجاح')
            .setDescription('**تم ربط حسابك بنجاح!**')
            .setThumbnail(skinUrl)
            .addFields(
                { name: 'الاسم:', value: `\`${username}\``, inline: false },
                { name: 'النسخة:', value: `\`${edition}\``, inline: false },
                { name: 'المنطقة:', value: `\`${region}\``, inline: false }
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
                content: `❌ هذا اللاعب (${targetUser}) غير مسجل في النظام عبر أمر /register!`, 
                ephemeral: true 
            });
        }

        const previousRank = userData.tiers[gamemode] || 'Unranked';
        userData.tiers[gamemode] = tier;

        await interaction.reply({ content: `✅ تم تعيين التير **${tier}** لللاعب ${targetUser} بنجاح!`, ephemeral: true });

        // إرسال النتيجة تلقائياً لروم النتائج المخصص
        const resultsChannel = interaction.guild.channels.cache.get(RESULTS_CHANNEL_ID);
        if (resultsChannel) {
            const resultEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle(`${userData.username}'s Test Results 🏆`)
                .setThumbnail(userData.skinUrl)
                .addFields(
                    { name: 'Tester:', value: `${interaction.user}`, inline: false },
                    { name: 'Region:', value: `${userData.region}`, inline: false },
                    { name: 'Username:', value: `${userData.username}`, inline: false },
                    { name: 'Previous Rank:', value: `${previousRank}`, inline: false },
                    { name: 'Rank Earned:', value: `**${tier} (${gamemode})**`, inline: false }
                )
                .setFooter({ text: 'RubyTiers Official Results' })
                .setTimestamp();

            await resultsChannel.send({ embeds: [resultEmbed] });
        }
    }

    else if (commandName === 'unregister') {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (!registeredUsers.has(targetUser.id)) {
            return await interaction.reply({ content: `❌ هذا الحساب غير مسجل بالأساس!`, ephemeral: true });
        }

        registeredUsers.delete(targetUser.id);
        await interaction.reply({ content: `🗑 تم إلغاء ربط الحساب بنجاح.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
