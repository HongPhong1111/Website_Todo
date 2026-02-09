// SortableContainerKanban.jsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContainerKanban from "./ContainerKanban";
import { GripVertical } from "lucide-react";

const SortableContainerKanban = ({
  id,
  title,
  count,
  color,
  children,
  onAddItem,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `container_${id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle */}
      <div
        className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-6 cursor-move z-10"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-gray-400 hover:text-gray-600" size={20} />
      </div>

      <ContainerKanban
        id={id}
        title={title}
        count={count}
        color={color}
        onAddItem={onAddItem}
        onEdit={onEdit}
        onDelete={onDelete}
        isDraggable={true}
      >
        {children}
      </ContainerKanban>
    </div>
  );
};

export default SortableContainerKanban;
