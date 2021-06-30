import {createAsyncProxy} from 'ringcentral-chatbot/dist/lambda';
import serverlessHTTP from 'serverless-http';
import axios from 'axios';

import myApp from './app';

export const app = serverlessHTTP(myApp);
export const proxy = createAsyncProxy('app');
export const maintain = async () =>
  axios.put(
    `${process.env.RINGCENTRAL_CHATBOT_SERVER}/admin/maintain`,
    undefined,
    {
      auth: {
        username: process.env.RINGCENTRAL_CHATBOT_ADMIN_USERNAME!,
        password: process.env.RINGCENTRAL_CHATBOT_ADMIN_PASSWORD!,
      },
    }
  );
