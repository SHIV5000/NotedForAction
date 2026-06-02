import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  CheckCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  Send,
  UserCheck,
} from 'react-feather';
import classNames from 'classnames';
import {
  addBookmarkListener,
  ChatTaskCardData,
  formatStatus,
  isBookmarked,
  toggleBookmark,
  updateStoredTaskStatus,
} from 'app/features/noted-for-action/chat-task-service';
import './TaskCard.scss';

const nextStatus = {
  created: 'assigned',
  assigned: 'acknowledged',
  acknowledged: 'in_progress',
  in_progress: 'submitted',
  submitted: 'completed',
  needs_review: 'submitted',
  completed: 'completed',
  delegated: 'acknowledged',
  transferred: 'acknowledged',
  revoked: 'revoked',
} as const;

type Props = {
  task: ChatTaskCardData;
  compact?: boolean;
};

export default ({ task, compact }: Props) => {
  const [bookmarked, setBookmarked] = useState(isBookmarked(task.id));
  const [status, setStatus] = useState(task.status || 'created');

  useEffect(() => addBookmarkListener(() => setBookmarked(isBookmarked(task.id))), [task.id]);

  const dueDate = task.due_at
    ? new Date(task.due_at < 10000000000 ? task.due_at * 1000 : task.due_at)
    : null;
  const overdue = dueDate ? dueDate.getTime() < Date.now() && status !== 'completed' : false;
  const next = nextStatus[status];

  const changeStatus = () => {
    if (!next || next === status) return;
    setStatus(next);
    updateStoredTaskStatus(task.id, next);
  };

  return (
    <div
      className={classNames('nfa-task-card', `priority-${task.priority || 'normal'}`, { compact })}
    >
      <div className="nfa-task-card-header">
        <div className="nfa-task-card-title-row">
          <span className="nfa-task-card-emoji">{task.emoji || '✅'}</span>
          <div>
            <div className="nfa-task-card-kicker">Task inside chat</div>
            <div className="nfa-task-card-title">{task.title}</div>
          </div>
        </div>
        <button
          className={classNames('nfa-task-icon-button', { active: bookmarked })}
          onClick={event => {
            event.stopPropagation();
            setBookmarked(toggleBookmark(task.id));
          }}
          title={bookmarked ? 'Remove private bookmark' : 'Add private bookmark'}
        >
          <Bookmark size={16} />
        </button>
      </div>

      {!!task.description && !compact && (
        <div className="nfa-task-card-description">{task.description}</div>
      )}

      <div className="nfa-task-card-meta">
        <span className={classNames('nfa-task-status', `status-${status}`)}>
          {formatStatus(status)}
        </span>
        {task.priority && <span className="nfa-task-pill">{task.priority}</span>}
        {dueDate && (
          <span className={classNames('nfa-task-pill', { overdue })}>
            <Clock size={12} /> {dueDate.toLocaleDateString()}
          </span>
        )}
        {!!task.assignees?.length && (
          <span className="nfa-task-pill">
            <UserCheck size={12} /> {task.assignees.length} assigned
          </span>
        )}
      </div>

      {!!task.tags?.length && (
        <div className="nfa-task-tags">
          {task.tags.map(tag => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}

      {!compact && (
        <div className="nfa-task-card-actions">
          {next && next !== status && (
            <button onClick={changeStatus}>
              {status === 'submitted' ? <CheckCircle size={14} /> : <Send size={14} />}
              {status === 'submitted' ? 'Accept' : formatStatus(next)}
            </button>
          )}
          {status !== 'needs_review' && status !== 'completed' && (
            <button
              onClick={() => {
                setStatus('needs_review');
                updateStoredTaskStatus(task.id, 'needs_review');
              }}
            >
              <RefreshCw size={14} /> Review again
            </button>
          )}
          <button className="secondary">
            <MessageSquare size={14} /> Trail {task.trail?.length ? `(${task.trail.length})` : ''}
          </button>
        </div>
      )}
    </div>
  );
};
