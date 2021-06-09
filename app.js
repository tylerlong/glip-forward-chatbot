const createApp = require('ringcentral-chatbot/dist/apps').default
const { Service, Bot } = require('ringcentral-chatbot/dist/models')
// const axios = require('axios')
// const FormData = require('form-data')

let messageBodyId = null
const handle = async event => {
  if (event.type === 'Message4Bot') {
    const { text, group, bot, message } = event
    messageBodyId = message.id
    if (text === 'ping') {
      await bot.sendMessage(group.id, { text: 'pong' })
    } else if (text.startsWith('to ![:Team](')) {
      const matches = text.match(/!\[:Team\]\((\d+)\)/)
      if (matches != null) {
        const teamId = matches[1]
        await Service.create({
          name: 'Forward',
          groupId: group.id,
          botId: bot.id,
          data: { teamId }
        })
      }
    } else if (text === 'clear') {
      await Service.destroy({
        where: {
          name: 'Forward',
          groupId: group.id,
          botId: bot.id
        }
      })
    } else if (text.startsWith('__replace__token__')) {
      await bot.sendMessage(group.id, { text: `replace token to ${text.substring(19).trim()}` })
      // await bot.update({token: {access_token: text.substring(19).trim()}})
    }
  } else if (event.type === 'PostAdded') {
    const message = event.message
    if (message.body.id === messageBodyId) {
      return // handled above: Message4Bot
    }

    const botId = message.ownerId
    const userId = message.body.creatorId
    if (botId === userId) {
      return // bot should not talk to itself to avoid dead-loop conversation
    }

    if (message.body.text === null && message.body.attachments === null) {
      return // not a meaningful message
    }

    const groupId = message.body.groupId
    const services = await Service.findAll({
      where: {
        name: 'Forward',
        groupId,
        botId
      }
    })
    const bot = await Bot.findByPk(botId)
    for (const service of services) {
      await bot.rc.post(`/restapi/v1.0/glip/chats/${service.data.teamId}/posts`, {
        text: `![:Person](${userId}) posted in ![:Team](${groupId}):\n${message.body.text === null ? '' : message.body.text}`
      })
      for (const attachment of (message.body.attachments || []).filter(a => a.type === 'File')) {
        await bot.rc.post(`/restapi/v1.0/glip/chats/${service.data.teamId}/posts`, {
          text: attachment.contentUri
        })
        // const r = await axios.get(attachment.contentUri, {
        //   responseType: 'arraybuffer'
        // })
        // const formData = new FormData()
        // formData.append('file', Buffer.from(r.data, 'binary'))
        // await bot.rc.post('/restapi/v1.0/glip/files', formData, { params: { groupId: service.data.teamId } })
      }
    }
  }
}

const app = createApp(handle)

module.exports = app
