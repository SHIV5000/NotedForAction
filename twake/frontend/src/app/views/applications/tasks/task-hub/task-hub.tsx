import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Calendar, CheckSquare, Clock, Inbox, List, Send, Trash2 } from 'react-feather';
import classNames from 'classnames';
import { ChannelType } from 'app/features/channels/types/channel';
import { ViewConfiguration } from 'app/features/router/services/app-view-service';
import {
  addScheduleListener,
  addTaskListener,
  ChatTaskCardData,
  formatStatus,
  getBookmarks,
  getScheduledMessages,
  getStoredTasks,
  removeScheduledMessage,
  ScheduledMessageDraft,
} from 'app/features/noted-for-action/chat-task-service';
import TaskCard from 'app/views/applications/messages/message/parts/task-card';
import './task-hub.scss';

type Props = {
  channel: ChannelType;
  options: ViewConfiguration;
};

type Filter = 'all' | 'assigned' | 'due' | 'review' | 'bookmarked' | 'scheduled';

const filters: { id: Filter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All chat tasks', icon: <Inbox size={16} /> },
  { id: 'assigned', label: 'Assigned / active', icon: <CheckSquare size={16} /> },
  { id: 'due', label: 'Due soon', icon: <Clock size={16} /> },
  { id: 'review', label: 'Needs review', icon: <Send size={16} /> },
  { id: 'bookmarked', label: 'Bookmarked', icon: <Bookmark size={16} /> },
  { id: 'scheduled', label: 'Scheduled messages', icon: <Calendar size={16} /> },
];

export default ({ channel }: Props) => {
  const [tasks, setTasks] = useState<ChatTaskCardData[]>(getStoredTasks());
  const [scheduled, setScheduled] = useState<ScheduledMessageDraft[]>(getScheduledMessages());
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => addTaskListener(() => setTasks(getStoredTasks())), []);
  useEffect(() => addScheduleListener(() => setScheduled(getScheduledMessages())), []);

  const bookmarks = getBookmarks();
  const visibleTasks = useMemo(() => {
    const now = Date.now();
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    return tasks.filter(task => {
      if (channel?.id && task.source_channel_id && task.source_channel_id !== channel.id)
        return false;
      if (filter === 'assigned') return !['completed', 'revoked'].includes(task.status);
      if (filter === 'due') {
        const due = task.due_at
          ? task.due_at < 10000000000
            ? task.due_at * 1000
            : task.due_at
          : 0;
        return due > 0 && due <= sevenDays;
      }
      if (filter === 'review') return task.status === 'submitted' || task.status === 'needs_review';
      if (filter === 'bookmarked') return bookmarks.includes(task.id);
      return filter !== 'scheduled';
    });
  }, [bookmarks, channel?.id, filter, tasks]);

  const openLegacyBoard = () => {
    window.location.hash = '#legacy-board';
  };

  return (
    <div className="nfa-task-hub">
      <div className="nfa-task-hub-header">
        <div>
          <div className="nfa-task-hub-kicker">Main task interface</div>
          <h1>Task Hub</h1>
          <p>Chat-created tasks, private bookmarks, status workflow, and scheduled messages.</p>
        </div>
        <button className="nfa-task-hub-secondary" onClick={openLegacyBoard}>
          <List size={16} /> Legacy board remains secondary
        </button>
      </div>

      <div className="nfa-task-hub-tabs">
        {filters.map(item => (
          <button
            key={item.id}
            className={classNames({ active: filter === item.id })}
            onClick={() => setFilter(item.id)}
          >
            {item.icon}
            {item.label}
            <span>
              {item.id === 'scheduled'
                ? scheduled.length
                : item.id === 'bookmarked'
                ? tasks.filter(task => bookmarks.includes(task.id)).length
                : item.id === 'all'
                ? tasks.length
                : ''}
            </span>
          </button>
        ))}
      </div>

      {filter !== 'scheduled' && (
        <div className="nfa-task-hub-grid">
          {visibleTasks.length === 0 && (
            <div className="nfa-task-hub-empty">
              <CheckSquare size={32} />
              <strong>No chat tasks yet</strong>
              <span>Use “Create task from message” in a message menu to populate Task Hub.</span>
            </div>
          )}
          {visibleTasks.map(task => (
            <div key={task.id} className="nfa-task-hub-card">
              <TaskCard task={task} />
              <div className="nfa-task-hub-card-footer">
                <span>{formatStatus(task.status)}</span>
                {task.source_thread_id && <span>Source: chat thread</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {filter === 'scheduled' && (
        <div className="nfa-scheduled-list">
          {scheduled.length === 0 && (
            <div className="nfa-task-hub-empty">
              <Calendar size={32} />
              <strong>No scheduled messages</strong>
              <span>Use the clock button in the composer to schedule a message.</span>
            </div>
          )}
          {scheduled.map(item => (
            <div key={item.id} className="nfa-scheduled-item">
              <div>
                <strong>{new Date(item.scheduled_at).toLocaleString()}</strong>
                <p>{item.text}</p>
                {!!item.files_count && <span>{item.files_count} attachment(s)</span>}
              </div>
              <button onClick={() => removeScheduledMessage(item.id)}>
                <Trash2 size={14} /> Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
