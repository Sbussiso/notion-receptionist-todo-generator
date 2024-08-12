import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

class GmailClient {
  constructor() {
    this.oAuth2Client = null;
  }

  async initialize() {
    const content = await fs.promises.readFile(CREDENTIALS_PATH, 'utf8');
    const credentials = JSON.parse(content);
    await this.authorize(credentials);
  }

  async authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    try {
      const token = await fs.promises.readFile(TOKEN_PATH, 'utf8');
      this.oAuth2Client.setCredentials(JSON.parse(token));
    } catch (err) {
      await this.getNewToken();
    }
  }

  async getNewToken() {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise((resolve) => {
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        resolve(code);
      });
    });

    const { tokens } = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokens);
    await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    console.log('Token stored to', TOKEN_PATH);
  }

  async sendEmail(emailContent) {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    const encodedMessage = Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: encodedMessage,
        },
      });
      console.log('Email sent:', res.data);
    } catch (err) {
      console.log('The API returned an error:', err);
    }
  }

  async listMessages() {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
      });
      const messages = res.data.messages;
      if (messages && messages.length) {
        const emailData = [];
        for (const message of messages) {
          const messageRes = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
          });
          const headers = messageRes.data.payload.headers;
          const fromHeader = headers.find(header => header.name === 'From');
          const snippet = messageRes.data.snippet;
          const sender = fromHeader ? fromHeader.value : 'Unknown sender';
          emailData.push({ sender, snippet });
        }
        return emailData;
      } else {
        console.log('No messages found.');
        return [];
      }
    } catch (err) {
      console.log('The API returned an error:', err);
      return [];
    }
  }

  async listEvents() {
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
      return events;
    } else {
      console.log('No upcoming events found.');
      return [];
    }
  }

  async listPastEvents() {
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfMonth,
      timeMax: now.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = res.data.items;
    if (events.length) {
      console.log('Past events this month:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
      return events;
    } else {
      console.log('No past events found.');
      return [];
    }
  }

  async createEvent(summary, location, description, startDateTime, endDateTime, timeZone, recurrence, attendees, reminders) {
    const event = {
      summary: summary,
      location: location,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone,
      },
      recurrence: recurrence,
      attendees: attendees,
      reminders: reminders,
    };

    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      console.log('Event created:', res.data);
      return res.data;
    } catch (err) {
      console.error('Error creating event:', err);
      throw err;
    }
  }

  async deleteEvent(eventId) {
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      console.log('Event deleted:', eventId);
    } catch (err) {
      console.error('Error deleting event:', err);
      throw err;
    }
  }
}

export default GmailClient;
