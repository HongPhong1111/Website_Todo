// components/Kanban/ItemKanban.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Badge } from "react-bootstrap";
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
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "secondary";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "todo":
        return "border-start-primary";
      case "in_progress":
        return "border-start-warning";
      case "done":
        return "border-start-success";
      case "archived":
        return "border-start-secondary";
      default:
        return "border-start-primary";
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
      className={`kanban-item ${isDragging ? "shadow" : ""}`}
    >
      <Card
        className={`border-start border-3 ${getStatusColor(task.status)} ${isOverdue ? "border-danger" : ""}`}
      >
        <Card.Body className="p-3">
          <div className="d-flex align-items-start gap-2">
            {isDraggable && (
              <GripVertical size={16} className="text-muted mt-1" />
            )}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="mb-0 fw-semibold">{task.title}</h6>
                <Badge
                  bg={getPriorityColor(task.priority)}
                  className="d-flex align-items-center gap-1"
                >
                  {task.priority === "high" && <AlertCircle size={12} />}
                  {task.priority}
                </Badge>
              </div>

              {task.description && (
                <p className="text-muted small mb-2">{task.description}</p>
              )}

              {task.tags && task.tags.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {task.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      bg="light"
                      text="dark"
                      className="border d-flex align-items-center gap-1"
                    >
                      <Tag size={10} />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  {task.assignedTo && (
                    <div
                      className="avatar rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
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
                    <div className="d-flex align-items-center gap-1 text-muted small">
                      <Clock size={12} />
                      <span>{formatDate(task.dueDate)}</span>
                      {isOverdue && (
                        <AlertCircle size={12} className="text-danger" />
                      )}
                    </div>
                  )}
                </div>

                <div className="d-flex align-items-center gap-1">
                  {task.attachments?.length > 0 && (
                    <div className="d-flex align-items-center gap-1 text-muted small">
                      <Paperclip size={12} />
                      <span>{task.attachments.length}</span>
                    </div>
                  )}
                  {task.metadata?.estimatedHours > 0 && (
                    <Badge bg="info" className="small">
                      {task.metadata.estimatedHours}h
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ItemKanban;
