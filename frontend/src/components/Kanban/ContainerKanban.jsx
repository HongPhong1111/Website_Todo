// components/Kanban/ContainerKanban.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Button, Badge } from "react-bootstrap";
import { Plus, GripVertical, MoreVertical } from "lucide-react";

const ContainerKanban = ({
  id,
  children,
  title,
  count = 0,
  color = "primary",
  // icon: IconCustom = Plus,
  onAddItem,
  onEdit,
  onDelete,
  isDraggable = true,
}) => {
  const {
    attributes,
    setNodeRef,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "container",
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="h-100">
      <Card
        className={`h-100 border border-${color} ${isDragging ? "shadow-lg" : ""}`}
      >
        <Card.Header
          className={`bg-${color} text-white py-3 ${isDraggable ? "cursor-grab" : ""}`}
          {...(isDraggable ? listeners : {})}
        >
          <div className="d-flex align-items-center gap-2">
            {isDraggable && (
              <GripVertical size={18} className="text-white-50" />
            )}
            {/* <IconCustom size={18} /> */}

            <Plus size={18} />
            <h6 className="mb-0 fw-bold flex-grow-1">
              {title}{" "}
              <Badge bg="white" text="dark" className="ms-2">
                {count}
              </Badge>
            </h6>
            <div className="d-flex gap-1">
              {onAddItem && (
                <Button
                  variant="light"
                  size="sm"
                  className="p-1 d-flex align-items-center justify-content-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Plus size={16} />
                </Button>
              )}
              {(onEdit || onDelete) && (
                <div className="dropdown">
                  <Button
                    variant="light"
                    size="sm"
                    className="p-1 d-flex align-items-center justify-content-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <MoreVertical size={16} />
                  </Button>
                  <div className="dropdown-menu dropdown-menu-end">
                    {onEdit && (
                      <button
                        className="dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                      >
                        Edit Column
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="dropdown-item text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                      >
                        Delete Column
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <div
            className="d-flex flex-column gap-2"
            style={{ minHeight: "100px" }}
          >
            {children}
          </div>
          {onAddItem && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="w-100 mt-3 d-flex align-items-center justify-content-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onAddItem();
              }}
            >
              <Plus size={16} />
              Add Task
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ContainerKanban;
