const createApp = require('ringcentral-chatbot/dist/apps').default

const handle = require('./handler')

const app = createApp(handle)
app.listen(process.env.RINGCENTRAL_CHATBOT_EXPRESS_PORT)
