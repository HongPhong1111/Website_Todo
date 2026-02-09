// hooks/useKanbanSocket.js
import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

export const useKanbanSocket = ({
  projectId,
  onTaskCreated,
  onTaskChanged,
  onTaskMoved,
  onTaskDeleted,
  onColumnCreated,
  onColumnChanged,
  onColumnDeleted,
  onColumnsReordered,
  onUserJoined,
  onUserLeft,
  onError,
}) => {
  const { socket, isConnected } = useSocket();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, [projectId]);

  // Debug log để kiểm tra
  useEffect(() => {
    console.log("useKanbanSocket mounted for project:", projectId, {
      socket: !!socket,
      isConnected,
    });
  }, [projectId, socket, isConnected]);

  useEffect(() => {
    if (!socket || !projectId) {
      console.log("Socket or projectId missing:", {
        socket: !!socket,
        projectId,
      });
      return;
    }

    // Join project room
    console.log(`Joining project room: project-${projectId}`);
    socket.emit("join-project", projectId);

    // ===== TASK EVENTS =====
    if (onTaskCreated) {
      socket.on("task-created-broadcast", (data) => {
        console.log("task-created-broadcast received:", data);
        // if (isMountedRef.current && onTaskCreated)
        onTaskCreated(data);
      });
    }

    if (onTaskChanged) {
      socket.on("task-changed-broadcast", (data) => {
        console.log("task-changed-broadcast received:", data);
        // if (isMountedRef.current && onTaskChanged)
        onTaskChanged(data);
      });
    }

    if (onTaskMoved) {
      socket.on("task-moved-broadcast", (data) => {
        console.log("task-moved-broadcast received:", data);

        onTaskMoved(data);
        // if (isMountedRef.current && onTaskMoved) {
        //   onTaskMoved(data);
        // } else {
        //   console.log(
        //     "thành phần đã được gỡ bỏ, bỏ qua sự kiện di chuyển tác vụ",
        //   );
        // }
      });
    }

    if (onTaskDeleted) {
      socket.on("task-deleted-broadcast", (data) => {
        console.log("task-deleted-broadcast received:", data);
        // if (isMountedRef.current && onTaskDeleted)
        onTaskDeleted(data);
      });
    }

    // ===== COLUMN EVENTS =====
    if (onColumnCreated) {
      socket.on("column-created-broadcast", (data) => {
        console.log("column-created-broadcast received:", data);
        // if (isMountedRef.current && onColumnCreated)
        onColumnCreated(data);
      });
    }

    if (onColumnChanged) {
      socket.on("column-changed-broadcast", (data) => {
        console.log("column-changed-broadcast received:", data);
        // if (isMountedRef.current && onColumnChanged)
        onColumnChanged(data);
      });
    }

    if (onColumnDeleted) {
      socket.on("column-deleted-broadcast", (data) => {
        console.log("column-deleted-broadcast received:", data);
        // if (isMountedRef.current && onColumnDeleted)
        onColumnDeleted(data);
      });
    }

    if (onColumnsReordered) {
      socket.on("columns-reordered-broadcast", (data) => {
        console.log("columns-reordered-broadcast received:", data);
        // if (isMountedRef.current && onColumnsReordered)
        onColumnsReordered(data);
      });
    }

    // ===== PRESENCE EVENTS =====
    if (onUserJoined) {
      socket.on("user-joined", (data) => {
        console.log("user-joined received:", data);
        if (isMountedRef.current && onUserJoined) onUserJoined(data);
      });
    }

    if (onUserLeft) {
      socket.on("user-left", (data) => {
        console.log("user-left received:", data);
        if (isMountedRef.current && onUserLeft) onUserLeft(data);
      });
    }

    // ===== ERROR HANDLING =====
    if (onError) {
      socket.on("error", (error) => {
        console.error("Socket error:", error);
        if (isMountedRef.current && onError) onError(error);
      });
    }

    // Connection status
    socket.on("connect", () => {
      console.log("Socket connected, rejoining project:", projectId);
      socket.emit("join-project", projectId);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Cleanup function
    return () => {
      console.log(`Cleaning up socket listeners for project: ${projectId}`);
      isMountedRef.current = false;

      if (socket) {
        socket.emit("leave-project", projectId);

        // Remove all listeners
        socket.off("task-created-broadcast");
        socket.off("task-changed-broadcast");
        socket.off("task-moved-broadcast");
        socket.off("task-deleted-broadcast");
        socket.off("column-created-broadcast");
        socket.off("column-changed-broadcast");
        socket.off("column-deleted-broadcast");
        socket.off("columns-reordered-broadcast");
        socket.off("user-joined");
        socket.off("user-left");
        socket.off("error");
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, [
    socket,
    projectId,
    onTaskCreated,
    onTaskChanged,
    onTaskMoved,
    onTaskDeleted,
    onColumnCreated,
    onColumnChanged,
    onColumnDeleted,
    onColumnsReordered,
    onUserJoined,
    onUserLeft,
    onError,
  ]);

  // Helper functions để emit events
  const emitTaskMoved = (data) => {
    if (socket && projectId) {
      socket.emit("task-moved", { projectId, ...data });
    }
  };

  const emitTaskCreated = (data) => {
    if (socket && projectId) {
      socket.emit("task-created", { projectId, ...data });
    }
  };

  const emitTaskUpdated = (data) => {
    if (socket && projectId) {
      socket.emit("task-updated", { projectId, ...data });
    }
  };

  const emitTaskDeleted = (data) => {
    if (socket && projectId) {
      socket.emit("task-deleted", { projectId, ...data });
    }
  };

  const emitColumnCreated = (data) => {
    if (socket && projectId) {
      socket.emit("column-created", { projectId, ...data });
    }
  };

  const emitColumnUpdated = (data) => {
    if (socket && projectId) {
      socket.emit("column-updated", { projectId, ...data });
    }
  };

  const emitColumnDeleted = (data) => {
    if (socket && projectId) {
      socket.emit("column-deleted", { projectId, ...data });
    }
  };

  const emitColumnsReordered = (data) => {
    if (socket && projectId) {
      socket.emit("columns-reordered", { projectId, ...data });
    }
  };

  return {
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
  };
};

export default useKanbanSocket;
