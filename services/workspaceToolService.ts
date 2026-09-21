import { Type, FunctionDeclaration } from "@google/genai";
import { WorkspaceAppName, WorkspaceToolsConfig } from "../types";
import { getAccessToken } from "./workspaceAuthService";
import {
  listGmailMessages,
  getGmailMessageFull,
  sendGmailMessage,
  listDriveFiles,
  createDriveTextFile,
  listSpreadsheets,
  getSheetValues,
  appendSheetRow,
  listGoogleDocs,
  getGoogleDocContent,
  appendGoogleDocText,
  listCalendarEvents,
  createCalendarEvent,
  listTasksInList,
  createTask,
  updateTaskStatus
} from "./workspaceApiService";

const STORAGE_KEY = 'workspace_agent_tools_config';

const DEFAULT_CONFIG: WorkspaceToolsConfig = {
  enabledApps: {
    gmail: true,
    drive: true,
    sheets: true,
    docs: true,
    calendar: true,
    tasks: true,
  }
};

let listeners: Array<(config: WorkspaceToolsConfig) => void> = [];

export const getWorkspaceToolsConfig = (): WorkspaceToolsConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      enabledApps: {
        ...DEFAULT_CONFIG.enabledApps,
        ...(parsed.enabledApps || {})
      }
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

export const saveWorkspaceToolsConfig = (config: WorkspaceToolsConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to persist workspace tools config', e);
  }
  listeners.forEach(fn => fn(config));
};

export const toggleWorkspaceApp = (app: WorkspaceAppName, forceState?: boolean): WorkspaceToolsConfig => {
  const current = getWorkspaceToolsConfig();
  const nextState = forceState !== undefined ? forceState : !current.enabledApps[app];
  const updated: WorkspaceToolsConfig = {
    enabledApps: {
      ...current.enabledApps,
      [app]: nextState,
    }
  };
  saveWorkspaceToolsConfig(updated);
  return updated;
};

export const setFullStack = (enabled: boolean): WorkspaceToolsConfig => {
  const updated: WorkspaceToolsConfig = {
    enabledApps: {
      gmail: enabled,
      drive: enabled,
      sheets: enabled,
      docs: enabled,
      calendar: enabled,
      tasks: enabled,
    }
  };
  saveWorkspaceToolsConfig(updated);
  return updated;
};

export const isFullStackEnabled = (): boolean => {
  const config = getWorkspaceToolsConfig();
  return Object.values(config.enabledApps).every(Boolean);
};

export const isAnyWorkspaceToolEnabled = (): boolean => {
  const config = getWorkspaceToolsConfig();
  return Object.values(config.enabledApps).some(Boolean);
};

export const subscribeWorkspaceTools = (listener: (config: WorkspaceToolsConfig) => void): (() => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

// -------------------------------------------------------------
// GEMINI FUNCTION DECLARATIONS
// -------------------------------------------------------------

const gmailSearchOrList: FunctionDeclaration = {
  name: "gmail_search_or_list",
  description: "Search or list emails from the user's Gmail inbox. Supports queries like 'is:unread', 'from:alex', or general keywords.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Search query or filter (optional, leave empty for recent messages)."
      },
      maxResults: {
        type: Type.NUMBER,
        description: "Maximum number of messages to return (default 8)."
      }
    }
  }
};

const gmailSendEmail: FunctionDeclaration = {
  name: "gmail_send_email",
  description: "Send an email on behalf of the user using their connected Gmail account.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      to: {
        type: Type.STRING,
        description: "Recipient email address (e.g. colleague@example.com)"
      },
      subject: {
        type: Type.STRING,
        description: "Subject line of the email"
      },
      body: {
        type: Type.STRING,
        description: "Message body text to send"
      }
    },
    required: ["to", "subject", "body"]
  }
};

const driveSearchOrList: FunctionDeclaration = {
  name: "drive_search_or_list",
  description: "Search or list files in the user's Google Drive storage.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "Optional query to search file names or contents."
      }
    }
  }
};

const driveCreateFile: FunctionDeclaration = {
  name: "drive_create_file",
  description: "Create a new text or note file directly in Google Drive.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "File name (e.g. MeetingSummary.txt or Notes.md)"
      },
      content: {
        type: Type.STRING,
        description: "Text contents to write to the file"
      }
    },
    required: ["name", "content"]
  }
};

const sheetsListSpreadsheets: FunctionDeclaration = {
  name: "sheets_list_spreadsheets",
  description: "List Google Sheets spreadsheets accessible in Google Drive.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const sheetsReadData: FunctionDeclaration = {
  name: "sheets_read_data",
  description: "Read tabular cell values from a Google Sheets spreadsheet by ID and range.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      spreadsheetId: {
        type: Type.STRING,
        description: "The Google Spreadsheet ID"
      },
      range: {
        type: Type.STRING,
        description: "A1 notation range to read (e.g. 'Sheet1!A1:Z50' or 'A1:E20')"
      }
    },
    required: ["spreadsheetId"]
  }
};

