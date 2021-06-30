import createApp from 'ringcentral-chatbot/dist/apps';
import {Service, Bot} from 'ringcentral-chatbot/dist/models';
import {BotType, ServiceType, Message} from 'ringcentral-chatbot/dist/types';

let messageBodyId: string | null = null;
const handle = async (event: any) => {
  if (event.type === 'Message4Bot') {
    const {text, group, bot, message} = event;
    messageBodyId = message.id;
    if (text === 'ping') {
      await bot.sendMessage(group.id, {text: 'pong'});
    } else if (text.startsWith('to ![:Team](')) {
      const matches = text.match(/!\[:Team\]\((\d+)\)/);
      if (matches !== null) {
        const teamId = matches[1];
        await Service.create({
          name: 'Forward',
          groupId: group.id,
          botId: bot.id,
          data: {teamId},
        });
      }
    } else if (text === 'clear') {
      await Service.destroy({
        where: {
          name: 'Forward',
          groupId: group.id,
          botId: bot.id,
        },
      });
    } else if (text.startsWith('__replace__token__')) {
      await bot.sendMessage(group.id, {
        text: `replace token to ${text.substring(19).trim()}`,
      });
      // await bot.update({token: {access_token: text.substring(19).trim()}})
    }
  } else if (event.type === 'PostAdded') {
    const message = event.message as Message;
    if (message.body.id === messageBodyId) {
      return; // handled above: Message4Bot
    }

    const botId = message.ownerId;
    const userId = message.body.creatorId;
    if (botId === userId) {
      return; // bot should not talk to itself to avoid dead-loop conversation
    }

    if (message.body.text === null && message.body.attachments === null) {
      return; // not a meaningful message
    }

    const groupId = message.body.groupId;
    const services = (await Service.findAll({
      where: {
        name: 'Forward',
        groupId,
        botId,
      },
    })) as unknown as ServiceType[];
    const bot = (await Bot.findByPk(botId)) as unknown as BotType;
    for (const service of services) {
      await bot.rc.post(
        `/restapi/v1.0/glip/chats/${service.data.teamId}/posts`,
        {
          text: `![:Person](${userId}) posted in ![:Team](${groupId}):\n${
            message.body.text === null ? '' : message.body.text
          }`,
        }
      );
      for (const attachment of (message.body.attachments || []).filter(
        a => a.type === 'File'
      )) {
        await bot.rc.post(
          `/restapi/v1.0/glip/chats/${service.data.teamId}/posts`,
          {
            text: attachment.contentUri,
          }
        );
      }
    }
  }
};

const app = createApp(handle);

export default app;
