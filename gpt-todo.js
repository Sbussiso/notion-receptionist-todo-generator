import OpenAI from 'openai';
import GmailClient from './g-client.js'; // Import GmailClient
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class TodoGenerator {
  async getCalendarData() {
    const gmailClient = new GmailClient();
    await gmailClient.initialize();
    const events = await gmailClient.listEvents();
    return events.map(event => `${event.start.dateTime || event.start.date} - ${event.summary}`).join('\n');
  }

  async getEmailData() {
    const gmailClient = new GmailClient();
    await gmailClient.initialize();
    const emailData = await gmailClient.listMessages();
    return emailData;
  }

  async getTodoList() {
    const calendarData = await this.getCalendarData();

    const format = `Write a TODO list for today in the following format FORMAT filling in all the ():
                    FORMAT:

                    [] item
                    (general advice for task here)\n
                        - (break down item into steps here)
                    [] item
                    (general advice for task here)\n
                        - (break down into steps)
                    [] item
                    (general advice for task here)\n
                        - (break down item into steps here)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `Plan the user's day based on priority: Google calendar data. calendar: ${calendarData}` },
        { role: 'user', content: format }
      ]
    });
    return completion.choices[0].message.content;
  }

  async getEmailSnapshot() {
    const emailData = await this.getEmailData();

    const format = `Display and summarize this list of emails in this FORMAT:
                    FORMAT:

                    (Display Sender)
                    (Display Summary)`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `Summarize and format the user's emails: ${JSON.stringify(emailData)}` },
        { role: 'user', content: format }
      ]
    });
    return completion.choices[0].message.content;
  }

  async getEmailResponse(emailData) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `You are an email auto response system. Respond to this email as if you are the recipient` },
        { role: 'user', content: emailData }
      ]
    });
    return completion.choices[0].message.content;
  }
}

export default TodoGenerator;