const sheetsAppendRow: FunctionDeclaration = {
  name: "sheets_append_row",
  description: "Append a row of comma or list values to a Google Sheets spreadsheet.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      spreadsheetId: {
        type: Type.STRING,
        description: "The Google Spreadsheet ID"
      },
      values: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Array of string values representing cell columns in the new row"
      },
      range: {
        type: Type.STRING,
        description: "A1 notation target tab or range (default 'Sheet1!A1')"
      }
    },
    required: ["spreadsheetId", "values"]
  }
};

const docsListDocuments: FunctionDeclaration = {
  name: "docs_list_documents",
  description: "List Google Docs accessible in Google Drive.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const docsReadDocument: FunctionDeclaration = {
  name: "docs_read_document",
  description: "Read the full text content of a Google Document by ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentId: {
        type: Type.STRING,
        description: "The Google Document ID"
      }
    },
    required: ["documentId"]
  }
};

const docsAppendText: FunctionDeclaration = {
  name: "docs_append_text",
  description: "Append text to the end of a Google Document.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      documentId: {
        type: Type.STRING,
        description: "The Google Document ID"
      },
      text: {
        type: Type.STRING,
        description: "Text content to insert at the end of the document"
      }
    },
    required: ["documentId", "text"]
  }
};

const calendarListEvents: FunctionDeclaration = {
  name: "calendar_list_events",
  description: "List upcoming events from the user's Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      maxResults: {
        type: Type.NUMBER,
        description: "Maximum number of events to return (default 10)."
      }
    }
  }
};

const calendarCreateEvent: FunctionDeclaration = {
  name: "calendar_create_event",
  description: "Create a new meeting or event on the user's Google Calendar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.STRING,
        description: "Event title or summary (e.g. 'Project Review with Team')"
      },
      startTime: {
        type: Type.STRING,
        description: "Start time in ISO format (e.g. 2026-09-21T10:00:00Z or local time)"
      },
      endTime: {
        type: Type.STRING,
        description: "End time in ISO format (e.g. 2026-09-21T11:00:00Z or local time)"
      },
      description: {
        type: Type.STRING,
        description: "Optional description or meeting agenda"
      },
      location: {
        type: Type.STRING,
        description: "Optional meeting location or video link"
      }
    },
    required: ["summary", "startTime", "endTime"]
  }
};

const tasksListTasks: FunctionDeclaration = {
  name: "tasks_list_tasks",
  description: "List tasks from the user's Google Tasks default list.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskListId: {
        type: Type.STRING,
        description: "Task list ID (defaults to '@default')"
      }
    }
  }
};

const tasksCreateTask: FunctionDeclaration = {
  name: "tasks_create_task",
  description: "Create a new task in Google Tasks.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Task title"
      },
      notes: {
        type: Type.STRING,
        description: "Optional notes or details for the task"
      },
      dueDate: {
        type: Type.STRING,
        description: "Optional due date (YYYY-MM-DD)"
      },
      taskListId: {
        type: Type.STRING,
        description: "Task list ID (defaults to '@default')"
      }
    },
    required: ["title"]
  }
};

const tasksCompleteTask: FunctionDeclaration = {
  name: "tasks_complete_task",
  description: "Mark a Google Task as completed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskId: {
        type: Type.STRING,
        description: "ID of the task to complete"
      },
      taskListId: {
        type: Type.STRING,
        description: "Task list ID (defaults to '@default')"
      }
    },
    required: ["taskId"]
  }
};

/**
 * Get active function declarations based on enabled apps
 */
export const getActiveWorkspaceDeclarations = (): FunctionDeclaration[] => {
  const config = getWorkspaceToolsConfig();
  const declarations: FunctionDeclaration[] = [];

  if (config.enabledApps.gmail) {
    declarations.push(gmailSearchOrList, gmailSendEmail);
  }
  if (config.enabledApps.drive) {
    declarations.push(driveSearchOrList, driveCreateFile);
  }
  if (config.enabledApps.sheets) {
    declarations.push(sheetsListSpreadsheets, sheetsReadData, sheetsAppendRow);
  }
  if (config.enabledApps.docs) {
    declarations.push(docsListDocuments, docsReadDocument, docsAppendText);
  }
  if (config.enabledApps.calendar) {
    declarations.push(calendarListEvents, calendarCreateEvent);
  }
  if (config.enabledApps.tasks) {
    declarations.push(tasksListTasks, tasksCreateTask, tasksCompleteTask);
  }

  return declarations;
};

