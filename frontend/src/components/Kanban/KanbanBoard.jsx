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
import { Modal, Form, Button, Row, Col } from "react-bootstrap";
import { Plus, ListTodo, Clock, CheckCircle, Archive } from "lucide-react";

import ContainerKanban from "./ContainerKanban";
import ItemKanban from "./ItemKanban";

const KanbanBoard = ({
  project,
  tasks = [],
  onTaskCreate,
  //   onTaskUpdate,
  //   onTaskDelete,
  onTaskMove,
  //   loading = false,
}) => {
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

      // Moving task between containers
      if (activeId.includes("task_") && overId.includes("status_")) {
        const taskId = activeId.replace("task_", "");
        const newStatus = overId.replace("status_", "");

        onTaskMove?.(taskId, newStatus);
      }

      // Moving task within container
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
    // Implement task detail view
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
      <Modal
        show={showContainerModal}
        onHide={() => setShowContainerModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Column</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Column Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter column title"
                value={containerForm.title}
                onChange={(e) => setContainerForm({ title: e.target.value })}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleAddContainer();
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowContainerModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddContainer}
            disabled={!containerForm.title.trim()}
          >
            Add Column
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        show={showTaskModal}
        onHide={() => setShowTaskModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add New Task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Task Title *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter task title"
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, title: e.target.value })
                }
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter task description"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, description: e.target.value })
                }
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Priority</Form.Label>
                  <Form.Select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Due Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, dueDate: e.target.value })
                    }
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Tags (comma separated)</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., bug, feature, ui"
                value={taskForm.tags}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, tags: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddTask}
            disabled={!taskForm.title.trim()}
          >
            Add Task
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-0">{project?.name || "Project Board"}</h3>
          {project?.description && (
            <p className="text-muted mb-0">{project.description}</p>
          )}
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={() => setShowContainerModal(true)}
            className="d-flex align-items-center gap-2"
          >
            <Plus size={16} />
            Add Column
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Row>
          <SortableContext items={containers.map((c) => c.id)}>
            {containers.map((container) => (
              <Col key={container.id} lg={3} md={6} className="mb-4">
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
                    <div className="d-flex flex-column gap-2">
                      {container.items.map((item) => (
                        <ItemKanban
                          key={item._id}
                          id={`task_${item._id}`}
                          task={item}
                          onClick={handleTaskClick}
                        />
                      ))}
                      {container.items.length === 0 && (
                        <div className="text-center py-4 text-muted">
                          <p className="mb-0">No tasks yet</p>
                          <small>Drag tasks here or click "Add Task"</small>
                        </div>
                      )}
                    </div>
                  </SortableContext>
                </ContainerKanban>
              </Col>
            ))}
          </SortableContext>
        </Row>

        <DragOverlay adjustScale={false}>
          {activeId && activeId.includes("task_") ? (
            <ItemKanban
              id={activeId}
              task={getTaskById(activeId)}
              isDraggable={false}
            />
          ) : activeId && activeId.includes("container") ? (
            <div className="col-lg-3 col-md-6">
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
        <div className="text-center py-5">
          <div className="mb-3">
            <Plus size={48} className="text-muted" />
          </div>
          <h4 className="text-muted mb-2">No columns yet</h4>
          <p className="text-muted mb-3">
            Create your first column to get started
          </p>
          <Button
            variant="primary"
            onClick={() => setShowContainerModal(true)}
            className="d-flex align-items-center gap-2 mx-auto"
          >
            <Plus size={16} />
            Create First Column
          </Button>
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;
