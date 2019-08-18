const createApp = require('ringcentral-chatbot/dist/apps').default
const { Service, Bot } = require('ringcentral-chatbot/dist/models')

let messageBodyId = null
const handle = async event => {
  if (event.type === 'Message4Bot') {
    const { text, group, bot, message } = event
    messageBodyId = message.id
    if (text === 'ping') {
      await bot.sendMessage(group.id, { text: 'pong' })
    } else if (text.startsWith('to ![:Team](')) {
      console.log(text)
      const matches = text.match(/!\[:Team\]\((\d+)\)/)
      if (matches != null) {
        const teamId = matches[1]
        await Service.create({ name: 'Forward', groupId: group.id, botId: bot.id, data: { teamId } })
      }
    }
  } else if (event.type === 'PostAdded') {
    console.log(event)

    const message = event.message
    if (message.body.id === messageBodyId) {
      return // handled above: Message4Bot
    }

    const botId = message.ownerId
    const userId = message.body.creatorId
    if (botId === userId) {
      return // bot should not talk to itself to avoid dead-loop conversation
    }

    const groupId = message.body.groupId
    const services = await Service.findAll({ where: {
      name: 'Forward',
      groupId,
      botId
    } })
    const bot = await Bot.findByPk(botId)
    for (const service of services) {
      await bot.rc.post('/restapi/v1.0/glip/posts', { groupId: service.data.teamId, text: `![:Person](${userId}) posted in ![:Team](${groupId}):\n\n> ${message.body.text}` })
    }
  }
}

const app = createApp(handle)

module.exports = app
