const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const qrcode = require('qrcode-terminal')

let games = {}
let users = {}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['Kero Bot', 'Chrome', '1.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect, qr } = u
        if (qr) {
            console.log('اعمل سكان للـ QR ده بواتساب:')
            qrcode.generate(qr, { small: true })
        }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut) {
                startBot()
            }
        } else if (connection === 'open') {
            console.log('✅ Kero Bot اشتغل!')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        if (!text.startsWith('.')) return
        const args = text.slice(1).split(' ')
        const cmd = args[0].toLowerCase()
        const sender = msg.key.participant || from

        if (!users[sender]) users[sender] = { money: 1000, car: null, married: null }

        // المنيو
        if (cmd === 'منيو' || cmd === 'اوامر') {
            await sock.sendMessage(from, { text: `🤖 *منيو Kero Bot - من ابداع يوسف* 🙏

🎮 *العاب:*
.اكس او @منشن - تحدي اكس او
.حجرة / ورقة / مقص
.حظ - لعبة الحظ

💰 *اقتصاد:*
.فلوسي - رصيدك
.يومية - 500 كل يوم
.عربية - اشتري عربية
.عربياتي

❤️ *تفاعل:*
.زواج @منشن
.طلاق

👑 *ادارة (للمشرفين):*
.طرد @منشن
.كتم @منشن
.ترقية @منشن
.تحذير @منشن

من ابداع يوسف 🙏` })
        }

        // فلوسي
        if (cmd === 'فلوسي') {
            await sock.sendMessage(from, { text: `💰 معاك ${users[sender].money} جنيه` })
        }
        if (cmd === 'يومية') {
            users[sender].money += 500
            await sock.sendMessage(from, { text: `✅ خدت 500 جنيه يومية! بقي معاك ${users[sender].money}` })
        }

        // حجرة ورقة مقص
        if (['حجرة','ورقة','مقص'].includes(cmd)) {
            let choices = ['حجرة','ورقة','مقص']
            let bot = choices[Math.floor(Math.random()*3)]
            let res = 'تعادل!'
            if ((cmd==='حجرة' && bot==='مقص') || (cmd==='ورقة' && bot==='حجرة') || (cmd==='مقص' && bot==='ورقة')) { res='كسبت! 🎉'; users[sender].money+=100 }
            else if (cmd!==bot) { res='خسرت 😢' }
            await sock.sendMessage(from, { text: `انت: ${cmd}\nالبوت: ${bot}\n${res}` })
        }

        // حظ
        if (cmd === 'حظ') {
            let win = Math.random() > 0.5
            if(win){ users[sender].money+=200; await sock.sendMessage(from,{text:'🎉 كسبت 200 جنيه!'}) }
            else { await sock.sendMessage(from,{text:'😢 خسرت حاول تاني'}) }
        }

        // طرد - لازم ادمن
        if (cmd === 'طرد') {
            let mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (mentioned && mentioned[0]) {
                await sock.groupParticipantsUpdate(from, mentioned, 'remove')
                await sock.sendMessage(from, { text: `تم طرد @${mentioned[0].split('@')[0]}`, mentions: mentioned })
            }
        }
        if (cmd === 'ترقية') {
            let mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (mentioned && mentioned[0]) {
                await sock.groupParticipantsUpdate(from, mentioned, 'promote')
                await sock.sendMessage(from, { text: `تم ترقية @${mentioned[0].split('@')[0]} لادمن 👑`, mentions: mentioned })
            }
        }
    })
}
startBot()
