// components/Kanban/KanbanBoard.jsx
import React, { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, ListTodo, Clock, CheckCircle, Archive } from "lucide-react";

import ContainerKanban from "./ContainerKanban";
import ItemKanban from "./ItemKanban";

const KanbanBoard = ({ project, tasks = [], onTaskCreate, onTaskMove }) => {
  const [containers, setContainers] = useState([
    {
      id: "todo",
      title: "To Do",
      status: "todo",
      icon: ListTodo,
      color: "primary",
      items: tasks.filter((t) => t.status === "todo"),
    },
    {
      id: "in_progress",
      title: "In Progress",
      status: "in_progress",
      icon: Clock,
      color: "warning",
      items: tasks.filter((t) => t.status === "in_progress"),
    },
    {
      id: "done",
      title: "Done",
      status: "done",
      icon: CheckCircle,
      color: "success",
      items: tasks.filter((t) => t.status === "done"),
    },
    {
      id: "archived",
      title: "Archived",
      status: "archived",
      icon: Archive,
      color: "secondary",
      items: tasks.filter((t) => t.status === "archived"),
    },
  ]);

  const [activeId, setActiveId] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentContainerId, setCurrentContainerId] = useState(null);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerForm, setContainerForm] = useState({ title: "" });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: "",
    assignedTo: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;

      if (!over) return;

      const activeId = active.id.toString();
      const overId = over.id.toString();

      if (activeId.includes("task_") && overId.includes("status_")) {
        const taskId = activeId.replace("task_", "");
        const newStatus = overId.replace("status_", "");

        onTaskMove?.(taskId, newStatus);
      }

      if (activeId.includes("task_") && overId.includes("task_")) {
        const activeContainer = containers.find((c) =>
          c.items.some((item) => `task_${item._id}` === activeId),
        );
        const overContainer = containers.find((c) =>
          c.items.some((item) => `task_${item._id}` === overId),
        );

        if (
          activeContainer &&
          overContainer &&
          activeContainer.id === overContainer.id
        ) {
          const containerIndex = containers.findIndex(
            (c) => c.id === activeContainer.id,
          );
          const oldIndex = activeContainer.items.findIndex(
            (item) => `task_${item._id}` === activeId,
          );
          const newIndex = overContainer.items.findIndex(
            (item) => `task_${item._id}` === overId,
          );

          const newContainers = [...containers];
          newContainers[containerIndex].items = arrayMove(
            newContainers[containerIndex].items,
            oldIndex,
            newIndex,
          );
          setContainers(newContainers);
        }
      }

      setActiveId(null);
    },
    [containers, onTaskMove],
  );

  const handleAddContainer = () => {
    if (!containerForm.title.trim()) return;

    const newContainer = {
      id: `container-${uuidv4()}`,
      title: containerForm.title,
      status: "todo",
      icon: Plus,
      color: "info",
      items: [],
    };

    setContainers([...containers, newContainer]);
    setContainerForm({ title: "" });
    setShowContainerModal(false);
  };

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;
    if (!currentContainerId) return;

    const newTask = {
      _id: uuidv4(),
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate,
      status: currentContainerId,
      tags: taskForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      metadata: {
        estimatedHours: 0,
        actualHours: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newContainers = containers.map((container) => {
      if (container.id === currentContainerId) {
        return {
          ...container,
          items: [...container.items, newTask],
        };
      }
      return container;
    });

    setContainers(newContainers);
    onTaskCreate?.(newTask, currentContainerId);

    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      tags: "",
      assignedTo: null,
    });
    setShowTaskModal(false);
  };

  const handleTaskClick = (task) => {
    console.log("Task clicked:", task);
  };

  const getTaskById = (id) => {
    for (const container of containers) {
      const task = container.items.find((item) => `task_${item._id}` === id);
      if (task) return task;
    }
    return null;
  };

  return (
    <div className="kanban-board">
      {/* Add Container Modal */}
      {showContainerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Column
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter column title"
                  value={containerForm.title}
                  onChange={(e) => setContainerForm({ title: e.target.value })}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddContainer();
                  }}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setShowContainerModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddContainer}
                disabled={!containerForm.title.trim()}
              >
                Add Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Task
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                    value={taskForm.title}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description"
                    value={taskForm.description}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={taskForm.priority}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, priority: e.target.value })
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={taskForm.dueDate}
                      onChange={(e) =>
                        setTaskForm({ ...taskForm, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., bug, feature, ui"
                    value={taskForm.tags}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, tags: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setShowTaskModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddTask}
                disabled={!taskForm.title.trim()}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {project?.name || "Project Board"}
          </h3>
          {project?.description && (
            <p className="text-gray-600 mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50 flex items-center gap-2"
            onClick={() => setShowContainerModal(true)}
          >
            <Plus size={16} />
            Add Column
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SortableContext items={containers.map((c) => c.id)}>
            {containers.map((container) => (
              <div key={container.id}>
                <ContainerKanban
                  id={container.id}
                  title={container.title}
                  count={container.items.length}
                  color={container.color}
                  icon={container.icon}
                  onAddItem={() => {
                    setCurrentContainerId(container.id);
                    setShowTaskModal(true);
                  }}
                  onEdit={() => {
                    console.log("Edit container:", container.id);
                  }}
                  onDelete={() => {
                    if (window.confirm("Delete this column?")) {
                      setContainers(
                        containers.filter((c) => c.id !== container.id),
                      );
                    }
                  }}
                >
                  <SortableContext
                    items={container.items.map((i) => `task_${i._id}`)}
                  >
                    <div className="flex flex-col gap-2">
                      {container.items.map((item) => (
                        <ItemKanban
                          key={item._id}
                          id={`task_${item._id}`}
                          task={item}
                          onClick={handleTaskClick}
                        />
                      ))}
                      {container.items.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p className="mb-1">No tasks yet</p>
                          <p className="text-sm">
                            Drag tasks here or click "Add Task"
                          </p>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ContainerKanban>
              </div>
            ))}
          </SortableContext>
        </div>

        <DragOverlay adjustScale={false}>
          {activeId && activeId.includes("task_") ? (
            <ItemKanban
              id={activeId}
              task={getTaskById(activeId)}
              isDraggable={false}
            />
          ) : activeId && activeId.includes("container") ? (
            <div className="w-full md:w-1/2 lg:w-1/4">
              <ContainerKanban
                id={activeId}
                title={containers.find((c) => c.id === activeId)?.title || ""}
                count={
                  containers.find((c) => c.id === activeId)?.items.length || 0
                }
                color={
                  containers.find((c) => c.id === activeId)?.color || "primary"
                }
                icon={containers.find((c) => c.id === activeId)?.icon || Plus}
                isDraggable={false}
              >
                {containers
                  .find((c) => c.id === activeId)
                  ?.items.map((item) => (
                    <ItemKanban
                      key={item._id}
                      id={`task_${item._id}`}
                      task={item}
                      isDraggable={false}
                    />
                  ))}
              </ContainerKanban>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {containers.length === 0 && (
        <div className="text-center py-12">
          <div className="mb-4">
            <Plus size={48} className="text-gray-400 mx-auto" />
          </div>
          <h4 className="text-gray-500 mb-2">No columns yet</h4>
          <p className="text-gray-400 mb-4">
            Create your first column to get started
          </p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 mx-auto"
            onClick={() => setShowContainerModal(true)}
          >
            <Plus size={16} />
            Create First Column
          </button>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
