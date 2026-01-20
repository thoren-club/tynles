import { IconCalendar, IconRefresh } from '@tabler/icons-react';
import './TaskListItem.css';

interface TaskListItemProps {
  title: string;
  assignee?: {
    firstName?: string;
    username?: string;
    photoUrl?: string;
  } | null;
  isChecked: boolean;
  isDisabled?: boolean;
  isDimmed?: boolean;
  onToggle: () => void;
  dateLabel?: string | null;
  timeLabel?: string | null;
  isOverdue?: boolean;
  isRecurring?: boolean;
  showCalendarIcon?: boolean;
  onClick?: () => void;
}

export default function TaskListItem({
  title,
  assignee,
  isChecked,
  isDisabled = false,
  isDimmed = false,
  onToggle,
  dateLabel,
  timeLabel,
  isOverdue = false,
  isRecurring = false,
  showCalendarIcon = true,
  onClick,
}: TaskListItemProps) {
  const assigneeName = assignee?.firstName || assignee?.username || 'U';
  const assigneeInitial = assigneeName.charAt(0).toUpperCase();
  const showMeta = Boolean(dateLabel) || isRecurring;

  return (
    <div
      className={`task-list-item${isDimmed ? ' is-completed' : ''}${isDisabled ? ' is-disabled' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <button
        type="button"
        className={`task-toggle${isChecked ? ' checked' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        disabled={isDisabled}
        role="checkbox"
        aria-checked={isChecked}
      />
      <div className="task-body">
        <div className="task-title-row">
          <div className="task-assignee">
            {assignee?.photoUrl ? (
              <img
                src={assignee.photoUrl}
                alt={assigneeName}
                className="task-assignee-avatar"
              />
            ) : (
              <span className="task-assignee-avatar task-assignee-placeholder">
                {assigneeInitial}
              </span>
            )}
          </div>
          <div className="task-title" title={title}>
            {title}
          </div>
        </div>
        {showMeta && (
          <div className="task-meta-row">
                    {dateLabel && showCalendarIcon && <IconCalendar size={14} className="task-meta-icon" />}
            {dateLabel && (
              <span className={`task-meta-text${isOverdue ? ' is-overdue' : ''}`}>
                {dateLabel}
              </span>
            )}
            {timeLabel && <span className="task-meta-time">{timeLabel}</span>}
            {isRecurring && <IconRefresh size={14} className="task-meta-icon" />}
          </div>
        )}
      </div>
    </div>
  );
}
