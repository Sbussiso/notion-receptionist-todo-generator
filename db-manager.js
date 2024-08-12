import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const notionApiKey = process.env.NOTION_API_KEY;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

const notion = axios.create({
  baseURL: 'https://api.notion.com/v1/',
  headers: {
    'Authorization': `Bearer ${notionApiKey}`,
    'Notion-Version': '2022-06-28', // Ensure the correct API version
  },
});

class NotionDatabaseManager {
  constructor(databaseId) {
    this._databaseId = databaseId || process.env.NOTION_DATABASE_ID;
  }

  // Check if the database exists
  async checkDatabaseExists() {
    try {
      const response = await notion.get(`databases/${this._databaseId}`);
      console.log('Database exists:', response.data);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('Database does not exist.');
        return false;
      } else {
        console.error('Error checking database existence:', error);
        throw error;
      }
    }
  }

  // Create a new database
  async createDatabase() {
    try {
      const response = await notion.post('databases', {
        parent: { type: 'page_id', page_id: parentPageId },
        title: [
          {
            type: 'text',
            text: {
              content: 'Tasks'
            }
          }
        ],
        properties: {
          Task: {
            title: {}
          },
          Acknowledge: {
            checkbox: {}
          },
          Completed: {
            checkbox: {}
          }
        }
      });

      console.log('Database created:', response.data);
      return response.data.id; // Return the new database ID
    } catch (error) {
      console.error('Error creating database:', error.response ? error.response.data : error);
      throw error;
    }
  }

  // Update the .env file with the new database ID
  async updateEnvFile(newDatabaseId) {
    try {
      const envFile = await fs.readFile('.env', 'utf-8');
      const envLines = envFile.split('\n');
      const updatedEnvLines = envLines.map(line => {
        if (line.startsWith('NOTION_DATABASE_ID=')) {
          return `NOTION_DATABASE_ID=${newDatabaseId}`;
        }
        return line;
      });

      if (!envLines.some(line => line.startsWith('NOTION_DATABASE_ID='))) {
        updatedEnvLines.push(`NOTION_DATABASE_ID=${newDatabaseId}`);
      }

      await fs.writeFile('.env', updatedEnvLines.join('\n'));
      console.log('Updated .env file with new database ID');
    } catch (error) {
      console.error('Error updating .env file:', error);
      throw error;
    }
  }

  // Ensure the database exists
  async ensureDatabaseExists() {
    let validDatabaseId = false;

    if (this._databaseId && this._databaseId !== 'your_database_id') {
      try {
        validDatabaseId = await this.checkDatabaseExists();
      } catch (error) {
        console.log('Invalid database ID, creating a new database...');
      }
    }

    if (!validDatabaseId) {
      console.log('No valid database ID provided or database does not exist, creating a new database...');
      const newDatabaseId = await this.createDatabase();
      await this.updateEnvFile(newDatabaseId);
      this._databaseId = newDatabaseId;
    }
  }

  // Retrieve all tasks from the database
  async getAllTasks() {
    try {
      const response = await notion.post(`databases/${this._databaseId}/query`);
      return response.data.results;
    } catch (error) {
      console.error('Error retrieving tasks:', error);
      throw error;
    }
  }

  // Delete a task from the database
  async deleteTask(taskId) {
    try {
      const response = await notion.delete(`blocks/${taskId}`);
      console.log(`Task ${taskId} deleted successfully.`);
      return response.data;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Getters and setters for databaseId
  get databaseId() {
    return this._databaseId;
  }

  set databaseId(value) {
    this._databaseId = value;
  }
}

export default NotionDatabaseManager;
