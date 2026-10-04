const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// حفظ بيانات المسجلين مع تفاصيل النقاط والرتب والأطوار
const registeredUsers = new Map();

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول باسم ${client.user.tag}!`);

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
            .setName('profile')
            .setDescription('عرض ملفك الشخصي أو ملف لاعب آخر')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب المراد عرض ملفه')
                    .setRequired(false)),

        new SlashCommandBuilder()
            .setName('queuepanel')
            .setDescription('إرسال لوحة الانتظار في هذه القناة'),

        new SlashCommandBuilder()
            .setName('setrank')
            .setDescription('تعيين تير لاعب في نمط لعب معين')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('اللاعب')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('gamemode')
                    .setDescription('نمط اللعب (Vanilla, UHC, Sword, etc.)')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('tier')
                    .setDescription('التير (HT1, LT1, Unranked, etc.)')
                    .setRequired(true)),

        new SlashCommandBuilder()
            .setName('syncroles')
            .setDescription('مزامنة رتب ديسكورد للـ HT / LT لجميع المسجلين'),

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
        console.log('تم تحديث الأوامر بنجاح!');
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
                content: '❌ لقد قمت بالتسجيل مسبقاً بهذا الحساب! إذا أردت إعادة التسجيل، استخدم أمر `/unregister` أولاً.',
                ephemeral: true
            });
        }

        const username = interaction.options.getString('username');
        const edition = interaction.options.getString('edition');
        const region = interaction.options.getString('region');

        let skinUrl = `https://mc-heads.net/avatar/${username}/150`;

        // تخزين البيانات مع القيم الافتراضية للنقاط والأطوار مطابقة للصورة
        registeredUsers.set(interaction.user.id, { 
            username, 
            edition, 
            region, 
            skinUrl,
            points: 0,
            rank: 'Rookie',
            tiers: {
                'Vanilla': 'Unranked',
                'UHC': 'Unranked',
                'Pot': 'Unranked',
                'NethOP': 'Unranked',
                'SMP': 'Unranked',
                'Sword': 'Unranked',
                'Axe': 'Unranked',
                'Mace': 'Unranked',
                'SpearMace': 'Unranked'
            }
        });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('💎 RubyTiers | نظام التسجيل')
            .setDescription(edition === 'CRACKED' 
                ? '**تم تسجيل حسابك بنجاح!**\n\n📸 **بما أن حسابك (كراك)، يرجى إرسال صورة السكن (PNG) هنا في الشات الآن كرسالة عادية لتحديثه (أمامك 60 ثانية).**'
                : '**تم ربط حسابك بنجاح!**')
            .setThumbnail(skinUrl)
            .addFields(
                { name: '👤 الاسم', value: `\`${username}\``, inline: true },
                { name: '🎮 النسخة', value: `\`${edition}\``, inline: true },
                { name: '🌍 المنطقة', value: `\`${region}\``, inline: true }
            )
            .setFooter({ text: 'RubyTiers Competitive System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        if (edition === 'CRACKED') {
            const filter = m => m.author.id === interaction.user.id && m.attachments.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async m => {
                const attachment = m.attachments.first();
                if (attachment) {
                    const userData = registeredUsers.get(interaction.user.id);
                    if (userData) {
                        userData.skinUrl = attachment.url;
                        registeredUsers.set(interaction.user.id, userData);

                        try { await m.delete(); } catch (e) {}

                        await interaction.followUp({
                            content: `✅ ${interaction.user} **تم استلام وتحديث سكنك الكراك بنجاح!**`,
                            ephemeral: true
                        });
                    }
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    interaction.followUp({
                        content: `⏳ انتهى وقت إرسال السكن لحسابك (${username}). تم اعتماد السكن الافتراضي. يمكنك إعادة التسجيل متى شئت.`,
                        ephemeral: true
                    }).catch(() => {});
                }
            });
        }
    } 
    else if (commandName === 'profile') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = registeredUsers.get(targetUser.id);

        if (!userData) {
            return await interaction.reply({ 
                content: `❌ المستخدم ${targetUser} غير مسجل في النظام بعد!`, 
                ephemeral: true 
            });
        }

        // تنسيق قائمة الأطوار بنفس شكل الصورة المطلوبة
        const tiersText = Object.entries(userData.tiers)
            .map(([mode, tier]) => `• **${mode}:** \`${tier}\``)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(`⚔️ RubyTiers Profile - ${userData.username}`)
            .setThumbnail(userData.skinUrl)
            .addFields(
                { name: '🌍 المنطقة', value: `\`${userData.region}\``, inline: true },
                { name: '🏆 النقاط', value: `\`${userData.points} pts\``, inline: true },
                { name: '⭐ اللقب', value: `\`${userData.rank}\``, inline: false },
                { name: '📊 تصنيفات الأطوار (Tiers)', value: tiersText, inline: false }
            )
            .setFooter({ text: 'RubyTiers Competitive System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'queuepanel') {
        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('⚔️ RubyTiers | قائمة الانتظار (Queue)')
            .setDescription('اضغط للانضمام إلى طابور المباريات التنافسية.');
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'setrank') {
        const targetUser = interaction.options.getUser('user');
        const gamemode = interaction.options.getString('gamemode');
        const tier = interaction.options.getString('tier');

        const userData = registeredUsers.get(targetUser.id);
        if (userData && userData.tiers[gamemode] !== undefined) {
            userData.tiers[gamemode] = tier;
            userData.points += 15; // زيادة نقاط تجريبية عند تعيين التير
        }

        await interaction.reply({ content: `✅ تم تعيين التير **${tier}** لللاعب ${targetUser} في نمط **${gamemode}** بنجاح!`, ephemeral: true });
    }
    else if (commandName === 'syncroles') {
        await interaction.reply({ content: '🔄 جاري مزامنة رتب الديسكورد لجميع اللاعبين المسجلين...', ephemeral: true });
    }
    else if (commandName === 'unregister') {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (!registeredUsers.has(targetUser.id)) {
            return await interaction.reply({ content: `❌ حساب الديسكورد ${targetUser} غير مسجل أصلاً في النظام!`, ephemeral: true });
        }

        const userData = registeredUsers.get(targetUser.id);
        registeredUsers.delete(targetUser.id);

        await interaction.reply({ content: `🗑 تم بنجاح حذف وإلغاء ربط حساب ماين كرافت (\`${userData.username}\`) المرتبط بحساب الديسكورد ${targetUser}. يمكنك الآن التسجيل من جديد!`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
