import { MessageWithReplies } from 'app/features/messages/types/message';
import CurrentUserService from 'app/features/users/services/current-user-service';

export type ChatTaskStatus =
  | 'created'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'submitted'
  | 'needs_review'
  | 'completed'
  | 'delegated'
  | 'transferred'
  | 'revoked';

export type ChatTaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ChatTaskTrailItem = {
  id?: string;
  actor?: string;
  label: string;
  created_at?: number;
  comment?: string;
};

export type ChatTaskCardData = {
  id: string;
  source_message_id?: string;
  source_thread_id?: string;
  source_channel_id?: string;
  source_workspace_id?: string;
  source_company_id?: string;
  title: string;
  description?: string;
  emoji?: string;
  status: ChatTaskStatus;
  priority?: ChatTaskPriority;
  tags?: string[];
  assignees?: string[];
  due_at?: number;
  reminder_at?: number;
  require_ack?: boolean;
  require_proof?: boolean;
  bookmarkedBy?: string[];
  trail?: ChatTaskTrailItem[];
};

export type ScheduledMessageDraft = {
  id: string;
  channel_id: string;
  thread_id?: string;
  text: string;
  files_count: number;
  scheduled_at: number;
  created_at: number;
  created_by: string;
};

export type MessageTaskSource = Partial<MessageWithReplies> & {
  channel_id?: string;
  cache?: {
    company_id?: string;
    workspace_id?: string;
    channel_id?: string;
  };
};

const STORAGE_PREFIX = 'noted-for-action';
const BOOKMARK_EVENT = 'noted-for-action-bookmark-change';
const TASK_EVENT = 'noted-for-action-task-change';
const SCHEDULE_EVENT = 'noted-for-action-schedule-change';

const getCurrentUserId = () => CurrentUserService.getCurrentUserId?.() || 'anonymous';

const key = (scope: string, userSpecific = true) =>
  `${STORAGE_PREFIX}:${userSpecific ? getCurrentUserId() : 'shared'}:${scope}`;

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  const parsed = JSON.parse(value);
  return parsed || fallback;
};

const read = <T>(scope: string, fallback: T, userSpecific = true): T =>
  safeParse<T>(window.localStorage.getItem(key(scope, userSpecific)), fallback);

const write = <T>(scope: string, value: T, userSpecific = true) => {
  window.localStorage.setItem(key(scope, userSpecific), JSON.stringify(value));
};

export const isBookmarkChangeEvent = (event: Event) => event.type === BOOKMARK_EVENT;
export const isTaskChangeEvent = (event: Event) => event.type === TASK_EVENT;
export const isScheduleChangeEvent = (event: Event) => event.type === SCHEDULE_EVENT;

export const addBookmarkListener = (listener: EventListener) => {
  window.addEventListener(BOOKMARK_EVENT, listener);
  return () => window.removeEventListener(BOOKMARK_EVENT, listener);
};

export const addTaskListener = (listener: EventListener) => {
  window.addEventListener(TASK_EVENT, listener);
  return () => window.removeEventListener(TASK_EVENT, listener);
};

export const addScheduleListener = (listener: EventListener) => {
  window.addEventListener(SCHEDULE_EVENT, listener);
  return () => window.removeEventListener(SCHEDULE_EVENT, listener);
};

export const getBookmarks = () => read<string[]>('bookmarks', []);

export const isBookmarked = (id?: string) => !!id && getBookmarks().includes(id);

export const toggleBookmark = (id?: string) => {
  if (!id) return false;
  const bookmarks = getBookmarks();
  const next = bookmarks.includes(id) ? bookmarks.filter(item => item !== id) : [...bookmarks, id];
  write('bookmarks', next);
  window.dispatchEvent(
    new CustomEvent(BOOKMARK_EVENT, { detail: { id, active: next.includes(id) } }),
  );
  return next.includes(id);
};

export const getStoredTasks = () => read<ChatTaskCardData[]>('chat-tasks', []);

