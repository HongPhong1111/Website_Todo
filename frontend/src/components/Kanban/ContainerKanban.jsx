// components/Kanban/ContainerKanban.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, MoreVertical } from "lucide-react";

const ContainerKanban = ({
  id,
  children,
  title,
  count = 0,
  color = "primary",
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

  const colorClasses = {
    primary: "border-blue-500 bg-blue-500",
    warning: "border-yellow-500 bg-yellow-500",
    success: "border-green-500 bg-green-500",
    secondary: "border-gray-500 bg-gray-500",
    info: "border-cyan-500 bg-cyan-500",
    danger: "border-red-500 bg-red-500",
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="h-full">
      <div
        className={`h-full border-2 rounded-lg ${colorClasses[color].split(" ")[0]} ${
          isDragging ? "shadow-xl" : "shadow-md"
        }`}
      >
        <div
          className={`p-4 ${colorClasses[color].split(" ")[1]} text-white rounded-t-lg ${
            isDraggable ? "cursor-grab" : ""
          }`}
          {...(isDraggable ? listeners : {})}
        >
          <div className="flex items-center gap-2">
            {isDraggable && (
              <GripVertical size={18} className="text-white/80" />
            )}
            <Plus size={18} />
            <h6 className="mb-0 font-bold flex-grow flex items-center">
              {title}
              <span className="ml-2 bg-white text-gray-800 text-xs font-semibold px-2 py-1 rounded-full">
                {count}
              </span>
            </h6>
            <div className="flex gap-1">
              {onAddItem && (
                <button
                  className="p-1 bg-white/20 hover:bg-white/30 rounded-md flex items-center justify-center transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddItem();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Plus size={16} />
                </button>
              )}
              {(onEdit || onDelete) && (
                <div className="relative group">
                  <button
                    className="p-1 bg-white/20 hover:bg-white/30 rounded-md flex items-center justify-center transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    {onEdit && (
                      <button
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
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
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-md"
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
        </div>
        <div className="p-3 bg-white rounded-b-lg">
          <div className="flex flex-col gap-2 min-h-[100px]">{children}</div>
          {onAddItem && (
            <button
              className="w-full mt-3 p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              onClick={(e) => {
                e.stopPropagation();
                onAddItem();
              }}
            >
              <Plus size={16} />
              Add Task
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContainerKanban;