// -------------------------------------------------------------
// TOOL DISPATCHER & EXECUTOR
// -------------------------------------------------------------

export const executeWorkspaceTool = async (name: string, args: any): Promise<any> => {
  const token = getAccessToken();
  if (!token) {
    return {
      error: "Google Workspace not authenticated. The user must click 'Connect' or 'Sign in with Google' in the toolbar to authorize access."
    };
  }

  try {
    switch (name) {
      // GMAIL
      case "gmail_search_or_list": {
        const query = args?.query || "";
        const max = args?.maxResults || 8;
        const messages = await listGmailMessages(query, max);
        return {
          count: messages.length,
          messages: messages.map(m => ({
            id: m.id,
            from: m.from,
            subject: m.subject,
            date: m.date,
            snippet: m.snippet,
            unread: m.unread
          }))
        };
      }

      case "gmail_send_email": {
        const { to, subject, body } = args;
        const res = await sendGmailMessage(to, subject, body);
        return {
          status: "success",
          message: `Email successfully sent to ${to}`,
          messageId: res.id
        };
      }

      // DRIVE
      case "drive_search_or_list": {
        const query = args?.query || "";
        const files = await listDriveFiles(query);
        return {
          count: files.length,
          files: files.slice(0, 15).map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            link: f.webViewLink
          }))
        };
      }

      case "drive_create_file": {
        const { name: fileName, content } = args;
        const res = await createDriveTextFile(fileName, content);
        return {
          status: "success",
          message: `File "${fileName}" created in Google Drive`,
          fileId: res.id
        };
      }

      // SHEETS
      case "sheets_list_spreadsheets": {
        const sheets = await listSpreadsheets();
        return {
          count: sheets.length,
          spreadsheets: sheets.map(s => ({ id: s.id, name: s.name }))
        };
      }

      case "sheets_read_data": {
        const { spreadsheetId, range = "Sheet1!A1:Z50" } = args;
        const rows = await getSheetValues(spreadsheetId, range);
        return {
          spreadsheetId,
          range,
          rowCount: rows.length,
          data: rows
        };
      }

      case "sheets_append_row": {
        const { spreadsheetId, values, range = "Sheet1!A1" } = args;
        const res = await appendSheetRow(spreadsheetId, range, values);
        return {
          status: "success",
          message: `Appended row with ${values?.length || 0} columns`,
          updatedRange: res.updates?.updatedRange
        };
      }

      // DOCS
      case "docs_list_documents": {
        const docs = await listGoogleDocs();
        return {
          count: docs.length,
          documents: docs.map(d => ({ id: d.id, name: d.name }))
        };
      }

      case "docs_read_document": {
        const { documentId } = args;
        const doc = await getGoogleDocContent(documentId);
        return {
          documentId,
          title: doc.title,
          content: doc.text
        };
      }

      case "docs_append_text": {
        const { documentId, text } = args;
        await appendGoogleDocText(documentId, text);
        return {
          status: "success",
          message: `Appended text to document ${documentId}`
        };
      }

      // CALENDAR
      case "calendar_list_events": {
        const max = args?.maxResults || 10;
        const events = await listCalendarEvents(max);
        return {
          count: events.length,
          events: events.map(e => ({
            id: e.id,
            summary: e.summary,
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date,
            location: e.location,
            description: e.description
          }))
        };
      }

      case "calendar_create_event": {
        const { summary, startTime, endTime, description, location } = args;
        const res = await createCalendarEvent(summary, startTime, endTime, description, location);
        return {
          status: "success",
          message: `Calendar event "${summary}" created`,
          eventId: res.id,
          htmlLink: res.htmlLink
        };
      }

      // TASKS
      case "tasks_list_tasks": {
        const listId = args?.taskListId || "@default";
        const tasks = await listTasksInList(listId);
        return {
          count: tasks.length,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due: t.due,
            notes: t.notes
          }))
        };
      }

      case "tasks_create_task": {
        const { title, notes, dueDate, taskListId = "@default" } = args;
        const res = await createTask(taskListId, title, notes, dueDate);
        return {
          status: "success",
          message: `Task "${title}" created`,
          taskId: res.id
        };
      }

      case "tasks_complete_task": {
        const { taskId, taskListId = "@default" } = args;
        await updateTaskStatus(taskListId, taskId, true);
        return {
          status: "success",
          message: `Task ${taskId} marked as completed`
        };
      }

      default:
        return { error: `Unknown tool name: ${name}` };
    }
  } catch (err: any) {
    console.error(`Workspace tool ${name} execution error:`, err);
    return {
      error: `Failed to execute ${name}: ${err.message || 'Unknown error'}`
    };
  }
};
