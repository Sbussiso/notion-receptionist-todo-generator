import TodoGenerator from './gpt-todo.js'; // Import the TodoGenerator class
import { getPageData, getPageBlocks, createNotionPage, notionApi } from './pages.js';
import NotionDatabaseManager from './db-manager.js'; // Import the database manager

// Create and send TODO list
async function createTodoPage(apiKey, databaseId, name) {
    const todoGenerator = new TodoGenerator();
    const todoContent = await todoGenerator.getTodoList();
    await createNotionPage(todoContent, name);
    console.log("TODO list created successfully!");
  }



  (async () => {
    const databaseManager = new NotionDatabaseManager();
    await databaseManager.ensureDatabaseExists(); // Ensure the database exists
    const databaseId = databaseManager.databaseId; // Get the database ID
  
    await createTodoPage(notionApi.key, databaseId, "TODO");
  })();
  