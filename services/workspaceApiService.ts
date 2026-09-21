import { getAccessToken } from './workspaceAuthService';

// Helper for authorized fetch
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('NOT_AUTHENTICATED');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  return response;
}

// ==========================================
// 1. GMAIL API
// ==========================================
export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  unread?: boolean;
}

export async function listGmailMessages(query: string = '', maxResults: number = 15): Promise<GmailMessageSummary[]> {
  const qParam = encodeURIComponent(query);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${query ? `&q=${qParam}` : ''}`;
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch messages (${res.status})`);
  }

  const data = await res.json();
  const messages: Array<{ id: string; threadId: string }> = data.messages || [];

  // Fetch headers & snippet for each message in parallel
  const details = await Promise.all(
    messages.slice(0, 15).map(async (msg) => {
      try {
        const itemRes = await authFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`);
        if (!itemRes.ok) return { id: msg.id, threadId: msg.threadId };
        const item = await itemRes.json();
        const headers: GmailMessageHeader[] = item.payload?.headers || [];
        const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
        const unread = (item.labelIds || []).includes('UNREAD');

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: item.snippet || '',
          subject,
          from,
          to,
          date,
          unread
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return details;
}

export async function getGmailMessageFull(messageId: string): Promise<{
  id: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
}> {
  const res = await authFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch email details');
  }

  const data = await res.json();
  const headers: GmailMessageHeader[] = data.payload?.headers || [];
  const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
  const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
  const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
  const date = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';

  // Extract body text
  let body = '';
  function parseParts(parts: any[]) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += decodeBase64Url(part.body.data) + '\n';
      } else if (part.parts) {
        parseParts(part.parts);
      }
    }
  }

  if (data.payload?.body?.data) {
    body = decodeBase64Url(data.payload.body.data);
  } else if (data.payload?.parts) {
    parseParts(data.payload.parts);
  }

  return {
    id: data.id,
    snippet: data.snippet || '',
    subject,
    from,
    to,
    date,
    body: body || data.snippet || '(No text content)'
  };
}

export async function sendGmailMessage(to: string, subject: string, bodyText: string): Promise<any> {
  const emailLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(encodeURIComponent(subject))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    bodyText,
  ];
  const email = emailLines.join('\r\n');
  const encodedEmail = encodeBase64Url(email);

  const res = await authFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to send email');
  }

  return res.json();
}

// Base64Url Helpers
function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return atob(base64);
  }
}

// ==========================================
// 2. GOOGLE DRIVE API
// ==========================================
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function listDriveFiles(searchQuery: string = '', mimeType?: string): Promise<DriveFileItem[]> {
  let qParts = ['trashed = false'];
  if (mimeType) {
    qParts.push(`mimeType = '${mimeType}'`);
  }
  if (searchQuery.trim()) {
    qParts.push(`name contains '${searchQuery.replace(/'/g, "\\'")}'`);
  }
  const q = encodeURIComponent(qParts.join(' and '));
  const fields = encodeURIComponent('files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)');
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=30&q=${q}&fields=${fields}&orderBy=modifiedTime desc`;

  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to list Drive files');
  }

  const data = await res.json();
  return data.files || [];
}

export async function createDriveTextFile(name: string, content: string, mimeType: string = 'text/plain'): Promise<DriveFileItem> {
  const metadata = {
    name,
    mimeType
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const res = await authFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create file on Drive');
  }

  return res.json();
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const res = await authFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete file from Drive');
  }
}

export async function getDriveFileTextOrContent(file: DriveFileItem): Promise<{
  name: string;
  mimeType: string;
  content: string;
  data64?: string;
}> {
  const mime = file.mimeType || '';

  if (mime.includes('vnd.google-apps.document')) {
    const doc = await getGoogleDocContent(file.id);
    return {
      name: file.name,
      mimeType: 'text/plain',
      content: doc.text
    };
  } else if (mime.includes('vnd.google-apps.spreadsheet')) {
    try {
      const rows = await getSheetValues(file.id, 'A1:Z50');
      const formatted = rows.map(r => r.join('\t')).join('\n');
      return {
        name: file.name,
        mimeType: 'text/plain',
        content: formatted || '(Empty spreadsheet)'
      };
    } catch {
      return {
        name: file.name,
        mimeType: 'text/plain',
        content: `[Spreadsheet ID: ${file.id}]`
      };
    }
  } else if (mime.includes('vnd.google-apps.presentation')) {
    const res = await authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`);
    if (res.ok) {
      const text = await res.text();
      return { name: file.name, mimeType: 'text/plain', content: text };
    }
  }

  if (mime.startsWith('image/')) {
    const res = await authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
    if (res.ok) {
      const blob = await res.blob();
      const buffer = await blob.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      return {
        name: file.name,
        mimeType: mime,
        content: `[Attached Image: ${file.name}]`,
        data64: base64
      };
    }
  }

  const res = await authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  if (!res.ok) {
    const expRes = await authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`);
    if (expRes.ok) {
      const text = await expRes.text();
      return { name: file.name, mimeType: 'text/plain', content: text };
    }
    throw new Error('Could not download file content from Drive');
  }

  const text = await res.text();
  return {
    name: file.name,
    mimeType: mime || 'text/plain',
    content: text
  };
}

// ==========================================
// 3. GOOGLE SHEETS API
// ==========================================
export interface SpreadsheetSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

export async function listSpreadsheets(query: string = ''): Promise<SpreadsheetSummary[]> {
  return listDriveFiles(query, 'application/vnd.google-apps.spreadsheet');
}

export async function getSpreadsheetDetails(spreadsheetId: string): Promise<{
  title: string;
  sheets: SheetTabInfo[];
}> {
  const res = await authFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch spreadsheet details');
  }

  const data = await res.json();
  const sheets: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title || 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount || 100,
    columnCount: s.properties?.gridProperties?.columnCount || 26,
  }));

  return {
    title: data.properties?.title || 'Spreadsheet',
    sheets,
  };
}

export async function getSheetValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const res = await authFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to read sheet cells');
  }
  const data = await res.json();
  return data.values || [];
}

export async function appendSheetRow(spreadsheetId: string, range: string, values: string[]): Promise<any> {
  const res = await authFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [values],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to append row to spreadsheet');
  }

  return res.json();
}

export async function createSpreadsheet(title: string, initialHeaders: string[] = []): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const body: any = {
    properties: {
      title,
    },
  };

  const res = await authFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create new spreadsheet');
  }

  const result = await res.json();

  // If initial headers provided, populate row 1
  if (initialHeaders.length > 0 && result.spreadsheetId) {
    try {
      await appendSheetRow(result.spreadsheetId, 'A1', initialHeaders);
    } catch (e) {
      console.warn('Could not populate initial headers:', e);
    }
  }

  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl: result.spreadsheetUrl,
  };
}

// ==========================================
// 4. GOOGLE DOCS API
// ==========================================
export interface DocumentSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export async function listGoogleDocs(query: string = ''): Promise<DocumentSummary[]> {
  return listDriveFiles(query, 'application/vnd.google-apps.document');
}

export async function getGoogleDocContent(documentId: string): Promise<{
  title: string;
  text: string;
  documentId: string;
}> {
  const res = await authFetch(`https://docs.googleapis.com/v1/documents/${documentId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch document content');
  }

  const data = await res.json();
  let fullText = '';

  function extractTextFromStructuralElements(elements: any[]) {
    for (const elem of elements || []) {
      if (elem.paragraph?.elements) {
        for (const pe of elem.paragraph.elements) {
          if (pe.textRun?.content) {
            fullText += pe.textRun.content;
          }
        }
      } else if (elem.table?.tableRows) {
        for (const row of elem.table.tableRows) {
          for (const cell of row.tableCells || []) {
            extractTextFromStructuralElements(cell.content);
          }
        }
      }
    }
  }

  if (data.body?.content) {
    extractTextFromStructuralElements(data.body.content);
  }

  return {
    title: data.title || 'Untitled Document',
    text: fullText.trim() || '(Document has no text)',
    documentId: data.documentId,
  };
}