export const upsertStoredTask = (task: ChatTaskCardData) => {
  const tasks = getStoredTasks();
  const next = [task, ...tasks.filter(item => item.id !== task.id)];
  write('chat-tasks', next);
  window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: task }));
  return task;
};

export const updateStoredTaskStatus = (id: string, status: ChatTaskStatus) => {
  const tasks = getStoredTasks();
  const next = tasks.map(task =>
    task.id === id
      ? {
          ...task,
          status,
          trail: [
            ...(task.trail || []),
            {
              id: `${id}-${Date.now()}`,
              actor: getCurrentUserId(),
              label: `Status changed to ${status.replace(/_/g, ' ')}`,
              created_at: Date.now(),
            },
          ],
        }
      : task,
  );
  write('chat-tasks', next);
  window.dispatchEvent(new CustomEvent(TASK_EVENT, { detail: { id, status } }));
};

export const getScheduledMessages = () => read<ScheduledMessageDraft[]>('scheduled-messages', []);

export const addScheduledMessage = (
  draft: Omit<ScheduledMessageDraft, 'id' | 'created_at' | 'created_by'>,
) => {
  const scheduled = getScheduledMessages();
  const item: ScheduledMessageDraft = {
    ...draft,
    id: `scheduled-${Date.now()}`,
    created_at: Date.now(),
    created_by: getCurrentUserId(),
  };
  write('scheduled-messages', [item, ...scheduled]);
  window.dispatchEvent(new CustomEvent(SCHEDULE_EVENT, { detail: item }));
  return item;
};

export const removeScheduledMessage = (id: string) => {
  write(
    'scheduled-messages',
    getScheduledMessages().filter(item => item.id !== id),
  );
  window.dispatchEvent(new CustomEvent(SCHEDULE_EVENT, { detail: { id } }));
};

export const getTaskFromMessage = (message: MessageTaskSource): ChatTaskCardData | null => {
  const context = message.context || {};
  const task =
    context?.noted_for_action?.task ||
    context?.noted_for_action_task ||
    context?.nfa_task ||
    context?.task_card ||
    null;

  if (!task) return null;

  return {
    id: task.id || message.id || message.thread_id || `task-${Date.now()}`,
    source_message_id: task.source_message_id || message.id,
    source_thread_id: task.source_thread_id || message.thread_id,
    source_channel_id: task.source_channel_id || message.channel_id || message.cache?.channel_id,
    source_workspace_id: task.source_workspace_id || message.cache?.workspace_id,
    source_company_id: task.source_company_id || message.cache?.company_id,
    title: task.title || message.text || 'Untitled task',
    description: task.description,
    emoji: task.emoji || '✅',
    status: task.status || 'created',
    priority: task.priority || 'normal',
    tags: task.tags || [],
    assignees: task.assignees || task.participants || [],
    due_at: task.due_at || task.before,
    reminder_at: task.reminder_at,
    require_ack: !!task.require_ack,
    require_proof: !!task.require_proof,
    bookmarkedBy: task.bookmarkedBy || [],
    trail: task.trail || [],
  };
};

export const createTaskFromMessage = (message: MessageTaskSource): ChatTaskCardData => {
  const existing = getTaskFromMessage(message);
  if (existing) return upsertStoredTask(existing);

  return upsertStoredTask({
    id: `chat-task-${message.id || message.thread_id || Date.now()}`,
    source_message_id: message.id,
    source_thread_id: message.thread_id,
    source_channel_id: message.channel_id || message.cache?.channel_id,
    source_workspace_id: message.cache?.workspace_id,
    source_company_id: message.cache?.company_id,
    title: message.text || 'New task from message',
    description: message.text,
    emoji: '✅',
    status: 'created',
    priority: 'normal',
    tags: ['chat'],
    assignees: [],
    trail: [
      {
        id: `created-${Date.now()}`,
        actor: getCurrentUserId(),
        label: 'Created from chat message',
        created_at: Date.now(),
      },
    ],
  });
};

export const formatStatus = (status: ChatTaskStatus) =>
  status.replace(/_/g, ' ').replace(/^\w/, value => value.toUpperCase());
