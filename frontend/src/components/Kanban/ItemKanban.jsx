// components/Kanban/ItemKanban.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Clock,
  Tag,
  Paperclip,
  AlertCircle,
  User,
} from "lucide-react";

const ItemKanban = ({ id, task, onClick, isDraggable = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDraggable ? "grab" : "pointer",
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case "todo":
        return "border-l-4 border-l-blue-500";
      case "in_progress":
        return "border-l-4 border-l-yellow-500";
      case "done":
        return "border-l-4 border-l-green-500";
      case "archived":
        return "border-l-4 border-l-gray-500";
      default:
        return "border-l-4 border-l-blue-500";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN");
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      onClick={() => onClick?.(task)}
      className={`cursor-pointer kanban-item ${isDragging ? "shadow-lg" : ""}`}
    >
      <div
        className={`bg-white rounded-md border border-gray-200 ${getStatusBorderColor(task.status)} ${
          isOverdue ? "border-red-300" : ""
        }`}
      >
        <div className="p-3">
          <div className="flex items-start gap-2">
            {isDraggable && (
              <GripVertical
                size={16}
                className="text-gray-400 mt-1 flex-shrink-0"
              />
            )}
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h6 className="mb-0 font-semibold text-gray-800 truncate">
                  {task.title}
                </h6>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getPriorityColor(
                    task.priority,
                  )}`}
                >
                  {task.priority === "high" && <AlertCircle size={12} />}
                  {task.priority}
                </span>
              </div>

              {task.description && (
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-md border border-gray-200 flex items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {task.assignedTo && (
                    <div
                      className="rounded-full bg-blue-500 flex items-center justify-center text-white font-medium"
                      style={{
                        width: "24px",
                        height: "24px",
                        fontSize: "10px",
                      }}
                    >
                      {task.assignedTo.name
                        ?.split(" ")
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || <User size={12} />}
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock size={12} />
                      <span>{formatDate(task.dueDate)}</span>
                      {isOverdue && (
                        <AlertCircle size={12} className="text-red-500" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {task.attachments?.length > 0 && (
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Paperclip size={12} />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.metadata?.estimatedHours > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      {task.metadata.estimatedHours}h
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemKanban;