export async function appendGoogleDocText(documentId: string, textToAppend: string): Promise<any> {
  const body = {
    requests: [
      {
        insertText: {
          endOfSegmentLocation: {},
          text: `\n\n${textToAppend}`,
        },
      },
    ],
  };

  const res = await authFetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to append text to document');
  }

  return res.json();
}

export async function createGoogleDoc(title: string, initialBodyText?: string): Promise<{ documentId: string; title: string }> {
  const res = await authFetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create document');
  }

  const data = await res.json();

  if (initialBodyText && data.documentId) {
    try {
      await appendGoogleDocText(data.documentId, initialBodyText);
    } catch (e) {
      console.warn('Failed to insert initial text into doc:', e);
    }
  }

  return {
    documentId: data.documentId,
    title: data.title,
  };
}

// ==========================================
// 5. GOOGLE CALENDAR API
// ==========================================
export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  status?: string;
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
}

export async function listCalendarEvents(maxResults: number = 20): Promise<CalendarEventItem[]> {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // start of today
  const timeMin = encodeURIComponent(now.toISOString());
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&maxResults=${maxResults}`;

  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch calendar events');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(No title)',
    description: item.description || '',
    location: item.location || '',
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
    status: item.status,
    attendees: item.attendees || [],
  }));
}

export async function createCalendarEvent(
  summary: string,
  startDateTime: string,
  endDateTime: string,
  description?: string,
  location?: string
): Promise<CalendarEventItem> {
  const body = {
    summary,
    description: description || '',
    location: location || '',
    start: {
      dateTime: new Date(startDateTime).toISOString(),
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
    },
  };

  const res = await authFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create calendar event');
  }

  return res.json();
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const res = await authFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete calendar event');
  }
}

// ==========================================
// 6. GOOGLE TASKS API
// ==========================================
export interface TaskListItem {
  id: string;
  title: string;
  updated?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  links?: Array<{ description: string; link: string }>;
}

export async function listTaskLists(): Promise<TaskListItem[]> {
  const res = await authFetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch task lists');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title || 'My Tasks',
    updated: item.updated,
  }));
}

export async function listTasksInList(taskListId: string = '@default'): Promise<TaskItem[]> {
  const res = await authFetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to fetch tasks');
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    title: item.title || '(Untitled Task)',
    notes: item.notes || '',
    status: item.status || 'needsAction',
    due: item.due,
    completed: item.completed,
    updated: item.updated,
  }));
}

export async function createTask(taskListId: string = '@default', title: string, notes?: string, due?: string): Promise<TaskItem> {
  const body: any = {
    title,
    notes: notes || '',
  };
  if (due) {
    body.due = new Date(due).toISOString();
  }

  const res = await authFetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create task');
  }

  return res.json();
}

export async function updateTaskStatus(taskListId: string = '@default', taskId: string, completed: boolean): Promise<TaskItem> {
  const res = await authFetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to update task status');
  }

  return res.json();
}

export async function deleteTask(taskListId: string = '@default', taskId: string): Promise<void> {
  const res = await authFetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete task');
  }
}
