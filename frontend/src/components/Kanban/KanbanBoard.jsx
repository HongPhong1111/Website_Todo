// components/Kanban/KanbanBoard.jsx
import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { Plus, Wifi, WifiOff } from "lucide-react";
import { toast } from "react-toastify";

import ContainerKanban from "./ContainerKanban";
import ItemKanban from "./ItemKanban";
import TaskDetailModal from "./TaskDetailModal";

import { api } from "../../api/client";
import useKanbanSocket from "../../hooks/useKanbanSocket";

const KanbanBoard = ({ project }) => {
  // Socket hook với các event handlers
  const {
    socket,
    isConnected,
    emitTaskMoved,
    emitTaskCreated,
    emitTaskUpdated,
    emitTaskDeleted,

    emitColumnCreated,
    emitColumnUpdated,
    emitColumnDeleted,
    emitColumnsReordered,
  } = useKanbanSocket({
    projectId: project?._id,

    // Task events từ server
    onTaskCreated: (data) => {
      console.log("Socket: Task created by others", data);
      if (data.createdBy === socket?.id) return; // Bỏ qua nếu chính mình tạo

      setContainers((prev) =>
        prev.map((container) => {
          if (container.id === data.columnId) {
            // Kiểm tra task đã tồn tại chưa
            const taskExists = container.items.some(
              (item) => item._id === data.task._id,
            );
            if (!taskExists) {
              return {
                ...container,
                items: [...container.items, data.task],
              };
            }
          }
          return container;
        }),
      );

      toast.info(`New task added by another user`);
    },

    onTaskChanged: (data) => {
      if (!data.updates || Object.keys(data.updates).length === 0) {
        return;
      }
      console.log("Socket: Task changed by others", data);
      if (data.updatedBy === socket?.id) return;

      if ("column" in data.updates || "position" in data.updates) {
        return;
      }

      // Cập nhật task trong containers
      setContainers((prev) =>
        prev.map((container) => ({
          ...container,
          items: container.items.map((item) =>
            item._id === data.taskId ? { ...item, ...data.updates } : item,
          ),
        })),
      );

      // Cập nhật selectedTask nếu đang mở
      if (selectedTask && selectedTask._id === data.taskId) {
        setSelectedTask((prev) => ({ ...prev, ...data.updates }));
      }

      toast.info(`Task updated by another user`);
    },

    // onTaskMoved: (data) => {
    //   console.log("Socket: Task moved by others", data);
    //   if (data.movedBy === socket?.id) return;

    //   // Cập nhật local state
    //   setContainers((prev) => {
    //     let taskToMove = null;

    //     // Xóa task khỏi column cũ
    //     const afterRemove = prev.map((container) => {
    //       if (container._id === data.fromColumn) {
    //         const filteredItems = container.items.filter(
    //           (item) => item._id !== data.taskId,
    //         );
    //         taskToMove = container.items.find(
    //           (item) => item._id === data.taskId,
    //         );
    //         return { ...container, items: filteredItems };
    //       }
    //       return container;
    //     });

    //     // Thêm task vào column mới
    //     if (taskToMove) {
    //       return afterRemove.map((container) => {
    //         if (container._id === data.toColumn) {
    //           const newItems = [...container.items];
    //           const insertIndex = Math.min(data.position, newItems.length);
    //           newItems.splice(insertIndex, 0, {
    //             ...taskToMove,
    //             column: data.toColumn,
    //           });
    //           return { ...container, items: newItems };
    //         }
    //         return container;
    //       });
    //     }

    //     return afterRemove;
    //   });

    //   toast.info(`Task moved by another user`);
    // },

    onTaskMoved: (data) => {
      console.log("Socket: Task moved by others", data);

      // Kiểm tra nếu chính user hiện tại di chuyển task
      if (data.movedBy === socket?.id) {
        console.log("bạn đang di chuyển task chính mình, bỏ qua xử lý");
        return;
      }

      setContainers((prev) => {
        // Tìm task trong tất cả containers
        let taskToMove = null;
        const containersCopy = prev.map((container) => {
          // Kiểm tra nếu task có trong container này
          const taskIndex = container.items.findIndex(
            (item) => item._id === data.taskId,
          );

          if (taskIndex !== -1) {
            // Tìm thấy task - lưu lại và xóa khỏi container này
            taskToMove = { ...container.items[taskIndex] };
            const newItems = [...container.items];
            newItems.splice(taskIndex, 1);
            return { ...container, items: newItems };
          }
          return container;
        });

        // Nếu không tìm thấy task, trả về state cũ
        if (!taskToMove) {
          console.log("Không tìm thấy task để di chuyển:", data.taskId);
          return prev;
        }

        // Cập nhật column của task
        taskToMove.column = data.toColumn;

        // Thêm task vào container đích
        return containersCopy.map((container) => {
          if (container._id === data.toColumn) {
            const newItems = [...container.items];
            const insertIndex = Math.min(data.position, newItems.length);
            newItems.splice(insertIndex, 0, taskToMove);
            return { ...container, items: newItems };
          }
          return container;
        });
      });

      toast.info(`Task đã được di chuyển bởi người dùng khác`);
    },

    onTaskDeleted: (data) => {
      console.log("Socket: Task deleted by others", data);
      if (data.deletedBy === socket?.id) return;

      setContainers((prev) =>
        prev.map((container) => ({
          ...container,
          items: container.items.filter((item) => item._id !== data.taskId),
        })),
      );

      // Đóng modal nếu task đang xem bị xóa
      if (selectedTask && selectedTask._id === data.taskId) {
        setSelectedTask(null);
      }

      toast.info(`Task deleted by another user`);
    },

    // Column events từ server
    onColumnCreated: (data) => {
      console.log("Socket: Column created by others", data);
      if (data.createdBy === socket?.id) return;

      setContainers((prev) => {
        const columnExists = prev.some((c) => c.id === data.column._id);
        if (!columnExists) {
          return [
            ...prev,
            {
              id: data.column._id,
              _id: data.column._id,
              title: data.column.name,
              name: data.column.name,
              color: data.column.color || "#043dfb",
              position: data.column.position || prev.length,
              items: [],
            },
          ];
        }
        return prev;
      });

      toast.info(`New column added by another user`);
    },

    onColumnChanged: (data) => {
      console.log("Socket: Column changed by others", data);
      if (data.updatedBy === socket?.id) return;

      setContainers((prev) =>
        prev.map((container) =>
          container.id === data.columnId
            ? {
                ...container,
                ...data.updates,
                title: data.updates.name || container.title,
              }
            : container,
        ),
      );

      toast.info(`Column updated by another user`);
    },

    onColumnDeleted: (data) => {
      console.log("Socket: Column deleted by others", data);
      if (data.deletedBy === socket?.id) return;

      setContainers((prev) =>
        prev.filter((container) => container.id !== data.columnId),
      );

      toast.info(`Column deleted by another user`);
    },

    onColumnsReordered: (data) => {
      console.log("Socket: Columns reordered by others", data);
      if (data.reorderedBy === socket?.id) return;

      // Sắp xếp columns theo position từ server
      const sortedColumns = [...data.columns].sort(
        (a, b) => a.position - b.position,
      );

      setContainers((prev) => {
        const newContainers = sortedColumns.map((serverColumn) => {
          const existingColumn = prev.find((c) => c.id === serverColumn._id);
          return existingColumn
            ? {
                ...existingColumn,
                position: serverColumn.position,
                title: serverColumn.name || existingColumn.title,
                color: serverColumn.color || existingColumn.color,
              }
            : {
                id: serverColumn._id,
                _id: serverColumn._id,
                title: serverColumn.name,
                name: serverColumn.name,
                color: serverColumn.color || "#043dfb",
                position: serverColumn.position,
                items: [],
              };
        });

        return newContainers.sort((a, b) => a.position - b.position);
      });

      toast.info(`Columns reordered by another user`);
    },

    onError: (error) => {
      console.error("Socket error:", error);
      toast.error("Realtime connection error");
    },
  });

  const [containers, setContainers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentContainerId, setCurrentContainerId] = useState(null);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [containerForm, setContainerForm] = useState({
    name: "",
    color: "#043dfb",
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: "",
    assignedTo: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Thêm useEffect để log khi containers thay đổi
  useEffect(() => {
    console.log("Containers updated:", containers);
  }, [containers]);

  // Refs để tránh infinite loops
  const containersRef = useRef(containers);
  const isProcessingSocketEvent = useRef(false);

  // Cập nhật ref khi containers thay đổi
  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);

  console.log("KanbanBoard render with project:", project);

  // DnD Kit sensors
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

  // Load board data
  const loadBoardData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load columns và tasks từ project prop
      const [columnsResponse, tasksResponse] = await Promise.all([
        api.get(`/api/columns/${project._id}`),
        api.get(`/api/tasks/by-project/${project._id}`),
      ]);

      const columns = columnsResponse.data?.data || [];
      const tasks = tasksResponse.data?.data || [];

      // Map columns với tasks
      const mappedContainers = columns.map((col) => ({
        id: col._id,
        _id: col._id,
        title: col.name,
        name: col.name,
        color: col.color || "#043dfb",
        position: col.position || 0,
        items: tasks.filter(
          (task) => task.column?._id === col._id || task.column === col._id,
        ),
      }));

      // Sắp xếp theo position
      mappedContainers.sort((a, b) => a.position - b.position);

      setContainers(mappedContainers);
    } catch (error) {
      console.error("Error loading board data:", error);
      toast.error("Failed to load board data");
    } finally {
      setIsLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (project?._id) {
      loadBoardData();
    }
  }, [project, loadBoardData]);

  const handleDragStart = useCallback((event) => {
    const { active } = event;
    setActiveId(active.id);
  }, []);

  // Xử lý khi kết thúc kéo thả
  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      if (!over) {
        setActiveId(null);
        return;
      }

      const activeId = active.id.toString();
      const overId = over.id.toString();

      setErrorMessage("");

      try {
        // 1. Xử lý kéo thả CỘT (column)
        if (activeId.includes("container_") && overId.includes("container_")) {
          const oldIndex = containersRef.current.findIndex(
            (c) => `container_${c.id}` === activeId,
          );
          const newIndex = containersRef.current.findIndex(
            (c) => `container_${c.id}` === overId,
          );

          if (oldIndex !== newIndex) {
            // Cập nhật local state
            const newContainers = arrayMove(
              containersRef.current,
              oldIndex,
              newIndex,
            );

            // Cập nhật position của các cột
            const updatedContainers = newContainers.map((column, index) => ({
              ...column,
              position: index,
            }));

            setContainers(updatedContainers);

            // Emit socket event
            emitColumnsReordered({
              columns: updatedContainers.map((column) => ({
                _id: column.id,
                name: column.title,
                color: column.color,
                position: column.position,
              })),
            });

            // Gọi API để cập nhật position của các cột
            await api.post("/api/columns/update-positions", {
              projectId: project._id,
              updates: updatedContainers.map((column, index) => ({
                columnId: column.id,
                position: index,
              })),
            });

            toast.success("Columns reordered successfully");
          }
        }

        // 2. Xử lý TASK kéo thả
        else if (activeId.includes("task_")) {
          // Lấy thông tin container của task đang kéo
          const activeContainer = containersRef.current.find((c) =>
            c.items.some((item) => `task_${item._id}` === activeId),
          );

          if (!activeContainer) {
            setActiveId(null);
            return;
          }

          const taskId = activeId.replace("task_", "");
          const activeTask = activeContainer.items.find(
            (item) => `task_${item._id}` === activeId,
          );

          if (!activeTask) {
            setActiveId(null);
            return;
          }

          // Xác định container đích
          let targetContainerId = null;
          let insertIndex = 0;

          // Trường hợp 1: Kéo vào container (cột)
          if (overId.includes("container_")) {
            targetContainerId = overId.replace("container_", "");
            insertIndex = 0; // Thêm vào đầu container
          }
          // Trường hợp 2: Kéo vào task khác
          else if (overId.includes("task_")) {
            const overContainer = containersRef.current.find((c) =>
              c.items.some((item) => `task_${item._id}` === overId),
            );

            if (overContainer) {
              targetContainerId = overContainer.id;
              // Tìm vị trí của task được kéo tới
              insertIndex = overContainer.items.findIndex(
                (item) => `task_${item._id}` === overId,
              );

              // Nếu kéo task xuống dưới task khác, chèn sau nó
              if (event.delta.y > 0) {
                insertIndex += 1;
              }
            }
          }
          // Trường hợp 3: Kéo vào khoảng trống (dropzone)
          else if (over.data?.current?.type === "dropzone") {
            targetContainerId = over.data.current.containerId;
            // Thêm vào cuối container
            const targetContainer = containersRef.current.find(
              (c) => c.id === targetContainerId,
            );
            insertIndex = targetContainer ? targetContainer.items.length : 0;
          }

          // Nếu không tìm thấy container đích, hủy
          if (!targetContainerId) {
            setActiveId(null);
            return;
          }

          // 2a. Di chuyển task sang container khác
          if (activeContainer.id !== targetContainerId) {
            // Tạo bản sao containers để cập nhật
            const newContainers = containersRef.current.map((container) => {
              // Xóa task khỏi container cũ
              if (container.id === activeContainer.id) {
                return {
                  ...container,
                  items: container.items.filter(
                    (item) => `task_${item._id}` !== activeId,
                  ),
                };
              }
              // Thêm task vào container mới tại vị trí xác định
              if (container.id === targetContainerId) {
                const updatedItems = [...container.items];
                // Xóa task nếu đã tồn tại trong container (phòng trường hợp)
                const filteredItems = updatedItems.filter(
                  (item) => `task_${item._id}` !== activeId,
                );

                // Chèn task vào vị trí đã xác định
                const insertAt = Math.min(insertIndex, filteredItems.length);
                filteredItems.splice(insertAt, 0, {
                  ...activeTask,
                  column: targetContainerId,
                });

                return {
                  ...container,
                  items: filteredItems,
                };
              }
              return container;
            });

            // Cập nhật local state
            setContainers(newContainers);

            // Emit socket event
            emitTaskMoved({
              taskId,
              fromColumn: activeContainer.id,
              toColumn: targetContainerId,
              position: insertIndex,
            });

            // Cập nhật trên server
            try {
              // Cập nhật column của task
              await api.put(`/api/tasks/${taskId}`, {
                column: targetContainerId,
              });

              // Cập nhật positions cho cả container cũ và mới
              const updates = [];

              // Cập nhật positions cho container cũ
              const oldContainer = newContainers.find(
                (c) => c.id === activeContainer.id,
              );
              if (oldContainer) {
                oldContainer.items.forEach((item, index) => {
                  updates.push({
                    taskId: item._id,
                    column: activeContainer.id,
                    position: index,
                  });
                });
              }

              // Cập nhật positions cho container mới
              const newContainer = newContainers.find(
                (c) => c.id === targetContainerId,
              );
              if (newContainer) {
                newContainer.items.forEach((item, index) => {
                  updates.push({
                    taskId: item._id,
                    column: targetContainerId,
                    position: index,
                  });
                });
              }

              // Gửi tất cả updates
              if (updates.length > 0) {
                await api.post("/api/tasks/update-positions", {
                  updates,
                });
              }

              toast.success("Task moved successfully");
            } catch (error) {
              console.error("Error moving task:", error);
              toast.error("Failed to move task");
              throw error;
            }
          }
          // 2b. Sắp xếp lại task trong cùng container
          else {
            const containerIndex = containersRef.current.findIndex(
              (c) => c.id === activeContainer.id,
            );
            const oldIndex = activeContainer.items.findIndex(
              (item) => `task_${item._id}` === activeId,
            );

            // Tính toán vị trí mới
            let newIndex = 0;
            if (overId.includes("task_")) {
              newIndex = activeContainer.items.findIndex(
                (item) => `task_${item._id}` === overId,
              );

              // Điều chỉnh vị trí dựa trên hướng kéo
              if (event.delta.y > 0 && oldIndex < newIndex) {
                // Kéo xuống dưới: chèn sau task được kéo tới
                newIndex += 1;
              }
            } else if (over.data?.current?.type === "dropzone") {
              // Kéo vào dropzone: thêm vào cuối
              newIndex = activeContainer.items.length;
            }

            // Đảm bảo newIndex hợp lệ
            newIndex = Math.max(
              0,
              Math.min(newIndex, activeContainer.items.length),
            );

            // Nếu vị trí không thay đổi
            if (oldIndex === newIndex) {
              setActiveId(null);
              return;
            }

            const newContainers = [...containersRef.current];
            newContainers[containerIndex].items = arrayMove(
              newContainers[containerIndex].items,
              oldIndex,
              newIndex,
            );

            // Cập nhật local state
            setContainers(newContainers);

            // Emit socket event (sắp xếp trong cùng cột cũng cần emit để sync)
            emitTaskMoved({
              taskId,
              fromColumn: activeContainer.id,
              toColumn: activeContainer.id,
              position: newIndex,
            });

            // Cập nhật positions trên server
            const positionUpdates = newContainers[containerIndex].items.map(
              (item, index) => ({
                taskId: item._id,
                column: activeContainer.id,
                position: index,
              }),
            );

            await api.post("/api/tasks/update-positions", {
              updates: positionUpdates,
            });

            toast.success("Task reordered successfully");
          }
        }
      } catch (error) {
        console.error("Error handling drag and drop:", error);
        toast.error("Failed to update position");
        // Reload data to sync with server
        loadBoardData();
        setErrorMessage(
          "Failed to update position. Data reloaded. : " + error.message,
        );
      } finally {
        setActiveId(null);
      }
    },
    [project._id, loadBoardData, emitTaskMoved, emitColumnsReordered],
  );

  // Thêm cột mới
  const handleAddContainer = async () => {
    if (!containerForm.name.trim()) {
      toast.error("Column name is required");
      return;
    }

    try {
      const response = await api.post("/api/columns", {
        projectId: project._id,
        name: containerForm.name,
        color: containerForm.color,
      });

      const newColumn = response.data.data;

      // Cập nhật local state với dữ liệu từ server
      setContainers((prev) => [
        ...prev,
        {
          id: newColumn._id,
          _id: newColumn._id,
          title: newColumn.name,
          name: newColumn.name,
          color: newColumn.color || "#043dfb",
          position: newColumn.position || prev.length,
          items: [],
        },
      ]);

      // Emit socket event
      emitColumnCreated({
        column: newColumn,
      });

      setContainerForm({ name: "", color: "#043dfb" });
      setShowContainerModal(false);
      toast.success("Column created successfully");
    } catch (error) {
      console.error("Error creating column:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create column";
      toast.error(errorMessage);
    }
  };

  // Xóa cột
  const handleDeleteColumn = async (columnId) => {
    if (window.confirm("Are you sure you want to delete this column?")) {
      try {
        // Kiểm tra xem cột có task không
        const columnToDelete = containers.find((c) => c.id === columnId);
        if (columnToDelete?.items?.length > 0) {
          if (
            !window.confirm(
              `This column has ${columnToDelete.items.length} tasks. Delete anyway?`,
            )
          ) {
            return;
          }
        }

        await api.delete(`/api/columns/${columnId}`);

        // Cập nhật local state
        setContainers((prev) => prev.filter((c) => c.id !== columnId));

        // Emit socket event
        emitColumnDeleted({
          columnId,
        });

        toast.success("Column deleted successfully");
      } catch (error) {
        console.error("Error deleting column:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to delete column";

        if (error.response?.status === 400 && error.response?.data?.taskCount) {
          toast.error(
            `Cannot delete column with ${error.response.data.taskCount} tasks. Move or delete tasks first.`,
          );
        } else {
          toast.error(errorMessage);
        }
      }
    }
  };

  // Thêm task mới
  const handleAddTask = async () => {
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!currentContainerId) {
      toast.error("Please select a column");
      return;
    }

    try {
      setErrorMessage("");

      const response = await api.post("/api/tasks", {
        projectId: project._id,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || null,
        assignedTo: taskForm.assignedTo,
        column: currentContainerId,
        tags: taskForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        metadata: {
          estimatedHours: 0,
          actualHours: 0,
        },
      });

      const taskData = response.data.data;

      // Cập nhật local state
      const newContainers = containers.map((container) => {
        if (container.id === currentContainerId) {
          return {
            ...container,
            items: [
              ...container.items,
              {
                ...taskData,
                _id: taskData.id || taskData._id,
                column: currentContainerId,
              },
            ],
          };
        }
        return container;
      });

      setContainers(newContainers);

      // Emit socket event
      emitTaskCreated({
        task: taskData,
        columnId: currentContainerId,
      });

      // Reset form
      setTaskForm({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        tags: "",
        assignedTo: null,
      });
      setShowTaskModal(false);
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to create task";
      toast.error(errorMessage);
      setErrorMessage(errorMessage);
    }
  };

  // Cập nhật handleUpdateTask
  const handleUpdateTask = async (taskId, updates) => {
    try {
      setErrorMessage("");
      await api.put(`/api/tasks/${taskId}`, updates);

      // Cập nhật local state
      const newContainers = containers.map((container) => ({
        ...container,
        items: container.items.map((item) =>
          item._id === taskId ? { ...item, ...updates } : item,
        ),
      }));

      setContainers(newContainers);

      // Cập nhật selectedTask nếu đang mở
      if (selectedTask && selectedTask._id === taskId) {
        setSelectedTask({ ...selectedTask, ...updates });
      }

      // Emit socket event
      emitTaskUpdated({
        taskId,
        updates,
      });

      toast.success("Task updated successfully");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      setErrorMessage(error.message);
    }
  };

  const handleTaskClick = (task) => {
    console.log("Task clicked:", task);
    setSelectedTask(task);
  };

  const getTaskById = (id) => {
    for (const container of containers) {
      const task = container.items.find((item) => `task_${item._id}` === id);
      if (task) return task;
    }
    return null;
  };

  // Xóa task
  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        setErrorMessage("");
        await api.delete(`/api/tasks/${taskId}`);

        // Cập nhật local state
        const newContainers = containers.map((container) => ({
          ...container,
          items: container.items.filter((item) => item._id !== taskId),
        }));

        setContainers(newContainers);

        // Emit socket event
        emitTaskDeleted({
          taskId,
        });

        // Đóng modal nếu đang mở
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(null);
        }

        toast.success("Task deleted successfully");
      } catch (error) {
        console.error("Error deleting task:", error);
        toast.error("Failed to delete task");
        setErrorMessage(error.message);
      }
    }
  };

  // Cập nhật cột
  const handleUpdateColumn = async (columnId, updates) => {
    try {
      setErrorMessage("");
      await api.put(`/api/columns/${columnId}`, updates);

      // Cập nhật local state
      const newContainers = containers.map((container) =>
        container.id === columnId
          ? { ...container, ...updates, title: updates.name || container.title }
          : container,
      );

      setContainers(newContainers);

      // Emit socket event
      emitColumnUpdated({
        columnId,
        updates,
      });

      toast.success("Column updated successfully");
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error("Failed to update column");
      setErrorMessage(error.message);
    }
  };

  // Connection status component
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
          isConnected
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}
      >
        {isConnected ? (
          <>
            <Wifi size={12} />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff size={12} />
            <span>Offline</span>
          </>
        )}
      </div>
      {socket && (
        <span className="text-xs text-gray-500">
          ID: {socket.id?.slice(-6)}
        </span>
      )}
    </div>
  );

  return (
    <div className="kanban-board">
      {/* Error Message Display */}
      {errorMessage && (
        <div className="relative bg-red-100 text-red-800 border border-red-200 px-4 py-2 rounded mb-4">
          <button
            onClick={() => setErrorMessage("")}
            className="absolute top-1 right-2 text-red-600 hover:text-red-900 font-bold"
            aria-label="Close"
          >
            ×
          </button>
          {errorMessage}
        </div>
      )}

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
                  Column Name *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter column name"
                  value={containerForm.name}
                  onChange={(e) =>
                    setContainerForm({ ...containerForm, name: e.target.value })
                  }
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddContainer();
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 cursor-pointer"
                    value={containerForm.color}
                    onChange={(e) =>
                      setContainerForm({
                        ...containerForm,
                        color: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={containerForm.color}
                    onChange={(e) =>
                      setContainerForm({
                        ...containerForm,
                        color: e.target.value,
                      })
                    }
                    placeholder="#043dfb"
                  />
                </div>
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
                disabled={!containerForm.name.trim()}
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
              <p className="text-sm text-gray-500 mt-1">
                Adding to:{" "}
                {containers.find((c) => c.id === currentContainerId)?.title ||
                  "Unknown Column"}
              </p>
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

      {/* Detail Task Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          project={project}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-gray-900">
              {project?.name || "Project Board"}
            </h3>
            <ConnectionStatus />
          </div>
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

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading board data...</p>
        </div>
      )}

      {/* Kanban Board */}
      {!isLoading && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SortableContext
              items={[
                ...containers.map((c) => `container_${c.id}`),
                ...containers.map((c) => `dropzone_${c.id}`),
              ]}
            >
              {containers.map((container) => (
                <div key={container.id}>
                  <ContainerKanban
                    id={`container_${container.id}`}
                    title={container.title}
                    count={container.items.length}
                    color={container.color}
                    onAddItem={() => {
                      setCurrentContainerId(container.id);
                      setShowTaskModal(true);
                    }}
                    onEdit={() => {
                      const newName = prompt(
                        "Enter new column name:",
                        container.title,
                      );
                      if (newName && newName !== container.title) {
                        handleUpdateColumn(container.id, { name: newName });
                      }
                    }}
                    onDelete={() => handleDeleteColumn(container.id)}
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
                            onClick={() => handleTaskClick(item)}
                            onDelete={() => handleDeleteTask(item._id)}
                            onUpdate={(updates) =>
                              handleUpdateTask(item._id, updates)
                            }
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
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && containers.length === 0 && (
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
